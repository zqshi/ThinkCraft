/**
 * ProjectManager 报告预览模块
 */

const reportPreviewLogger = window.createLogger
  ? window.createLogger('ProjectManagerReportPreview')
  : console;

window.projectManagerReportPreview = {
  async viewIdeaReport(pm, chatId, type) {
    if (!window.modalManager || !pm.storageManager) {
      return;
    }
    let chat = null;
    try {
      chat = await pm.storageManager.getChat(chatId);
      if (!chat) {
        const allChats = await pm.storageManager.getAllChats().catch(() => []);
        chat = allChats.find(
          item => pm.normalizeIdeaIdForCompare(item.id) === pm.normalizeIdeaIdForCompare(chatId)
        );
      }
    } catch (error) {
      // ignore chat preload failure, continue with reports lookup
    }

    if (window.state && chat) {
      window.state.currentChat = chat.id;
      if (chat.userData) {
        window.state.userData = { ...chat.userData };
      }
    }

    const reports = await pm.storageManager.getAllReports();
    const report = reports.find(
      r =>
        pm.normalizeIdeaIdForCompare(r.chatId) === pm.normalizeIdeaIdForCompare(chatId) &&
        r.type === type
    );
    if (!report) {
      window.modalManager.alert('暂无报告内容', 'info');
      return;
    }

    const data = report.data || {};
    const normalizeMarkdown = text => {
      if (
        window.reportViewer &&
        typeof window.reportViewer._normalizeMarkdownForRendering === 'function'
      ) {
        return window.reportViewer._normalizeMarkdownForRendering(text || '');
      }
      return text || '';
    };
    const renderMarkdown = text => {
      const raw = normalizeMarkdown(text || '');
      return window.markdownRenderer ? window.markdownRenderer.render(raw) : pm.escapeHtml(raw);
    };
    const tryParseReportDocument = text => {
      if (
        window.reportViewer &&
        typeof window.reportViewer._tryParseReportDocument === 'function'
      ) {
        return window.reportViewer._tryParseReportDocument(text || '');
      }
      return null;
    };
    const renderStructuredReport = reportData => {
      if (
        window.reportViewer &&
        typeof window.reportViewer.buildStructuredReportHTML === 'function'
      ) {
        return window.reportViewer.buildStructuredReportHTML(reportData);
      }
      return '';
    };
    const safeText = text => pm.escapeHtml(text ?? '');
    const normalizeArray = value => (Array.isArray(value) ? value : []);
    const normalizeObject = value => (value && typeof value === 'object' ? value : {});
    const normalizeText = (value, fallback = '') =>
      value === undefined || value === null || value === '' ? fallback : value;

    const buildChaptersHTML = chapters =>
      chapters
        .map(
          (chapter, index) => `
            <div class="report-section">
                <div class="report-section-title">${index + 1}. ${safeText(chapter.title || `章节 ${index + 1}`)}</div>
                <div class="document-chapter">
                    <div class="chapter-content" style="padding-left: 0;">
                        <div class="report-rich-text markdown-content">${renderMarkdown(chapter.content || '')}</div>
                    </div>
                </div>
            </div>
        `
        )
        .join('');

    const buildAnalysisHTML = reportData => {
      // 兼容性处理：提取嵌套的report字段
      if (reportData && reportData.report && !reportData.chapters) {
        reportPreviewLogger.warn('[项目面板] 检测到旧数据格式，自动提取 report 字段');
        reportData = reportData.report;
      }

      let chapters = reportData?.chapters;
      if (!chapters) {
        return '';
      }

      // 数组格式转换为对象格式
      if (Array.isArray(chapters)) {
        reportPreviewLogger.warn('[项目面板] chapters是数组格式，转换为对象格式');
        const chaptersObj = {};
        chapters.forEach((ch, idx) => {
          chaptersObj[`chapter${idx + 1}`] = ch;
        });
        chapters = chaptersObj;
        reportData.chapters = chaptersObj;
      }

      if (Array.isArray(chapters)) {
        return buildChaptersHTML(chapters);
      }

      const fallbackText = '—';
      const ensureList = list => (Array.isArray(list) && list.length ? list : [fallbackText]);
      const ch1 = normalizeObject(chapters.chapter1);
      const ch2 = normalizeObject(chapters.chapter2);
      const ch3 = normalizeObject(chapters.chapter3);
      const ch4 = normalizeObject(chapters.chapter4);
      const ch5 = normalizeObject(chapters.chapter5);
      const ch6 = normalizeObject(chapters.chapter6);
      const ch2Assumptions = ensureList(normalizeArray(ch2.assumptions));
      const ch3Limitations = ensureList(normalizeArray(ch3.limitations));
      const ch4Stages = normalizeArray(ch4.stages);
      const ch5BlindSpots = ensureList(normalizeArray(ch5.blindSpots));
      const ch5KeyQuestions = normalizeArray(ch5.keyQuestions);
      const ch6ImmediateActions = ensureList(normalizeArray(ch6.immediateActions));
      const ch6ExtendedIdeas = ensureList(normalizeArray(ch6.extendedIdeas));
      const ch6MidtermPlan = normalizeObject(ch6.midtermPlan);
      const ch3Prerequisites = normalizeObject(ch3.prerequisites);
      const coreDefinition = safeText(normalizeText(reportData.coreDefinition, fallbackText));
      const problem = safeText(normalizeText(reportData.problem, fallbackText));
      const solution = safeText(normalizeText(reportData.solution, fallbackText));
      const targetUser = safeText(normalizeText(reportData.targetUser, fallbackText));
      const keyQuestions =
        Array.isArray(ch5KeyQuestions) && ch5KeyQuestions.length
          ? ch5KeyQuestions
          : [{ category: '关键问题', question: fallbackText, validation: fallbackText, why: '' }];
      const stages =
        Array.isArray(ch4Stages) && ch4Stages.length
          ? ch4Stages
          : [{ stage: '阶段 1', goal: fallbackText, tasks: fallbackText }];
      const validationMethods = ensureList(normalizeArray(ch6.validationMethods));
      const successMetrics = ensureList(normalizeArray(ch6.successMetrics));

      return `
        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch1.title, '创意定义与演化'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 原始表述</h4>
                    <div class="highlight-box">
                        ${safeText(normalizeText(ch1.originalIdea || reportData.initialIdea, fallbackText))}
                    </div>

                    <h4>2. 核心定义与价值主张</h4>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🧭</div>
                                <div class="analysis-card-title">一句话核心定义</div>
                            </div>
                            <div class="analysis-card-content">
                                ${coreDefinition}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🎯</div>
                                <div class="analysis-card-title">解决的根本问题</div>
                            </div>
                            <div class="analysis-card-content">
                                ${problem}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">✨</div>
                                <div class="analysis-card-title">提供的独特价值</div>
                            </div>
                            <div class="analysis-card-content">
                                ${solution}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">👥</div>
                                <div class="analysis-card-title">目标受益者</div>
                            </div>
                            <div class="analysis-card-content">
                                ${targetUser}
                            </div>
                        </div>
                    </div>

                    <h4>3. 演变说明</h4>
                    <div class="highlight-box">
                        ${safeText(normalizeText(ch1.evolution, fallbackText))}
                    </div>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch2.title, '核心洞察与根本假设'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 识别的根本需求</h4>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🌊</div>
                                <div class="analysis-card-title">表层需求</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch2.surfaceNeed, fallbackText))}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🧠</div>
                                <div class="analysis-card-title">深层动力</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch2.deepMotivation, fallbackText))}
                            </div>
                        </div>
                    </div>

                    <h4>2. 核心假设清单</h4>
                    <p><strong>创意成立所依赖的关键前提（未经完全验证）：</strong></p>
                    ${ch2Assumptions
                      .map(
                        (item, idx) => `
                        <div class="insight-item">
                            <div class="insight-number">${idx + 1}</div>
                            <div class="insight-text">${safeText(item)}</div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch3.title, '边界条件与应用场景'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 理想应用场景</h4>
                    <div class="highlight-box">
                        ${safeText(normalizeText(ch3.idealScenario, fallbackText))}
                    </div>

                    <h4>2. 潜在限制因素</h4>
                    <p><strong>创意在以下情况下可能效果打折或失效：</strong></p>
                    <ul>
                        ${ch3Limitations.map(item => `<li>${safeText(item)}</li>`).join('')}
                    </ul>

                    <h4>3. 必要前置条件</h4>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🔧</div>
                                <div class="analysis-card-title">技术基础</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch3Prerequisites.technical, fallbackText))}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">💰</div>
                                <div class="analysis-card-title">资源要求</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch3Prerequisites.resources, fallbackText))}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🤝</div>
                                <div class="analysis-card-title">合作基础</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch3Prerequisites.partnerships, fallbackText))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch4.title, '可行性分析与关键挑战'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 实现路径分解</h4>
                    <p><strong>将大创意拆解为关键模块/发展阶段：</strong></p>
                    ${stages
                      .map(
                        (stage, idx) => `
                        <div class="insight-item">
                            <div class="insight-number">${idx + 1}</div>
                            <div class="insight-text">
                                <strong>${safeText(normalizeText(stage?.stage, `阶段 ${idx + 1}`))}：</strong>
                                ${safeText(normalizeText(stage?.goal, fallbackText))} · ${safeText(
                                  normalizeText(stage?.tasks, fallbackText)
                                )}
                            </div>
                        </div>
                    `
                      )
                      .join('')}

                    <h4>2. 最大障碍预判</h4>
                    <div class="highlight-box">
                        <strong>⚠️ 最大单一风险点：</strong>${safeText(normalizeText(ch4.biggestRisk, fallbackText))}<br><br>
                        <strong>预防措施：</strong>${safeText(normalizeText(ch4.mitigation, fallbackText))}
                    </div>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch5.title, '思维盲点与待探索问题'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 对话中暴露的空白</h4>
                    <div class="highlight-box">
                        <strong>⚠️ 未深入考虑的领域：</strong>
                        <ul style="margin-top: 12px; margin-bottom: 0;">
                          ${ch5BlindSpots.map(item => `<li>${safeText(item)}</li>`).join('')}
                        </ul>
                    </div>

                    <h4>2. 关键待验证问题</h4>
                    <p><strong>以下问题需通过调研、实验或原型才能回答：</strong></p>
                    <div class="analysis-grid">
                        ${keyQuestions
                          .map(
                            (item, idx) => `
                            <div class="analysis-card">
                                <div class="analysis-card-header">
                                    <div class="analysis-icon">❓</div>
                                    <div class="analysis-card-title">${safeText(
                                      normalizeText(item?.category, `决定性问题 ${idx + 1}`)
                                    )}</div>
                                </div>
                                <div class="analysis-card-content">
                                    <strong>问题：</strong>${safeText(normalizeText(item?.question, fallbackText))}<br><br>
                                    <strong>验证方法：</strong>${safeText(normalizeText(item?.validation, fallbackText))}<br><br>
                                    ${item?.why ? `<strong>为何重要：</strong>${safeText(normalizeText(item?.why, ''))}` : ''}
                                </div>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch6.title, '结构化行动建议'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 立即验证步骤（下周内）</h4>
                    <div class="highlight-box">
                        <strong>🎯 本周行动清单：</strong>
                        <ul style="margin-top: 12px; margin-bottom: 0;">
                            ${ch6ImmediateActions.map(item => `<li>${safeText(item)}</li>`).join('')}
                        </ul>
                    </div>

                    <h4>2. 中期探索方向（1-3个月）</h4>
                    <p><strong>为解答待探索问题，规划以下研究计划：</strong></p>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">👥</div>
                                <div class="analysis-card-title">用户研究</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch6MidtermPlan.userResearch, fallbackText))}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">📈</div>
                                <div class="analysis-card-title">市场调研</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch6MidtermPlan.marketResearch, fallbackText))}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🧩</div>
                                <div class="analysis-card-title">原型开发</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch6MidtermPlan.prototyping, fallbackText))}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🤝</div>
                                <div class="analysis-card-title">合作探索</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch6MidtermPlan.partnerships, fallbackText))}
                            </div>
                        </div>
                    </div>

                    <h4>3. 概念延伸提示</h4>
                    <p><strong>对话中衍生的关联创意方向：</strong></p>
                    ${ch6ExtendedIdeas
                      .map(
                        (item, idx) => `
                        <div class="insight-item">
                            <div class="insight-number">${idx + 1}</div>
                            <div class="insight-text">${safeText(item)}</div>
                        </div>
                    `
                      )
                      .join('')}

                    <h4>4. 验证方法与成功指标</h4>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🧪</div>
                                <div class="analysis-card-title">验证方法</div>
                            </div>
                            <div class="analysis-card-content">
                                <ul style="margin: 0; padding-left: 18px;">
                                    ${validationMethods.map(item => `<li>${safeText(item)}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">✅</div>
                                <div class="analysis-card-title">成功指标</div>
                            </div>
                            <div class="analysis-card-content">
                                <ul style="margin: 0; padding-left: 18px;">
                                    ${successMetrics.map(item => `<li>${safeText(item)}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      `;
    };

    const metaHTML =
      type === 'analysis' ? '<div class="report-meta">项目面板 · 只读预览</div>' : '';
    const buildReportHeader = ({ title, subtitle, meta }) => `
      <div class="report-hero">
        <div class="report-hero-title">${safeText(title)}</div>
        <div class="report-hero-sub">${safeText(subtitle)}</div>
        ${meta ? `<div class="report-hero-meta">${meta}</div>` : ''}
      </div>
    `;
    let contentHTML = '';
    if (type === 'analysis') {
      // 检查数据是否有效
      if (!data || !data.chapters) {
        contentHTML =
          metaHTML +
          `
          <div style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
              暂无分析报告内容
            </div>
            <div style="font-size: 14px; color: var(--text-secondary);">
              报告数据不完整或格式错误
            </div>
          </div>
        `;
      } else {
        contentHTML = metaHTML + buildAnalysisHTML(data);
      }
    } else if (type === 'business' || type === 'proposal') {
      const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
      const ideaTitle = chat?.userData?.idea || chat?.title || '创意项目';
      const headerHTML = buildReportHeader({
        title: typeTitle,
        subtitle: ideaTitle
      });
      if (data.document) {
        const parsed = tryParseReportDocument(data.document);
        if (parsed && parsed.chapters) {
          contentHTML = `
            ${headerHTML}
            ${renderStructuredReport(parsed)}
          `;
        } else {
          contentHTML = `
            ${headerHTML}
            <div class="report-section">
                <div class="report-section-title">报告正文</div>
                <div class="report-section-body report-rich-text markdown-content">
                    ${renderMarkdown(data.document)}
                </div>
            </div>
          `;
        }
      } else if (data.chapters) {
        if (!Array.isArray(data.chapters) && data.chapters.chapter1) {
          contentHTML = `
            ${headerHTML}
            ${renderStructuredReport(data)}
          `;
        } else {
          const chapters = Array.isArray(data.chapters)
            ? data.chapters
            : Object.values(data.chapters || {});
          contentHTML = `
            ${headerHTML}
            ${chapters
              .map((chapter, index) => {
                const agentIcon =
                  typeof window.getAgentIconSvg === 'function'
                    ? window.getAgentIconSvg(
                        chapter.emoji || chapter.agent,
                        16,
                        'agent-inline-icon'
                      )
                    : '';
                const agentLine = chapter.agent ? `${agentIcon} ${safeText(chapter.agent)}` : '';
                return `
                  <div class="report-section">
                      <div class="report-section-title">${index + 1}. ${safeText(
                        chapter.title || `章节 ${index + 1}`
                      )}</div>
                      ${
                        agentLine
                          ? `<div class="report-section-meta">分析师：${agentLine}</div>`
                          : ''
                      }
                      <div class="report-section-body report-rich-text markdown-content">
                          ${
                            chapter.content
                              ? renderMarkdown(chapter.content)
                              : '<p class="report-empty">内容生成中...</p>'
                          }
                      </div>
                  </div>
                `;
              })
              .join('')}
            <div class="report-footer-note">本报告由 ThinkCraft AI 自动生成 | 数据仅供参考</div>
          `;
        }
      }
    } else if (data.chapters) {
      const chapters = Array.isArray(data.chapters)
        ? data.chapters
        : Object.values(data.chapters || {});
      contentHTML = metaHTML + buildChaptersHTML(chapters);
    } else {
      const summary = data.coreDefinition || data.problem || data.solution || '';
      contentHTML =
        metaHTML + `<div class="project-panel-empty">${safeText(summary || '暂无报告内容')}</div>`;
    }

    if (!contentHTML) {
      contentHTML = `${metaHTML}<div class="project-panel-empty">暂无报告内容</div>`;
    }

    const modalTitle =
      type === 'analysis' ? '分析报告' : type === 'business' ? '商业计划书' : '产品立项材料';
    window.modalManager.showCustomModal(modalTitle, contentHTML, 'projectIdeaReportModal');
  }
};
