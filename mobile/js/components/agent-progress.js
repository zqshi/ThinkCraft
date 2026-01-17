/**
 * Agent进度管理组件
 * 负责显示生成进度、Agent工作状态
 * 支持桌面端和移动端响应式显示
 */

class AgentProgressManager {
    constructor(modalManager) {
        this.modalManager = modalManager;
        this.agents = [];
        this.isMobile = window.innerWidth < 768;

        // Agent配置（与后端保持一致）
        this.agentConfig = {
            executive_summary: { name: '综合分析师', emoji: '🤖' },
            market_analysis: { name: '市场分析师', emoji: '📊' },
            solution: { name: '产品专家', emoji: '💡' },
            business_model: { name: '商业顾问', emoji: '💰' },
            competitive_landscape: { name: '竞争分析师', emoji: '⚔️' },
            marketing_strategy: { name: '营销专家', emoji: '📈' },
            team_structure: { name: '组织顾问', emoji: '👥' },
            financial_projection: { name: '财务分析师', emoji: '💵' },
            risk_assessment: { name: '风险专家', emoji: '⚠️' },
            implementation_plan: { name: '项目经理', emoji: '📋' },
            appendix: { name: '文档专家', emoji: '📎' }
        };

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth < 768;
        });
    }

    /**
     * 显示进度模态框
     * @param {Array} chapterIds - 章节ID数组
     */
    show(chapterIds) {
        // 初始化Agent列表
        this.agents = chapterIds.map((chapterId, index) => ({
            id: chapterId,
            ...this.agentConfig[chapterId],
            status: 'pending', // pending | working | completed
            statusText: '⏸️ 等待中',
            index
        }));

        // 渲染进度UI
        const progressHTML = this.renderProgressHTML();

        // 更新模态框内容
        this.modalManager.updateContent('agentProgressModal', '.modal-body', progressHTML);

        // 打开模态框
        this.modalManager.open('agentProgressModal');

        console.log(`[AgentProgress] 显示进度，共 ${chapterIds.length} 个章节`);
    }

    /**
     * 渲染进度HTML
     * @returns {String} HTML字符串
     */
    renderProgressHTML() {
        const totalProgress = 0;
        const progressBarHTML = `
            <div class="overall-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: ${totalProgress}%;"></div>
                </div>
                <p id="progressText">正在生成 0/${this.agents.length} 个章节...</p>
            </div>
        `;

        const agentListHTML = this.agents.map(agent => this.renderAgentItem(agent)).join('');

        return `
            ${progressBarHTML}
            <div class="agent-list" id="agentList">
                ${agentListHTML}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="agentProgressManager.cancel()">取消生成</button>
            </div>
        `;
    }

    /**
     * 渲染单个Agent项
     * @param {Object} agent - Agent对象
     * @returns {String} HTML字符串
     */
    renderAgentItem(agent) {
        const statusClass = agent.status;
        const spinClass = agent.status === 'working' ? 'spinning' : '';

        return `
            <div class="agent-item ${statusClass}" id="agent-${agent.id}">
                <div class="agent-avatar ${spinClass}">${agent.emoji}</div>
                <div class="agent-info">
                    <h4>${agent.name}</h4>
                    <p class="task">生成 ${this.getChapterTitle(agent.id)}</p>
                    <p class="status" id="status-${agent.id}">${agent.statusText}</p>
                </div>
            </div>
        `;
    }

    /**
     * 获取章节标题
     * @param {String} chapterId - 章节ID
     * @returns {String} 章节标题
     */
    getChapterTitle(chapterId) {
        const titles = {
            executive_summary: '执行摘要',
            market_analysis: '市场分析',
            solution: '解决方案',
            business_model: '商业模式',
            competitive_landscape: '竞争格局',
            marketing_strategy: '市场策略',
            team_structure: '团队架构',
            financial_projection: '财务预测',
            risk_assessment: '风险评估',
            implementation_plan: '实施计划',
            appendix: '附录'
        };
        return titles[chapterId] || chapterId;
    }

    /**
     * 更新进度
     * @param {String} chapterId - 章节ID
     * @param {String} status - 状态 'pending' | 'working' | 'completed'
     * @param {Object} result - 结果数据（可选）
     */
    updateProgress(chapterId, status, result = null) {
        // 查找Agent
        const agent = this.agents.find(a => a.id === chapterId);
        if (!agent) {
            console.warn(`[AgentProgress] 未找到Agent: ${chapterId}`);
            return;
        }

        // 更新状态
        agent.status = status;
        agent.statusText = this.getStatusText(status);

        // 更新DOM
        const agentElement = document.getElementById(`agent-${chapterId}`);
        const statusElement = document.getElementById(`status-${chapterId}`);

        if (agentElement) {
            // 移除所有状态类
            agentElement.classList.remove('pending', 'working', 'completed');
            // 添加新状态类
            agentElement.classList.add(status);

            // 更新头像动画
            const avatar = agentElement.querySelector('.agent-avatar');
            if (avatar) {
                avatar.classList.toggle('spinning', status === 'working');
            }
        }

        if (statusElement) {
            statusElement.textContent = agent.statusText;
        }

        // 更新整体进度
        const completedCount = this.agents.filter(a => a.status === 'completed').length;
        const totalCount = this.agents.length;
        const percentage = Math.round((completedCount / totalCount) * 100);

        this.updateOverallProgress(percentage, completedCount, totalCount);

        // 移动端：只显示当前工作的Agent
        if (this.isMobile) {
            this.toggleMobileView(chapterId, status);
        }

        console.log(`[AgentProgress] ${agent.name} - ${agent.statusText}`);
    }

    /**
     * 获取状态文本
     * @param {String} status - 状态
     * @returns {String} 状态文本
     */
    getStatusText(status) {
        const statusMap = {
            pending: '⏸️ 等待中',
            working: '🔄 生成中...',
            completed: '✅ 已完成'
        };
        return statusMap[status] || status;
    }

    /**
     * 更新整体进度
     * @param {Number} percentage - 百分比
     * @param {Number} completed - 已完成数
     * @param {Number} total - 总数
     */
    updateOverallProgress(percentage, completed, total) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }

        if (progressText) {
            progressText.textContent = `正在生成 ${completed}/${total} 个章节... (${percentage}%)`;
        }
    }

    /**
     * 移动端：切换显示
     * @param {String} chapterId - 当前章节ID
     * @param {String} status - 当前状态
     */
    toggleMobileView(chapterId, status) {
        const agentElements = document.querySelectorAll('.agent-item');

        agentElements.forEach(el => {
            if (status === 'working' && el.id === `agent-${chapterId}`) {
                // 只显示当前工作的
                el.style.display = 'flex';
            } else if (status === 'completed') {
                // 完成后隐藏
                if (el.id === `agent-${chapterId}`) {
                    el.style.display = 'none';
                }
            }
        });
    }

    /**
     * 关闭进度模态框
     */
    close() {
        this.modalManager.close('agentProgressModal');
        console.log('[AgentProgress] 进度模态框已关闭');
    }

    /**
     * 取消生成
     */
    cancel() {
        this.modalManager.confirm(
            '确定要取消生成吗？已生成的内容将丢失。',
            () => {
                // 关闭模态框
                this.close();

                // 重置状态
                if (window.stateManager) {
                    window.stateManager.resetGeneration();
                }

                console.log('[AgentProgress] 用户取消生成');
            }
        );
    }

    /**
     * 显示错误
     * @param {String} chapterId - 章节ID
     * @param {Error} error - 错误对象
     */
    showError(chapterId, error) {
        const agent = this.agents.find(a => a.id === chapterId);
        if (!agent) return;

        agent.status = 'error';
        agent.statusText = `❌ 生成失败: ${error.message}`;

        const statusElement = document.getElementById(`status-${chapterId}`);
        if (statusElement) {
            statusElement.textContent = agent.statusText;
            statusElement.style.color = '#ef4444';
        }
    }

    /**
     * 桌面端：展开查看详情
     * @param {String} chapterId - 章节ID
     */
    expandDetails(chapterId) {
        if (this.isMobile) return;

        const agent = this.agents.find(a => a.id === chapterId);
        if (!agent || agent.status !== 'completed') return;

        // 显示章节内容预览
        // 这里可以扩展为显示完整的章节内容
        console.log(`[AgentProgress] 展开查看: ${agent.name}`);
    }
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
    window.AgentProgressManager = AgentProgressManager;
    console.log('[AgentProgressManager] Agent进度管理器已加载');
}
