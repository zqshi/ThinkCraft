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
/* global normalizeChatId */

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
    if (reportModal && this.state?.currentChat) {
      reportModal.dataset.chatId = normalizeChatId(this.state.currentChat);
    }

    // 使用class控制显示，避免内联样式优先级问题
    if (window.modalManager) {
      window.modalManager.open('reportModal');
    } else {
      reportModal.classList.add('active');
    }
    reportContent.innerHTML =
      '<div style="text-align: center; padding: 60px 20px;"><div class="loading-spinner"></div><div style="margin-top: 20px;">正在加载报告...</div></div>';

    // 尝试从统一 read model 加载报告
    if (this.state.currentChat) {
      try {
        const chatId = normalizeChatId(this.state.currentChat);
        const resolution = await window.chatReportBundle?.resolveReportEntry?.(chatId, 'analysis', {
          stateChats: this.state.chats
        });
        const reportEntry = resolution?.report || null;
        const buttonState = resolution?.buttonState || null;

        if (reportEntry && reportEntry.status === 'completed' && reportEntry.data) {
          window.chatReportBundle?.setActiveReport?.(reportEntry.data, {
            chatId,
            type: 'analysis',
            reportKey: window.reportGenerator?.getAnalysisReportKey?.()
          });
          this.renderAIReport(reportEntry.data);
          if (typeof setAnalysisActionsEnabled === 'function') {
            setAnalysisActionsEnabled(true);
          }
          if (typeof updateShareLinkButtonVisibility === 'function') {
            updateShareLinkButtonVisibility();
          }
          return;
        }

        if (buttonState?.buttonState === 'generating') {
          const progress = reportEntry?.progress || { percentage: 0 };
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

        if (buttonState?.buttonState === 'error') {
          reportContent.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                                报告状态异常
                            </div>
                            <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                                ${buttonState.buttonText || '报告暂不可用，请重新生成。'}
                            </div>
                            <button class="btn-primary" onclick="regenerateInsightsReport()">重新生成</button>
                        </div>
                    `;
          return;
        }

        if (reportEntry && reportEntry.status === 'completed' && !reportEntry.data) {
          reportContent.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                                报告数据缺失
                            </div>
                            <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                                检测到报告已完成但内容为空，建议重新生成。
                            </div>
                            <button class="btn-primary" onclick="regenerateInsightsReport()">重新生成</button>
                        </div>
                    `;
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
        console.error('[查看报告] 报告读取失败:', error);
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
    const normalizeArray = value => (Array.isArray(value) ? value : []);
    const normalizeObject = value => (value && typeof value === 'object' ? value : {});
    const normalizeText = (value, fallback = '') =>
      value === undefined || value === null || value === '' ? fallback : value;
    const fallbackText = '—';
    const ensureList = list => (Array.isArray(list) && list.length ? list : [fallbackText]);

    // 🔧 兼容性处理：如果数据是 {report: {...}, cached: ...} 格式，提取 report 字段
    if (reportData && reportData.report && !reportData.chapters) {
      console.warn('[报告查看器] 检测到旧数据格式，自动提取 report 字段');
      reportData = reportData.report;
    }

    // 数据格式兼容处理
    if (!reportData || !reportData.chapters) {
      console.error('[报告查看器] 数据格式错误:', reportData);
      reportContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                        报告数据格式错误
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                        缺少必需字段: chapters<br><br>
                        <strong>可能的原因:</strong><br>
                        1. 报告生成未完成<br>
                        2. 数据存储异常<br>
                        3. 网络传输中断<br><br>
                        <strong>建议操作:</strong><br>
                        1. 点击"重新生成"按钮<br>
                        2. 如果多次失败，请刷新页面<br>
                        3. 确保至少进行了3轮以上对话
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button class="btn-secondary" onclick="closeReport()">关闭</button>
                        <button class="btn-primary" onclick="generateDetailedReport(true)">重新生成</button>
                    </div>
                </div>
            `;
      return;
    }

    // 🔧 同步到全局，确保分享按钮可用
    window.chatReportBundle?.setActiveReport?.(reportData, {
      chatId: normalizeChatId(this.state?.currentChat),
      type: 'analysis',
      reportKey: window.reportGenerator?.getAnalysisReportKey?.()
    });
    if (typeof updateShareLinkButtonVisibility === 'function') {
      updateShareLinkButtonVisibility();
    }

    // 如果chapters是数组格式，转换为对象格式
    if (Array.isArray(reportData.chapters)) {
      console.warn('[报告查看器] chapters是数组格式，转换为对象格式');
      const chaptersObj = {};
      reportData.chapters.forEach((ch, idx) => {
        chaptersObj[`chapter${idx + 1}`] = ch;
      });
      reportData.chapters = chaptersObj;
    }

    // 🔧 使用 ErrorHandler 验证数据结构
    const schema = {
      required: ['chapters'],
      fields: {
        chapters: 'object'
      }
    };

    const validation = window.ErrorHandler?.validateDataStructure(reportData, schema) || {
      valid: false,
      errors: ['数据验证失败']
    };

    if (!validation.valid) {
      console.error('[报告查看器] 数据验证失败:', validation.errors);

      const errorDetails = validation.errors.join('<br>');

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
                        3. 网络连接不稳定<br>
                        4. 数据格式不符合预期<br><br>
                        <strong>建议操作:</strong><br>
                        1. 点击下方"重试"按钮<br>
                        2. 如果多次失败，请刷新页面<br>
                        3. 确保至少进行了3轮以上对话<br>
                        4. 检查浏览器控制台查看详细错误信息
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button class="btn-secondary" onclick="closeReport()">关闭</button>
                        <button class="btn-primary" onclick="generateDetailedReport(true)">重试</button>
                    </div>
                </div>
            `;
      return;
    }

    reportContent.innerHTML = this.buildStructuredReportHTML(reportData);
    if (typeof updateShareLinkButtonVisibility === 'function') {
      updateShareLinkButtonVisibility();
    }
  }

  _tryParseReportDocument(document) {
    if (!document || typeof document !== 'string') return null;
    const trimmed = document.trim();
    const fencedMatch =
      trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```([\s\S]*?)```/i);
    const jsonText = (fencedMatch ? fencedMatch[1] : trimmed).trim();
    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) return null;
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      console.warn('[报告查看器] JSON解析失败:', error.message);
      return null;
    }
  }

  _normalizeMarkdownForRendering(content) {
    if (!content || typeof content !== 'string') return '';
    let text = content;
    const newlineCount = (text.match(/\n/g) || []).length;
    const looksLikeMarkdown = /#{1,6}\s+|^\s*[-*+]\s+|^\s*\|.*\|\s*$/m.test(text);

    if (newlineCount < 3 && looksLikeMarkdown) {
      text = text.replace(/([^\n])\s*(#{1,6})\s+/g, '$1\n\n$2 ');
      text = text.replace(/([^\n])\s*([-*+])\s+/g, '$1\n$2 ');
      text = text.replace(/([^\n])\s*(\|.*\|)\s*/g, '$1\n$2');
    }

    if (/\|\|/.test(text) && /\|/.test(text)) {
      text = text.replace(/\s*\|\|\s*/g, '\n|');
    }

    const rebuildPipeTable = source => {
      const lines = source.split('\n');
      let headerIndex = -1;
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (/\|/.test(line) && /关键议题|核心假设|验证优先级|当前状态/.test(line)) {
          headerIndex = i;
          break;
        }
      }
      if (headerIndex === -1) return source;

      const headerLine = lines[headerIndex];
      const headerCells = headerLine
        .split('|')
        .map(cell => cell.trim())
        .filter(Boolean);
      const colCount = headerCells.length;
      if (colCount < 2) return source;

      const nextNonEmptyIndex = (() => {
        for (let i = headerIndex + 1; i < lines.length; i += 1) {
          if (lines[i].trim() !== '') return i;
        }
        return -1;
      })();

      const hasSeparator =
        nextNonEmptyIndex !== -1 &&
        /^\s*\|?\s*[-:]+(\s*\|\s*[-:]+)+\s*\|?\s*$/.test(lines[nextNonEmptyIndex]);
      const looksBroken = lines
        .slice(headerIndex + 1, headerIndex + 6)
        .some(line => /\|/.test(line) && !/^\s*\|/.test(line));
      if (hasSeparator && !looksBroken) return source;

      const rowLines = [];
      let endIndex = lines.length;
      for (let i = headerIndex + 1; i < lines.length; i += 1) {
        if (/^\s*#{1,6}\s+/.test(lines[i])) {
          endIndex = i;
          break;
        }
        rowLines.push(lines[i]);
      }

      const cells = rowLines
        .join(' ')
        .split('|')
        .map(cell => cell.trim())
        .filter(Boolean);

      if (!cells.length) return source;

      const separator = `| ${Array(colCount).fill('---').join(' | ')} |`;
      const rebuilt = [];
      rebuilt.push(`| ${headerCells.join(' | ')} |`);
      rebuilt.push(separator);

      for (let i = 0; i < cells.length; i += colCount) {
        const rowCells = cells.slice(i, i + colCount);
        if (!rowCells.length) break;
        const padded = rowCells.concat(Array(Math.max(0, colCount - rowCells.length)).fill(''));
        rebuilt.push(`| ${padded.join(' | ')} |`);
      }

      const before = lines.slice(0, headerIndex).join('\n');
      const after = lines.slice(endIndex).join('\n');
      return [before, rebuilt.join('\n'), after].filter(Boolean).join('\n');
    };

    text = rebuildPipeTable(text);

    const lines = text.split('\n');
    const normalizedLines = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^\s*\|.*\|\s*$/.test(line)) {
        if (normalizedLines.length && normalizedLines[normalizedLines.length - 1].trim() !== '') {
          normalizedLines.push('');
        }
        normalizedLines.push(line.trim());
        const next = lines[i + 1] || '';
        if (!/^\s*\|?\s*[-:]+(\s*\|\s*[-:]+)+\s*\|?\s*$/.test(next)) {
          const cols = line.split('|').filter(cell => cell.trim() !== '').length;
          const separator = `| ${Array(cols).fill('---').join(' | ')} |`;
          normalizedLines.push(separator);
        }
        continue;
      }
      normalizedLines.push(line);
    }

    return normalizedLines.join('\n').trim();
  }

  buildStructuredReportHTML(reportData) {
    const normalizeArray = value => (Array.isArray(value) ? value : []);
    const normalizeObject = value => (value && typeof value === 'object' ? value : {});
    const normalizeText = (value, fallback = '') =>
      value === undefined || value === null || value === '' ? fallback : value;
    const fallbackText = '—';
    const ensureList = list => (Array.isArray(list) && list.length ? list : [fallbackText]);

    if (!reportData || !reportData.chapters) {
      return `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                        报告数据格式错误
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                        缺少必需字段: chapters
                    </div>
                </div>
            `;
    }

    const ch1 = normalizeObject(reportData.chapters.chapter1);
    const ch2 = normalizeObject(reportData.chapters.chapter2);
    const ch3 = normalizeObject(reportData.chapters.chapter3);
    const ch4 = normalizeObject(reportData.chapters.chapter4);
    const ch5 = normalizeObject(reportData.chapters.chapter5);
    const ch6 = normalizeObject(reportData.chapters.chapter6);
    const ch2Assumptions = ensureList(normalizeArray(ch2.assumptions));
    const ch3Limitations = ensureList(normalizeArray(ch3.limitations));
    const ch4Stages = normalizeArray(ch4.stages);
    const ch5BlindSpots = ensureList(normalizeArray(ch5.blindSpots));
    const ch5KeyQuestions = normalizeArray(ch5.keyQuestions);
    const ch6ImmediateActions = ensureList(normalizeArray(ch6.immediateActions));
    const ch6ExtendedIdeas = ensureList(normalizeArray(ch6.extendedIdeas));
    const ch6MidtermPlan = normalizeObject(ch6.midtermPlan);
    const ch3Prerequisites = normalizeObject(ch3.prerequisites);
    const coreDefinition = normalizeText(reportData.coreDefinition, fallbackText);
    const problem = normalizeText(reportData.problem, fallbackText);
    const solution = normalizeText(reportData.solution, fallbackText);
    const targetUser = normalizeText(reportData.targetUser, fallbackText);
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
    const chapterTitles = [ch1, ch2, ch3, ch4, ch5, ch6]
      .map((ch, idx) => normalizeText(ch.title, `章节 ${idx + 1}`))
      .map((title, idx) => `<li>${idx + 1}. ${title}</li>`)
      .join('');

    return `
            <div id="insights-plan" class="report-tab-content active">
                <div class="highlight-box">
                    <strong>结构化目录</strong>
                    <ul>${chapterTitles}</ul>
                </div>

                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch1.title, '创意定义与演化')}</div>
                    <div class="document-chapter">
                        <div class="chapter-content" style="padding-left: 0;">
                            <h4>1. 原始表述</h4>
                            <div class="highlight-box">
                                ${normalizeText(ch1.originalIdea || reportData.initialIdea, fallbackText)}
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
                                ${normalizeText(ch1.evolution, fallbackText)}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch2.title, '核心洞察与根本假设')}</div>
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
                                        ${normalizeText(ch2.surfaceNeed, fallbackText)}
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">🧠</div>
                                        <div class="analysis-card-title">深层动力</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch2.deepMotivation, fallbackText)}
                                    </div>
                                </div>
                            </div>

                            <h4>2. 核心假设清单</h4>
                            <p><strong>创意成立所依赖的关键前提（未经完全验证）：</strong></p>
                            ${ch2Assumptions
                              .map(
                                (assumption, idx) => `
                                <div class="insight-item">
                                    <div class="insight-number">${idx + 1}</div>
                                    <div class="insight-text">${assumption}</div>
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch3.title, '边界条件与应用场景')}</div>
                    <div class="document-chapter">
                        <div class="chapter-content" style="padding-left: 0;">
                            <h4>1. 理想应用场景</h4>
                            <div class="highlight-box">
                                ${normalizeText(ch3.idealScenario, fallbackText)}
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
                                        ${normalizeText(ch3Prerequisites.technical, fallbackText)}
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">💰</div>
                                        <div class="analysis-card-title">资源要求</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch3Prerequisites.resources, fallbackText)}
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">🤝</div>
                                        <div class="analysis-card-title">合作基础</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch3Prerequisites.partnerships, fallbackText)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <div class="report-section-title">${normalizeText(ch4.title, '可行性分析与关键挑战')}</div>
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
                                        <strong>${normalizeText(stage?.stage, `阶段 ${idx + 1}`)}：</strong>
                                        ${normalizeText(stage?.goal, fallbackText)} · ${normalizeText(stage?.tasks, fallbackText)}
                                    </div>
                                </div>
                            `
                              )
                              .join('')}

                            <h4>2. 最大障碍预判</h4>
                            <div class="highlight-box">
                                <strong>⚠️ 最大单一风险点：</strong>${normalizeText(ch4.biggestRisk, fallbackText)}<br><br>
                                <strong>预防措施：</strong>${normalizeText(ch4.mitigation, fallbackText)}
                            </div>
                        </div>
                    </div>
                </div>

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
                                ${keyQuestions
                                  .map(
                                    (item, idx) => `
                                    <div class="analysis-card">
                                        <div class="analysis-card-header">
                                            <div class="analysis-icon">❓</div>
                                            <div class="analysis-card-title">${normalizeText(item?.category, `决定性问题 ${idx + 1}`)}</div>
                                        </div>
                                        <div class="analysis-card-content">
                                            <strong>问题：</strong>${normalizeText(item?.question, fallbackText)}<br><br>
                                            <strong>验证方法：</strong>${normalizeText(item?.validation, fallbackText)}<br><br>
                                            ${item?.why ? `<strong>为何重要：</strong>${normalizeText(item?.why, '')}` : ''}
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
                            <div class="analysis-grid">
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">👥</div>
                                        <div class="analysis-card-title">用户研究</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch6MidtermPlan.userResearch, fallbackText)}
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">📈</div>
                                        <div class="analysis-card-title">市场调研</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch6MidtermPlan.marketResearch, fallbackText)}
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">🧩</div>
                                        <div class="analysis-card-title">原型开发</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch6MidtermPlan.prototyping, fallbackText)}
                                    </div>
                                </div>
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">🤝</div>
                                        <div class="analysis-card-title">合作探索</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(ch6MidtermPlan.partnerships, fallbackText)}
                                    </div>
                                </div>
                            </div>

                            <h4>3. 概念延伸提示</h4>
                            <p><strong>对话中衍生的关联创意方向：</strong></p>
                            ${ch6ExtendedIdeas
                              .map(
                                (idea, idx) => `
                                <div class="insight-item">
                                    <div class="insight-number">${idx + 1}</div>
                                    <div class="insight-text">${idea}</div>
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
                                            ${validationMethods.map(item => `<li>${item}</li>`).join('')}
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
                                            ${successMetrics.map(item => `<li>${item}</li>`).join('')}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  _buildStructuredChapterMarkdown(reportData, chapterKey, chapterIndex) {
    const chapter = reportData?.chapters?.[chapterKey] || {};
    const title = chapter.title || `章节 ${chapterIndex + 1}`;
    const list = value => (Array.isArray(value) ? value : []).filter(Boolean);
    const lines = [];

    lines.push(`# ${title}`);

    if (chapterKey === 'chapter1') {
      lines.push('## 原始表述');
      lines.push(chapter.originalIdea || reportData.initialIdea || '—');
      lines.push('');
      lines.push('## 核心定义与价值主张');
      lines.push(`- 一句话核心定义：${reportData.coreDefinition || '—'}`);
      lines.push(`- 解决的根本问题：${reportData.problem || '—'}`);
      lines.push(`- 提供的独特价值：${reportData.solution || '—'}`);
      lines.push(`- 目标受益者：${reportData.targetUser || '—'}`);
      lines.push('');
      lines.push('## 演变说明');
      lines.push(chapter.evolution || '—');
    }

    if (chapterKey === 'chapter2') {
      lines.push('## 识别的根本需求');
      lines.push(`- 表层需求：${chapter.surfaceNeed || '—'}`);
      lines.push(`- 深层动力：${chapter.deepMotivation || '—'}`);
      lines.push('');
      lines.push('## 核心假设清单');
      list(chapter.assumptions).forEach(item => lines.push(`- ${item}`));
      if (!list(chapter.assumptions).length) {
        lines.push('- —');
      }
    }

    if (chapterKey === 'chapter3') {
      lines.push('## 理想应用场景');
      lines.push(chapter.idealScenario || '—');
      lines.push('');
      lines.push('## 潜在限制因素');
      list(chapter.limitations).forEach(item => lines.push(`- ${item}`));
      if (!list(chapter.limitations).length) {
        lines.push('- —');
      }
      lines.push('');
      lines.push('## 必要前置条件');
      const pre = chapter.prerequisites || {};
      lines.push(`- 技术基础：${pre.technical || '—'}`);
      lines.push(`- 资源要求：${pre.resources || '—'}`);
      lines.push(`- 合作基础：${pre.partnerships || '—'}`);
    }

    if (chapterKey === 'chapter4') {
      lines.push('## 实现路径分解');
      list(chapter.stages).forEach((stage, idx) => {
        lines.push(
          `- 阶段 ${idx + 1}：${stage?.stage || '—'} | 目标：${stage?.goal || '—'} | 任务：${stage?.tasks || '—'}`
        );
      });
      if (!list(chapter.stages).length) {
        lines.push('- —');
      }
      lines.push('');
      lines.push('## 最大障碍预判');
      lines.push(`- 最大单一风险点：${chapter.biggestRisk || '—'}`);
      lines.push(`- 预防措施：${chapter.mitigation || '—'}`);
    }

    if (chapterKey === 'chapter5') {
      lines.push('## 对话中暴露的空白');
      list(chapter.blindSpots).forEach(item => lines.push(`- ${item}`));
      if (!list(chapter.blindSpots).length) {
        lines.push('- —');
      }
      lines.push('');
      lines.push('## 关键待验证问题');
      list(chapter.keyQuestions).forEach(item => {
        lines.push(`- ${item?.category || '关键问题'}：${item?.question || '—'}`);
        lines.push(`  - 验证方法：${item?.validation || '—'}`);
        if (item?.why) {
          lines.push(`  - 为什么重要：${item.why}`);
        }
      });
      if (!list(chapter.keyQuestions).length) {
        lines.push('- —');
      }
    }

    if (chapterKey === 'chapter6') {
      lines.push('## 立即验证步骤（下周内）');
      list(chapter.immediateActions).forEach(item => lines.push(`- ${item}`));
      if (!list(chapter.immediateActions).length) {
        lines.push('- —');
      }
      lines.push('');
      lines.push('## 中期探索方向（1-3个月）');
      const mid = chapter.midtermPlan || {};
      lines.push(`- 用户研究：${mid.userResearch || '—'}`);
      lines.push(`- 市场调研：${mid.marketResearch || '—'}`);
      lines.push(`- 原型开发：${mid.prototyping || '—'}`);
      lines.push(`- 合作探索：${mid.partnerships || '—'}`);
      lines.push('');
      lines.push('## 概念延伸提示');
      list(chapter.extendedIdeas).forEach(item => lines.push(`- ${item}`));
      if (!list(chapter.extendedIdeas).length) {
        lines.push('- —');
      }
      lines.push('');
      lines.push('## 验证方法与成功指标');
      lines.push('### 验证方法');
      list(chapter.validationMethods).forEach(item => lines.push(`- ${item}`));
      if (!list(chapter.validationMethods).length) {
        lines.push('- —');
      }
      lines.push('### 成功指标');
      list(chapter.successMetrics).forEach(item => lines.push(`- ${item}`));
      if (!list(chapter.successMetrics).length) {
        lines.push('- —');
      }
    }

    return {
      title,
      content: lines.join('\n')
    };
  }

  _buildExportChaptersFromReportData(reportData) {
    if (!reportData) return [];

    if (Array.isArray(reportData.chapters) && reportData.chapters.length) {
      return reportData.chapters.map(ch => ({
        title: ch.title || ch.chapterId || '章节',
        content: ch.content || ''
      }));
    }

    if (reportData.chapters && reportData.chapters.chapter1) {
      const order = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6'];
      return order
        .filter(key => reportData.chapters[key])
        .map((key, idx) => this._buildStructuredChapterMarkdown(reportData, key, idx));
    }

    if (typeof reportData.document === 'string' && reportData.document.trim()) {
      const parsed = this._tryParseReportDocument(reportData.document);
      if (parsed && parsed.chapters) {
        const order = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6'];
        return order
          .filter(key => parsed.chapters[key])
          .map((key, idx) => this._buildStructuredChapterMarkdown(parsed, key, idx));
      }
      return [
        {
          title: '报告正文',
          content: reportData.document
        }
      ];
    }

    return [];
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
      const renderMarkdownContent = value => {
        const content = this._normalizeMarkdownForRendering(value || '');
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
      const renderBusinessReportStyle = () => `
                <style>
                    #businessReportContent .markdown-content h1,
                    #businessReportContent .markdown-content h2 {
                        font-size: 18px;
                        margin: 20px 0 12px;
                        line-height: 1.4;
                        font-weight: 700;
                        color: var(--text-primary);
                    }
                    #businessReportContent .markdown-content h3 {
                        font-size: 16px;
                        margin: 20px 0 12px;
                        line-height: 1.4;
                        font-weight: 600;
                        color: var(--text-primary);
                    }
                    #businessReportContent .markdown-content p {
                        font-size: 15px;
                        line-height: 1.8;
                        color: var(--text-secondary);
                    }
                    #businessReportContent .markdown-content li {
                        font-size: 14px;
                        line-height: 1.8;
                        color: var(--text-secondary);
                    }
                </style>
            `;
      const openBusinessReportModal = () => {
        const modalEl = document.getElementById('businessReportModal');
        if (!modalEl) return;
        modalEl.style.display = '';
        if (window.modalManager) {
          window.modalManager.open('businessReportModal');
        } else {
          modalEl.classList.add('active');
        }
      };
      const toggleShareButton = reportType => {
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

      if (!report || (!report.document && !report.chapters)) {
        const container = document.getElementById('businessReportContent');
        if (container) {
          container.innerHTML = `
                        <div class="report-section">
                            <div class="report-section-title">报告内容缺失</div>
                            <div class="document-chapter">
                                <div class="chapter-content">
                                    <p style="color: var(--text-secondary);">检测到报告已完成但内容为空，建议重新生成。</p>
                                    <div style="display: flex; gap: 12px; margin-top: 16px;">
                                        <button class="btn-secondary" onclick="closeBusinessReport()">关闭</button>
                                        <button class="btn-primary" onclick="window.businessPlanGenerator?.regenerate('${type}')">重新生成</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
          openBusinessReportModal();
        }
        return;
      }

      if (report && report.document) {
        window.currentGeneratedChapters = Array.isArray(report.selectedChapters)
          ? report.selectedChapters
          : [];
        const parsed = this._tryParseReportDocument(report.document);

        if (parsed && parsed.chapters) {
          document.getElementById('businessReportContent').innerHTML = `
                        ${renderBusinessReportStyle()}
                        ${this.buildStructuredReportHTML(parsed)}
                    `;
          openBusinessReportModal();
          return;
        }

        const outlineItems = window.currentGeneratedChapters.length
          ? window.currentGeneratedChapters
              .map(
                (id, idx) =>
                  `<li>${idx + 1}. ${safeText(this.getChapterTitle?.(type, id) || id, id)}</li>`
              )
              .join('')
          : '';
        const reportContent = `
                    ${renderBusinessReportStyle()}
                    ${
                      outlineItems
                        ? `
                        <div class="highlight-box">
                            <strong>结构化目录</strong>
                            <ul>${outlineItems}</ul>
                        </div>`
                        : ''
                    }
                    <div class="report-section">
                        <div class="report-section-title">报告正文</div>
                        <div class="document-chapter">
                            <div class="chapter-content">
                                <div class="markdown-content">
                                    ${renderMarkdownContent(report.document)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

        document.getElementById('businessReportContent').innerHTML = reportContent;
        openBusinessReportModal();
        return;
      }

      // 如果report包含chapters数据，直接显示
      if (report && report.chapters) {
        if (!Array.isArray(report.chapters) && report.chapters.chapter1) {
          document.getElementById('businessReportContent').innerHTML = `
                        ${renderBusinessReportStyle()}
                        ${this.buildStructuredReportHTML(report)}
                    `;
          openBusinessReportModal();
          return;
        }

        const chapters = report.chapters;
        window.currentGeneratedChapters = chapters.map(ch => ch.chapterId);
        const outlineItems = chapters
          .map((ch, index) => `<li>${index + 1}. ${safeText(ch.title, `章节 ${index + 1}`)}</li>`)
          .join('');

        const reportContent = `
                    ${renderBusinessReportStyle()}
                    <div class="highlight-box">
                        <strong>结构化目录</strong>
                        <ul>${outlineItems}</ul>
                    </div>
                    ${chapters
                      .map(
                        (ch, index) => `
                        <div class="report-section">
                            <div class="report-section-title">${index + 1}. ${safeText(ch.title, `章节 ${index + 1}`)}</div>
                            <div class="document-chapter">
                                <div class="chapter-content">
                                    <p style="color: var(--text-secondary); margin-bottom: 20px;">
                                        <strong>分析师：</strong>${typeof getAgentIconSvg === 'function' ? getAgentIconSvg(ch.emoji || ch.agent, 16, 'agent-inline-icon') : ''} ${safeText(ch.agent, 'AI分析师')}
                                    </p>

                                    <div class="markdown-content">
                                        ${ch.content ? renderMarkdownContent(ch.content) : '<p style="color: var(--text-secondary);">内容生成中...</p>'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                `;

        document.getElementById('businessReportContent').innerHTML = reportContent;
        openBusinessReportModal();
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
          window.toast.warning(`${validation.error}\n${validation.detail}`, 5000);
        } else {
          window.toast.error(validation.error, 4000);
        }
        return;
      }

      // 验证通过，开始导出
      window.toast.info('📄 正在生成PDF，请稍候...', 2000);

      // 调用后端API
      if (window.requireAuth) {
        const ok = await window.requireAuth({ redirect: true, prompt: true });
        if (!ok) {
          return;
        }
      }
      const authToken = window.getAuthToken ? window.getAuthToken() : null;
      const chapters = this._buildExportChaptersFromReportData(validation.data);
      if (!chapters.length) {
        window.toast.error('导出失败：未找到可导出的结构化内容', 4000);
        return;
      }

      const response = await fetch(`${this.state.settings.apiUrl}/api/pdf-export/business-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          chapters,
          title: reportType === 'proposal' ? '产品立项材料' : '商业计划书',
          type: reportType
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未授权，请重新登录');
        }
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
