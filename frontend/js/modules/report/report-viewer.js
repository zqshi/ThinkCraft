/**
 * 报告查看器模块
 * 负责显示和管理各类报告的查看界面
 *
 * @module ReportViewer
 * @description 处理报告的渲染、显示和交互
 *
 * @requires state - 全局状态管理器
 * @requires storageManager - 存储管理器
 * @requires markdownRenderer - Markdown渲染器
 */

/* eslint-disable no-unused-vars, no-undef */

class ReportViewer {
    constructor() {
        this.state = window.state;
    }

    /**
     * 查看报告
     *
     * @async
     * @returns {Promise<void>}
     *
     * @description
     * 显示报告模态框并加载报告内容。
     * 优先从缓存加载，如果没有则触发生成。
     */
    async viewReport() {
        const reportModal = document.getElementById('reportModal');
        const reportContent = document.getElementById('reportContent');

        // 使用class控制显示，避免内联样式优先级问题
        if (window.modalManager) {
            window.modalManager.open('reportModal');
        } else {
            reportModal.classList.add('active');
        }
        reportContent.innerHTML = '<div style="text-align: center; padding: 60px 20px;"><div class="loading-spinner"></div><div style="margin-top: 20px;">正在加载报告...</div></div>';

        // 尝试从缓存或数据库加载报告
        if (window.storageManager && this.state.currentChat) {
            try {
                const chatId = String(this.state.currentChat).trim();
                // 使用 getReportByChatIdAndType 而不是 getReport
                const reportEntry = await window.storageManager.getReportByChatIdAndType(
                    chatId,
                    'analysis'
                );

                if (reportEntry && reportEntry.status === 'completed' && reportEntry.data) {
                    this.renderAIReport(reportEntry.data);
                    if (typeof setAnalysisActionsEnabled === 'function') {
                        setAnalysisActionsEnabled(true);
                    }
                    if (typeof updateShareLinkButtonVisibility === 'function') {
                        updateShareLinkButtonVisibility();
                    }
                    return;
                }

                // 处理生成中的状态
                if (reportEntry && reportEntry.status === 'generating') {
                    const progress = reportEntry.progress || { percentage: 0 };
                    reportContent.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <div class="loading-spinner"></div>
                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-top: 20px;">
                                报告生成中
                            </div>
                            <div style="font-size: 14px; color: var(--text-secondary); margin-top: 12px;">
                                已完成 ${progress.percentage}%
                            </div>
                            <button class="btn-secondary" style="margin-top: 20px;" onclick="closeReport()">关闭</button>
                        </div>
                    `;
                    return;
                }

                if (reportEntry && reportEntry.status === 'error') {
                    reportContent.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                                报告生成失败
                            </div>
                            <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                                ${reportEntry.error?.message || '生成报告时发生未知错误'}
                            </div>
                            <button class="btn-primary" onclick="regenerateInsightsReport()">重新生成</button>
                        </div>
                    `;
                    return;
                }
            } catch (error) {
                console.error('[查看报告] 数据库查询失败:', error);
            }
        }

        // 没有报告，尝试生成
        requestAnimationFrame(() => {
            if (typeof fetchCachedAnalysisReport === 'function') {
                fetchCachedAnalysisReport().then(cached => {
                    if (cached) return;
                    if (typeof generateDetailedReport === 'function') {
                        generateDetailedReport(true).catch(() => {});
                    }
                });
            }
        });
    }

    /**
     * 渲染AI分析报告
     *
     * @param {Object} reportData - 报告数据对象
     * @param {Object} reportData.chapters - 报告章节
     * @param {string} reportData.coreDefinition - 核心定义
     * @param {string} reportData.problem - 问题描述
     * @param {string} reportData.solution - 解决方案
     * @param {string} reportData.targetUser - 目标用户
     *
     * @description
     * 渲染完整的AI分析报告，包括6个章节的详细内容。
     * 使用规范化函数处理可能缺失的数据。
     */
    renderAIReport(reportData) {
        const reportContent = document.getElementById('reportContent');
        const normalizeArray = (value) => Array.isArray(value) ? value : [];
        const normalizeObject = (value) => (value && typeof value === 'object') ? value : {};
        const normalizeText = (value, fallback = '') => (value === undefined || value === null || value === '') ? fallback : value;

        // 验证数据结构
        if (!reportData || !reportData.chapters) {
            const errorDetails = !reportData ? '报告数据为空' : '报告缺少chapters字段';

            reportContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                        报告数据格式错误
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                        ${errorDetails}<br><br>
                        <strong>可能的原因:</strong><br>
                        1. 后端AI服务响应超时<br>
                        2. 对话内容不足以生成报告<br>
                        3. 网络连接不稳定<br><br>
                        <strong>建议操作:</strong><br>
                        1. 点击下方"重试"按钮<br>
                        2. 如果多次失败，请刷新页面<br>
                        3. 确保至少进行了3轮以上对话
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button class="btn-secondary" onclick="closeReport()">关闭</button>
                        <button class="btn-primary" onclick="generateDetailedReport(true)">重试</button>
                    </div>
                </div>
            `;
            return;
        }

        const ch1 = normalizeObject(reportData.chapters.chapter1);
        const ch2 = normalizeObject(reportData.chapters.chapter2);
        const ch3 = normalizeObject(reportData.chapters.chapter3);
        const ch4 = normalizeObject(reportData.chapters.chapter4);
        const ch5 = normalizeObject(reportData.chapters.chapter5);
        const ch6 = normalizeObject(reportData.chapters.chapter6);
        const ch2Assumptions = normalizeArray(ch2.assumptions);
        const ch3Limitations = normalizeArray(ch3.limitations);
        const ch4Stages = normalizeArray(ch4.stages);
        const ch5BlindSpots = normalizeArray(ch5.blindSpots);
        const ch5KeyQuestions = normalizeArray(ch5.keyQuestions);
        const ch6ImmediateActions = normalizeArray(ch6.immediateActions);
        const ch6ExtendedIdeas = normalizeArray(ch6.extendedIdeas);
        const ch6MidtermPlan = normalizeObject(ch6.midtermPlan);
        const ch3Prerequisites = normalizeObject(ch3.prerequisites);
        const coreDefinition = normalizeText(reportData.coreDefinition);
        const problem = normalizeText(reportData.problem);
        const solution = normalizeText(reportData.solution);
        const targetUser = normalizeText(reportData.targetUser);

        reportContent.innerHTML = `
            <!-- 报告内容 -->
            <div id="insights-plan" class="report-tab-content active">

                <!-- 第一章：创意定义与演化 -->
                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch1.title, '创意定义与演化')}</div>
                    <div class="document-chapter">
                        <div class="chapter-content" style="padding-left: 0;">
                            <h4>1. 原始表述</h4>
                            <div class="highlight-box">
                                ${normalizeText(ch1.originalIdea || reportData.initialIdea)}
                            </div>

                            <h4>2. 核心定义（对话后）</h4>
                            <p><strong>一句话概括：</strong>${coreDefinition}</p>

                            <h4>3. 价值主张</h4>
                            <ul>
                                <li><strong>解决的根本问题：</strong>${problem}</li>
                                <li><strong>提供的独特价值：</strong>${solution}</li>
                                <li><strong>目标受益者：</strong>${targetUser}</li>
                            </ul>

                            <h4>4. 演变说明</h4>
                            <p>${normalizeText(ch1.evolution)}</p>
                        </div>
                    </div>
                </div>

                <!-- 第二章：核心洞察与根本假设 -->
                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch2.title, '核心洞察与根本假设')}</div>
                    <div class="document-chapter">
                        <div class="chapter-content" style="padding-left: 0;">
                            <h4>1. 识别的根本需求</h4>
                            <div class="highlight-box">
                                <strong>表层需求：</strong>${normalizeText(ch2.surfaceNeed)}<br><br>
                                <strong>深层动力：</strong>${normalizeText(ch2.deepMotivation)}
                            </div>

                            <h4>2. 核心假设清单</h4>
                            <p><strong>创意成立所依赖的关键前提（未经完全验证）：</strong></p>
                            <ul>
                                ${ch2Assumptions.map(assumption => `<li>${assumption}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- 第三章：边界条件与应用场景 -->
                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch3.title, '边界条件与应用场景')}</div>
                    <div class="document-chapter">
                        <div class="chapter-content" style="padding-left: 0;">
                            <h4>1. 理想应用场景</h4>
                            <div class="highlight-box">
                                ${normalizeText(ch3.idealScenario)}
                            </div>

                            <h4>2. 潜在限制因素</h4>
                            <p><strong>创意在以下情况下可能效果打折或失效：</strong></p>
                            <ul>
                                ${ch3Limitations.map(limit => `<li>${limit}</li>`).join('')}
                            </ul>

                            <h4>3. 必要前置条件</h4>
                            <div class="analysis-grid">
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">🔧</div>
                                        <div class="analysis-card-title">技术基础</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch3Prerequisites.technical)}
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">💰</div>
                                        <div class="analysis-card-title">资源要求</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch3Prerequisites.resources)}
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">🤝</div>
                                        <div class="analysis-card-title">合作基础</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch3Prerequisites.partnerships)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 第四章：可行性分析与关键挑战 -->
                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch4.title, '可行性分析与关键挑战')}</div>
                    <div class="document-chapter">
                        <div class="chapter-content" style="padding-left: 0;">
                            <h4>1. 实现路径分解</h4>
                            <p><strong>将大创意拆解为关键模块/发展阶段：</strong></p>
                            <ol>
                                ${ch4Stages.map((stage, idx) => `
                                    <li><strong>${normalizeText(stage?.stage, `阶段 ${idx + 1}`)}：</strong>${normalizeText(stage?.goal)} - ${normalizeText(stage?.tasks)}</li>
                                `).join('')}
                            </ol>

                            <h4>2. 最大障碍预判</h4>
                            <div class="highlight-box">
                                <strong>⚠️ 最大单一风险点：</strong>${normalizeText(ch4.biggestRisk)}<br><br>
                                <strong>预防措施：</strong>${normalizeText(ch4.mitigation)}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 第五章：思维盲点与待探索问题 -->
                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch5.title, '思维盲点与待探索问题')}</div>
                    <div class="document-chapter">
                        <div class="chapter-content" style="padding-left: 0;">
                            <h4>1. 对话中暴露的空白</h4>
                            <div class="highlight-box">
                                <strong>⚠️ 未深入考虑的领域：</strong>
                                <ul style="margin-top: 12px; margin-bottom: 0;">
                                ${ch5BlindSpots.map(spot => `<li>${spot}</li>`).join('')}
                                </ul>
                            </div>

                            <h4>2. 关键待验证问题</h4>
                            <p><strong>以下问题需通过调研、实验或原型才能回答：</strong></p>
                            <div class="analysis-grid">
                                ${ch5KeyQuestions.map((item, idx) => `
                                    <div class="analysis-card">
                                        <div class="analysis-card-header">
                                            <div class="analysis-icon">❓</div>
                                            <div class="analysis-card-title">决定性问题 ${idx + 1}</div>
                                        </div>
                                        <div class="analysis-card-content">
                                            ${normalizeText(item?.question)}<br><br>
                                            <strong>验证方法：</strong>${normalizeText(item?.validation)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 第六章：结构化行动建议 -->
                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch6.title, '结构化行动建议')}</div>
                    <div class="document-chapter">
                        <div class="chapter-content" style="padding-left: 0;">
                            <h4>1. 立即验证步骤（下周内）</h4>
                            <div class="highlight-box">
                                <strong>🎯 本周行动清单：</strong>
                                <ul style="margin-top: 12px; margin-bottom: 0;">
                                    ${ch6ImmediateActions.map(action => `<li>${action}</li>`).join('')}
                                </ul>
                            </div>

                            <h4>2. 中期探索方向（1-3个月）</h4>
                            <p><strong>为解答待探索问题，规划以下研究计划：</strong></p>
                            <ul>
                                <li><strong>用户研究：</strong>${normalizeText(ch6MidtermPlan.userResearch)}</li>
                                <li><strong>市场调研：</strong>${normalizeText(ch6MidtermPlan.marketResearch)}</li>
                                <li><strong>原型开发：</strong>${normalizeText(ch6MidtermPlan.prototyping)}</li>
                                <li><strong>合作探索：</strong>${normalizeText(ch6MidtermPlan.partnerships)}</li>
                            </ul>

                            <h4>3. 概念延伸提示</h4>
                            <p><strong>对话中衍生的关联创意方向：</strong></p>
                            <ul>
                                ${ch6ExtendedIdeas.map(idea => `<li>${idea}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        if (typeof updateShareLinkButtonVisibility === 'function') {
            updateShareLinkButtonVisibility();
        }
    }

    /**
     * 查看生成的报告（商业计划书/产品立项材料）
     *
     * @async
     * @param {string} type - 报告类型（'business' 或 'proposal'）
     * @param {Object} report - 报告数据
     * @param {Object} report.document - 报告文档内容（Markdown格式）
     * @param {Array} report.chapters - 报告章节数组
     * @param {Array} report.selectedChapters - 选中的章节ID列表
     * @param {number} report.timestamp - 生成时间戳
     * @param {Object} report.costStats - 成本统计信息
     * @param {number} report.totalTokens - 总token数
     * @returns {Promise<void>}
     *
     * @description
     * 显示商业计划书或产品立项材料的模态框。
     * 支持Markdown渲染和章节化显示。
     */
    async viewGeneratedReport(type, report) {
        if (type === 'business' || type === 'proposal') {
            const renderMarkdownContent = (value) => {
                const content = value || '';
                if (window.markdownRenderer) {
                    return window.markdownRenderer.render(content);
                }
                return content.replace(/\n/g, '<br>');
            };
            const safeText = (value, fallback = '') => {
                if (value === undefined || value === null || value === '') {
                    return fallback;
                }
                return value;
            };
            const toggleShareButton = (reportType) => {
                const shareBtn = document.getElementById('businessReportShareBtn');
                if (!shareBtn) return;
                shareBtn.style.display = 'none';
            };
            // 在模态框上设置报告类型数据属性
            const modal = document.getElementById('businessReportModal');
            if (modal) {
                modal.dataset.reportType = type;
                // 保存到全局变量，防止在重新生成时丢失
                window.currentReportType = type;
            }
            toggleShareButton(type);

            // 显示商业计划书/产品立项材料
            const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
            document.getElementById('businessReportTitle').textContent = typeTitle;

            if (report && report.document) {
                window.currentGeneratedChapters = Array.isArray(report.selectedChapters) ? report.selectedChapters : [];
                const reportContent = `
                    <div class="report-section">
                        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid var(--border); margin-bottom: 30px;">
                            <h1 style="font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                                ${safeText(this.state.userData.idea, '创意项目')}
                            </h1>
                            <p style="font-size: 16px; color: var(--text-secondary);">
                                ${typeTitle} · AI生成于 ${new Date(report.timestamp || Date.now()).toLocaleDateString()}
                            </p>
                            ${report.costStats ? `<p style="font-size: 14px; color: var(--text-tertiary); margin-top: 8px;">
                                使用 ${report.totalTokens} tokens · 成本 ${report.costStats.costString}
                            </p>` : ''}
                        </div>

                        <div class="markdown-content" style="line-height: 1.8; font-size: 15px;">
                            ${renderMarkdownContent(report.document)}
                        </div>
                    </div>
                `;

                document.getElementById('businessReportContent').innerHTML = reportContent;
                document.getElementById('businessReportModal').classList.add('active');
                return;
            }

            // 如果report包含chapters数据，直接显示
            if (report && report.chapters) {
                const chapters = report.chapters;
                window.currentGeneratedChapters = chapters.map(ch => ch.chapterId);

                // 生成报告内容（使用真实的AI生成内容）
                const reportContent = `
                    <div class="report-section">
                        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid var(--border); margin-bottom: 30px;">
                            <h1 style="font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                                ${this.state.userData.idea || '创意项目'}
                            </h1>
                            <p style="font-size: 16px; color: var(--text-secondary);">
                                ${typeTitle} · AI生成于 ${new Date(report.timestamp || Date.now()).toLocaleDateString()}
                            </p>
                            ${report.costStats ? `<p style="font-size: 14px; color: var(--text-tertiary); margin-top: 8px;">
                                使用 ${report.totalTokens} tokens · 成本 ${report.costStats.costString}
                            </p>` : ''}
                        </div>

                        ${chapters.map((ch, index) => `
                            <div class="report-section" style="margin-bottom: 40px;">
                                <div class="report-section-title">${index + 1}. ${safeText(ch.title, `章节 ${index + 1}`)}</div>
                                <div class="document-chapter">
                                    <div class="chapter-content" style="padding-left: 0;">
                                        <p style="color: var(--text-secondary); margin-bottom: 20px;">
                                            <strong>分析师：</strong>${typeof getAgentIconSvg === 'function' ? getAgentIconSvg(ch.emoji || ch.agent, 16, 'agent-inline-icon') : ''} ${safeText(ch.agent, 'AI分析师')}
                                        </p>

                                        <div class="markdown-content" style="line-height: 1.8; font-size: 15px;">
                                            ${ch.content ? renderMarkdownContent(ch.content) : '<p style="color: var(--text-secondary);">内容生成中...</p>'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}

                        <div style="text-align: center; padding: 30px 0; border-top: 2px solid var(--border); margin-top: 40px;">
                            <p style="color: var(--text-secondary); font-size: 14px;">
                                本报告由 ThinkCraft AI 自动生成 | 数据仅供参考
                            </p>
                        </div>
                    </div>
                `;

                document.getElementById('businessReportContent').innerHTML = reportContent;
                document.getElementById('businessReportModal').classList.add('active');
            }
        }
    }

    /**
     * 关闭报告
     *
     * @description
     * 关闭报告模态框。
     * 支持modalManager或直接操作DOM。
     */
    closeReport() {
        const reportModal = document.getElementById('reportModal');
        if (!reportModal) return;

        // 清除所有可能的显示状态
        reportModal.classList.remove('active');
        reportModal.style.display = ''; // 清除内联样式

        // 如果使用 modalManager，也调用其关闭方法
        if (window.modalManager && window.modalManager.isOpen('reportModal')) {
            window.modalManager.close('reportModal');
        }
    }

    /**
     * 导出商业计划书为PDF
     *
     * @async
     * @returns {Promise<void>}
     *
     * @description
     * 从IndexedDB获取当前会话的商业计划书数据，
     * 调用后端API生成PDF并下载。
     */
    async exportBusinessReport() {
        try {
            const chatId = normalizeChatId(this.state.currentChat);

            // 从模态框获取报告类型
            const modal = document.getElementById('businessReportModal');
            const reportType = modal?.dataset.reportType || window.currentReportType || 'business';

            // 使用ExportValidator验证
            const validation = await window.exportValidator.validateExport(reportType, chatId);

            if (!validation.valid) {
                if (validation.action === 'wait') {
                    window.toast.warning(
                        `${validation.error}\n${validation.detail}`,
                        5000
                    );
                } else {
                    window.toast.error(validation.error, 4000);
                }
                return;
            }

            // 验证通过，开始导出
            window.toast.info('📄 正在生成PDF，请稍候...', 2000);

            // 调用后端API
            const response = await fetch(`${this.state.settings.apiUrl}/api/pdf-export/business`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportData: validation.data,
                    reportType: reportType,
                    ideaTitle: this.state.userData.idea || '创意项目'
                })
            });

            if (!response.ok) {
                throw new Error('PDF生成失败');
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'PDF生成失败');
            }

            // 下载PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const fileName = reportType === 'business' ? '商业计划书' : '产品立项材料';
            a.download = `ThinkCraft_${fileName}_${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            window.toast.success('✅ PDF导出成功！', 3000);

        } catch (error) {
            console.error('[导出PDF] 失败:', error);
            window.toast.error(`导出失败: ${error.message}`, 4000);
        }
    }
}

// 创建全局实例
window.reportViewer = new ReportViewer();

// 暴露全局函数（向后兼容）
function viewReport() {
    window.reportViewer.viewReport();
}

function viewGeneratedReport(type, report) {
    return window.reportViewer.viewGeneratedReport(type, report);
}

function closeReport() {
    window.reportViewer.closeReport();
}

function exportBusinessReport() {
    return window.reportViewer.exportBusinessReport();
}

// 暴露到window对象
window.viewReport = viewReport;
window.viewGeneratedReport = viewGeneratedReport;
window.closeReport = closeReport;
window.exportBusinessReport = exportBusinessReport;
