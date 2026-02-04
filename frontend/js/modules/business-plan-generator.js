/**
 * 商业计划书生成器（前端）
 * 负责协调章节选择、API调用、进度展示
 */

/* global normalizeChatId */

// 创建日志实例（避免脚本被重复加载时报错）
const logger =
  window.__businessPlanLogger ||
  (window.__businessPlanLogger = window.createLogger
    ? window.createLogger('BusinessPlan')
    : console);

class BusinessPlanGenerator {
  constructor(apiClient, stateManager, agentProgressManager) {
    this.api = apiClient;
    this.state = stateManager;
    this.progressManager = agentProgressManager;
    this.progressTimer = null;
    this.progressStartTime = null;
    this.progressEstimatedMs = 0;

    // 章节配置
    this.chapterConfig = {
      business: {
        core: [
          {
            id: 'executive-summary',
            title: '执行摘要',
            desc: '业务概述、市场机会、解决方案、商业模式'
          },
          {
            id: 'market-analysis',
            title: '市场分析',
            desc: '市场规模、目标用户、痛点分析、市场趋势'
          },
          { id: 'solution', title: '解决方案', desc: '产品定位、核心功能、技术方案、差异化优势' },
          {
            id: 'business-model',
            title: '商业模式',
            desc: '收入模式、定价策略、成本结构、盈利预测'
          }
        ],
        optional: [
          {
            id: 'competitive-landscape',
            title: '竞争格局',
            desc: '竞争对手分析、差异化策略、进入壁垒'
          },
          {
            id: 'marketing-strategy',
            title: '市场策略',
            desc: '客户获取、营销渠道、品牌定位、增长策略'
          },
          {
            id: 'team-structure',
            title: '团队架构',
            desc: '核心团队、组织架构、人才需求、股权激励'
          },
          {
            id: 'financial-projection',
            title: '财务预测',
            desc: '收入预测、成本预算、现金流、融资需求'
          },
          {
            id: 'risk-assessment',
            title: '风险评估',
            desc: '市场风险、技术风险、运营风险、应对策略'
          },
          {
            id: 'implementation-plan',
            title: '实施计划',
            desc: '里程碑规划、产品开发、市场推广、KPI设定'
          },
          { id: 'appendix', title: '附录', desc: '术语表、参考资料、补充材料、联系方式' }
        ]
      },
      proposal: {
        core: [
          { id: 'project-summary', title: '项目摘要', desc: '项目背景、核心目标、预期成果' },
          { id: 'problem-insight', title: '问题洞察', desc: '用户痛点、市场需求、解决方案价值' },
          { id: 'product-solution', title: '产品方案', desc: '功能设计、技术选型、用户体验' },
          { id: 'implementation-path', title: '实施路径', desc: '开发计划、资源需求、时间节点' }
        ],
        optional: [
          { id: 'competitive-analysis', title: '竞品分析', desc: '竞品对比、差异化优势' },
          { id: 'budget-planning', title: '预算规划', desc: '开发成本、运营成本、ROI分析' },
          { id: 'risk-control', title: '风险控制', desc: '技术风险、进度风险、应对措施' }
        ]
      }
    };
  }

  /**
   * 统一的按钮点击处理入口
   * 根据当前状态决定显示章节选择、进度弹窗还是报告查看
   * @param {String} type - 'business' | 'proposal'
   */
  async handleButtonClick(type) {
    console.log('[按钮点击] ========== 开始处理 ==========');
    console.log('[按钮点击] 类型:', type);
    console.log('[按钮点击] 时间:', new Date().toISOString());

    logger.debug('[按钮点击] 处理按钮点击', { type });

    // ✅ 防御性检查：确保按钮未被意外禁用
    const btnMap = {
      business: 'businessPlanBtn',
      proposal: 'proposalBtn'
    };
    const btnId = btnMap[type];
    const btn = document.getElementById(btnId);
    if (btn && btn.disabled) {
      console.warn('[按钮点击] 按钮被禁用，强制启用');
      btn.disabled = false;
    }

    // 获取当前会话ID
    const chatId = window.state?.currentChat;
    console.log('[按钮点击] 会话ID:', chatId);

    // 添加 chatId 有效性验证
    if (!chatId) {
      console.error('[按钮点击] 当前没有活动会话');
      window.ErrorHandler?.showToast('请先创建或选择一个会话', 'warning');
      return;
    }

    // 检查报告状态
    console.log('[按钮点击] 开始检查报告状态...');
    const report = await this.checkReportStatus(type, chatId);
    console.log('[按钮点击] 报告状态检查完成:', {
      hasReport: Boolean(report),
      status: report?.status,
      type: report?.type,
      hasData: Boolean(report?.data),
      hasChapters: Boolean(report?.data?.chapters)
    });

    logger.debug('[按钮点击] 报告状态', { type, chatId, status: report?.status });

    if (!report || report.status === 'idle' || report.status === 'error') {
      // 状态：空闲或错误 → 显示章节选择
      console.log('[按钮点击] 显示章节选择弹窗');
      logger.debug('[按钮点击] 显示章节选择弹窗');
      this.showChapterSelection(type);
    } else if (report.status === 'generating') {
      // 状态：生成中 → 显示进度弹窗
      console.log('[按钮点击] 显示进度弹窗');
      logger.debug('[按钮点击] 显示进度弹窗');
      await this.showProgress(type, report);
    } else if (report.status === 'completed') {
      // 状态：已完成 → 显示报告查看
      console.log('[按钮点击] 显示报告查看弹窗');
      logger.debug('[按钮点击] 显示报告查看弹窗');
      this.showCompletedReport(type, report);
    } else {
      console.warn('[按钮点击] 未知的报告状态:', report?.status);
    }

    console.log('[按钮点击] ========== 处理完成 ==========');
  }

  /**
   * 检查报告状态
   * @param {String} type - 'business' | 'proposal'
   * @param {String|Number} chatId - 会话ID
   * @returns {Promise<Object|null>} 报告对象或null
   */
  async checkReportStatus(type, chatId) {
    try {
      // 🔧 1. 优先从IndexedDB加载（更可靠，硬刷新后仍然存在）
      if (window.storageManager?.getReportByChatIdAndType) {
        const normalizedChatId = normalizeChatId(chatId);
        const report = await window.storageManager.getReportByChatIdAndType(normalizedChatId, type);

        if (report) {
          // 🔧 修复历史数据：已有内容但状态为空/idle，自动标记为 completed
          if ((!report.status || report.status === 'idle') && report.data) {
            const hasDocument =
              typeof report.data.document === 'string' && report.data.document.trim().length > 0;
            const hasChapters =
              Array.isArray(report.data.chapters) && report.data.chapters.length > 0;
            if (hasDocument || hasChapters) {
              report.status = 'completed';
              report.endTime = Date.now();
              const totalCount = Array.isArray(report.selectedChapters)
                ? report.selectedChapters.length
                : hasChapters
                  ? report.data.chapters.length
                  : 0;
              report.progress = {
                current: totalCount,
                total: totalCount,
                percentage: totalCount > 0 ? 100 : 0
              };
              await window.storageManager.saveReport({
                id: report.id,
                type: report.type,
                chatId: report.chatId,
                data: report.data ?? null,
                status: report.status,
                progress: report.progress,
                selectedChapters: report.selectedChapters,
                startTime: report.startTime,
                endTime: report.endTime,
                error: report.error ?? null
              });
            }
          }

          // 🔧 所有章节已完成但状态还是 generating，自动切换为 completed
          if (
            report.status === 'generating' &&
            Array.isArray(report.data?.chapters) &&
            report.selectedChapters
          ) {
            const completedCount = report.data.chapters.length;
            const totalCount = report.selectedChapters.length;
            if (completedCount === totalCount && completedCount > 0) {
              report.status = 'completed';
              report.endTime = Date.now();
              report.progress = {
                current: totalCount,
                total: totalCount,
                percentage: 100
              };
              await window.storageManager.saveReport({
                id: report.id,
                type: report.type,
                chatId: report.chatId,
                data: report.data ?? null,
                status: report.status,
                progress: report.progress,
                selectedChapters: report.selectedChapters,
                startTime: report.startTime,
                endTime: report.endTime,
                error: null
              });
            }
          }

          // 🔧 兼容历史数据：未保存 selectedChapters 但已有完整内容
          if (report.status === 'generating' && report.data && !report.selectedChapters) {
            let totalCount = 0;
            if (Array.isArray(report.data.chapters)) {
              totalCount = report.data.chapters.length;
            } else if (report.data.document && typeof report.data.document === 'object') {
              totalCount = Object.keys(report.data.document).length;
            }
            if (totalCount > 0) {
              report.status = 'completed';
              report.endTime = Date.now();
              report.progress = {
                current: totalCount,
                total: totalCount,
                percentage: 100
              };
              await window.storageManager.saveReport({
                id: report.id,
                type: report.type,
                chatId: report.chatId,
                data: report.data ?? null,
                status: report.status,
                progress: report.progress,
                selectedChapters: report.selectedChapters,
                startTime: report.startTime,
                endTime: report.endTime,
                error: null
              });
            }
          }

          // 🔧 生成中超时/异常检测，避免永久卡住
          if (report.status === 'generating') {
            const timeoutMs = 30 * 60 * 1000;
            const startTime = Number(report.startTime);
            const elapsed = Number.isFinite(startTime) ? Date.now() - startTime : NaN;
            const invalidStart = !Number.isFinite(startTime) || startTime <= 0;
            const isTimeout = Number.isFinite(elapsed) && elapsed > timeoutMs;

            if (invalidStart || isTimeout) {
              report.status = 'error';
              report.endTime = Date.now();
              report.error = {
                message: invalidStart ? '生成状态异常，请重试' : '生成超时，请重试',
                timestamp: Date.now()
              };
              await window.storageManager.saveReport({
                id: report.id,
                type: report.type,
                chatId: report.chatId,
                data: report.data ?? null,
                status: report.status,
                progress: report.progress,
                selectedChapters: report.selectedChapters,
                startTime: report.startTime,
                endTime: report.endTime,
                error: report.error
              });
              if (window.businessPlanGenerator?.updateButtonUI) {
                window.businessPlanGenerator.updateButtonUI(type, 'error');
              }
            }
          }

          logger.debug('[状态检查] 从IndexedDB获取状态', {
            type: report.type,
            status: report.status,
            hasData: Boolean(report.data),
            hasChapters: Boolean(report.data?.chapters),
            chaptersCount: report.data?.chapters?.length || 0
          });
          return report;
        }
      }

      // 2. 从内存状态检查（StateManager）- 作为备用
      if (window.stateManager?.getGenerationState) {
        const genState = window.stateManager.getGenerationState(chatId);
        if (genState && genState[type]) {
          logger.debug('[状态检查] 从内存获取状态', genState[type]);
          return genState[type];
        }
      }

      logger.debug('[状态检查] 未找到报告状态');
      return null;
    } catch (error) {
      console.error('[状态检查] 检查失败', error);
      return null;
    }
  }

  /**
   * 显示进度弹窗（恢复生成进度）
   * @param {String} type - 'business' | 'proposal'
   * @param {Object} report - 报告对象
   */
  async showProgress(type, report) {
    logger.debug('[显示进度] 恢复生成进度', {
      type,
      progress: report.progress,
      hasData: Boolean(report.data)
    });

    // 获取章节配置
    const config = this.chapterConfig[type];
    let selectedChapters = report.selectedChapters || config.core.map(ch => ch.id);
    if (window.StateValidator?.validateChapterIds) {
      const valid = window.StateValidator.validateChapterIds(
        type,
        selectedChapters,
        this.chapterConfig
      );
      if (!valid) {
        selectedChapters = window.StateValidator.fixChapterIds
          ? window.StateValidator.fixChapterIds(type, selectedChapters, this.chapterConfig) || []
          : [];
        if (!selectedChapters.length) {
          selectedChapters = config.core.map(ch => ch.id);
        }
        logger.warn('[显示进度] 章节ID与类型不匹配，已修正', { type, selectedChapters });
      }
    }

    // 打开进度弹窗 - 使用 show() 方法并传递章节ID数组
    if (this.progressManager) {
      try {
        await this.progressManager.show(
          selectedChapters,
          type,
          report.chatId || window.state?.currentChat || null
        );

        // 🔧 恢复进度显示 - 根据已完成的章节数据
        const completedChapters = report.data?.chapters || [];
        const completedIds = completedChapters.map(ch => ch.id || ch.chapterId);
        const progress = report.progress || {
          current: completedIds.length,
          total: selectedChapters.length,
          percentage: Math.round((completedIds.length / selectedChapters.length) * 100)
        };

        this.progressManager.updateOverallProgress(
          progress.percentage,
          `正在生成第 ${progress.current}/${progress.total} 个章节...`
        );

        // 🔧 恢复章节状态 - 根据实际完成情况
        selectedChapters.forEach((chapterId, index) => {
          const chapterInfo = [...config.core, ...config.optional].find(ch => ch.id === chapterId);
          if (chapterInfo) {
            let status = 'pending';
            if (completedIds.includes(chapterId)) {
              status = 'completed';
            } else if (index === completedIds.length) {
              status = 'working';
            }
            this.progressManager.updateProgress(chapterId, status, chapterInfo.title);
          }
        });

        logger.debug('[显示进度] 进度已恢复', {
          completedCount: completedIds.length,
          total: selectedChapters.length,
          percentage: progress.percentage
        });
      } catch (error) {
        console.error('[显示进度] 打开进度弹窗失败:', error);
        alert('无法显示进度弹窗，请刷新页面重试');
      }
    }
  }

  /**
   * 显示已完成的报告
   * @param {String} type - 'business' | 'proposal'
   * @param {Object} report - 报告对象
   */
  showCompletedReport(type, report) {
    logger.debug('[显示报告] 显示已完成报告', { type, hasData: Boolean(report.data) });

    // 检查数据完整性：支持 chapters（新格式）或 document（旧格式）
    if (!report.data || (!report.data.chapters && !report.data.document)) {
      console.error('[显示报告] 报告数据不完整', {
        hasData: Boolean(report.data),
        hasChapters: Boolean(report.data?.chapters),
        hasDocument: Boolean(report.data?.document)
      });
      alert('报告数据不完整，请重新生成');
      return;
    }

    // 使用 report-viewer 显示报告
    if (window.reportViewer) {
      window.reportViewer.viewGeneratedReport(type, report.data);
    } else {
      console.error('[显示报告] reportViewer 未初始化');
      alert('报告查看器未初始化，请刷新页面');
    }
  }

  /**
   * 显示章节选择模态框
   * @param {String} type - 'business' | 'proposal'
   */
  showChapterSelection(type) {
    logger.debug('[章节选择] 显示章节选择弹窗', { type, typeOf: typeof type });

    // 验证type参数
    if (!type || (type !== 'business' && type !== 'proposal')) {
      console.error('[章节选择] 无效的报告类型', { type });
      alert('系统错误：无效的报告类型');
      return;
    }

    const config = this.chapterConfig[type];
    if (!config) {
      console.error('[章节选择] 未找到配置', { type });
      return;
    }

    logger.debug('[章节选择] 配置信息', {
      type,
      coreCount: config.core.length,
      optionalCount: config.optional.length,
      totalCount: config.core.length + config.optional.length,
      coreChapters: config.core.map(ch => ch.title),
      optionalChapters: config.optional.map(ch => ch.title)
    });

    // 更新状态
    const chatId = window.state?.currentChat || null;
    if (!chatId) {
      console.warn('[章节选择] 没有当前会话ID');
    }

    // 渲染章节列表
    const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
    const chapterListHTML = this.renderChapterList(config);

    // 更新模态框内容
    window.modalManager.updateTitle('chapterSelectionModal', `选择需要生成的${typeTitle}章节`);
    window.modalManager.updateContent('chapterSelectionModal', '#chapterList', chapterListHTML);
    window.modalManager.updateContent(
      'chapterSelectionModal',
      '#chapterStats',
      this.getChapterStatsHTML(config.core.length, this.estimateTotalTime(config.core))
    );

    // 在模态框上设置报告类型数据属性
    const modal = document.getElementById('chapterSelectionModal');
    if (modal) {
      modal.dataset.reportType = type;
    }

    // 打开模态框
    window.modalManager.open('chapterSelectionModal');
  }

  /**
   * 渲染章节列表HTML
   * @param {Object} config - 章节配置
   * @returns {String} HTML字符串
   */
  renderChapterList(config) {
    const coreHTML = config.core
      .map(
        ch => `
            <label class="chapter-item disabled">
                <input type="checkbox" checked disabled data-chapter="${ch.id}">
                <div class="chapter-info">
                    <span class="chapter-name">${ch.title}</span>
                    <span class="chapter-desc">${ch.desc}</span>
                    <div>
                        <span class="badge">AI自动生成</span>
                    </div>
                </div>
            </label>
        `
      )
      .join('');

    const optionalHTML = config.optional
      .map(
        ch => `
            <label class="chapter-item">
                <input type="checkbox" data-chapter="${ch.id}" onchange="businessPlanGenerator.updateChapterStats()">
                <div class="chapter-info">
                    <span class="chapter-name">${ch.title}</span>
                    <span class="chapter-desc">${ch.desc}</span>
                    <div>
                        <span class="badge">可选</span>
                    </div>
                </div>
            </label>
        `
      )
      .join('');

    return `
            <div class="chapter-group">
                <h3>核心章节（必选）</h3>
                ${coreHTML}
            </div>
            <div class="chapter-group">
                <h3>深度分析章节（可选）</h3>
                ${optionalHTML}
            </div>
        `;
  }

  /**
   * 更新章节统计
   */
  updateChapterStats() {
    const checkboxes = document.querySelectorAll('#chapterList input[type="checkbox"]');
    let selected = 0;
    let totalTime = 0;

    checkboxes.forEach(cb => {
      if (cb.checked) {
        selected++;
        // 每个章节预估30-50秒
        totalTime += 40;
      }
    });

    const minutes = Math.ceil(totalTime / 60);
    const statsHTML = this.getChapterStatsHTML(selected, totalTime);

    const statsElement = document.getElementById('chapterStats');
    if (statsElement) {
      statsElement.innerHTML = statsHTML;
    }
  }

  /**
   * 获取章节统计HTML
   * @param {Number} count - 章节数量
   * @param {Number} time - 预计时间（秒）
   * @returns {String} HTML字符串
   */
  getChapterStatsHTML(count, time) {
    const minutes = Math.ceil(time / 60);
    return `已选 <strong style="color: var(--primary);">${count}</strong> 个章节，预计用时 <strong style="color: var(--primary);">${minutes}分钟</strong>`;
  }

  /**
   * 估算总时间
   * @param {Array} chapters - 章节数组
   * @returns {Number} 秒数
   */
  estimateTotalTime(chapters) {
    return chapters.length * 40; // 每个章节平均40秒
  }

  normalizeChapterIdsByType(type, chapterIds) {
    if (!Array.isArray(chapterIds)) {
      return [];
    }
    if (window.StateValidator?.validateChapterIds) {
      const valid = window.StateValidator.validateChapterIds(type, chapterIds, this.chapterConfig);
      if (valid) {
        return chapterIds;
      }
      const fixed = window.StateValidator.fixChapterIds
        ? window.StateValidator.fixChapterIds(type, chapterIds, this.chapterConfig) || []
        : [];
      if (fixed.length) {
        return fixed;
      }
    }
    return this.chapterConfig[type]?.core?.map(ch => ch.id) || [];
  }

  /**
   * 开始生成
   */
  async startGeneration() {
    // 获取选中的章节
    const checkboxes = document.querySelectorAll('#chapterList input[type="checkbox"]:checked');
    let selectedChapters = Array.from(checkboxes).map(cb => cb.dataset.chapter);

    if (selectedChapters.length === 0) {
      window.modalManager.alert('请至少选择一个章节', 'warning');
      return;
    }

    // 关闭选择模态框
    window.modalManager.close('chapterSelectionModal');

    // 获取当前报告类型 - 从模态框的数据属性获取
    const modal = document.getElementById('chapterSelectionModal');
    const type = modal?.dataset?.reportType || 'business';

    // 验证type参数
    if (type !== 'business' && type !== 'proposal') {
      console.error('[开始生成] 无效的报告类型', { type, typeOf: typeof type });
      alert('系统错误：无效的报告类型');
      return;
    }

    selectedChapters = this.normalizeChapterIdsByType(type, selectedChapters);
    logger.debug('[开始生成] 报告类型:', type, '选中章节:', selectedChapters);

    // 开始生成流程
    await this.generate(type, selectedChapters);
  }

  /**
   * 生成商业计划书/产品立项材料
   * @param {String} type - 报告类型
   * @param {Array} chapterIds - 章节ID数组
   */
  async generate(type, chapterIds) {
    // 获取当前会话ID，用于数据隔离（在 try 块外定义，以便 catch 块可以访问）
    const chatId = window.state?.currentChat || null;

    try {
      // 验证参数
      if (!type) {
        console.error('[生成] 缺少报告类型');
        if (window.modalManager) {
          window.modalManager.alert('生成失败：缺少报告类型', 'error');
        } else {
          alert('生成失败：缺少报告类型');
        }
        return;
      }

      if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
        console.error('[生成] 缺少章节ID');
        if (window.modalManager) {
          window.modalManager.alert('生成失败：请至少选择一个章节', 'error');
        } else {
          alert('生成失败：请至少选择一个章节');
        }
        return;
      }

      if (!chatId) {
        console.error('[生成] 缺少会话ID');
        if (window.modalManager) {
          window.modalManager.alert('生成失败：无法确定当前会话', 'error');
        } else {
          alert('生成失败：无法确定当前会话');
        }
        return;
      }

      logger.debug('[生成] 开始生成:', { type, chapterIds, chatId });

      // 🔧 校验章节ID与报告类型一致，避免错用章节列表导致进度卡住
      chapterIds = this.normalizeChapterIdsByType(type, chapterIds);

      // 检查是否有未完成的生成任务
      const existingState = this.state.getGenerationState(chatId);
      if (existingState && existingState[type]?.status === 'generating') {
        const progress = existingState[type].progress;
        const shouldResume = confirm(
          '检测到有未完成的生成任务。\n\n' +
            `进度: ${progress.current}/${progress.total}\n\n` +
            '是否继续之前的任务？\n\n' +
            '点击"确定"继续，点击"取消"重新开始'
        );

        if (shouldResume && progress.current > 0) {
          // 恢复之前的任务
          console.log('[生成] 恢复之前的生成任务');
          const resumeIndex = progress.current;
          const remainingChapters = chapterIds.slice(resumeIndex);

          // 显示进度弹窗
          await this.progressManager.show(chapterIds, type, chatId);

          // 恢复已完成章节的状态
          for (let i = 0; i < resumeIndex; i++) {
            this.progressManager.updateProgress(chapterIds[i], 'completed');
          }

          // 从断点继续生成（修改 chapterIds 和起始索引）
          // 注意：这里需要调整循环逻辑，暂时先重新开始
          console.log('[生成] 从第 ' + resumeIndex + ' 个章节继续');
        } else {
          // 重新开始
          console.log('[生成] 重新开始生成任务');
          this.state.resetGeneration(chatId, type);
        }
      }

      // 更新状态
      this.state.startGeneration(chatId, type, chapterIds);

      // 🔧 立即持久化初始状态到 IndexedDB（确保硬刷新后可恢复）
      await this.persistGenerationState(chatId, type, {
        status: 'generating',
        selectedChapters: chapterIds,
        progress: {
          current: 0,
          total: chapterIds.length,
          currentAgent: null,
          percentage: 0
        },
        startTime: Date.now(),
        endTime: null,
        error: null,
        data: {
          chapters: [],
          selectedChapters: chapterIds,
          totalTokens: 0,
          timestamp: Date.now()
        }
      });

      // 🔧 立即更新按钮状态为"生成中"
      this.updateButtonUI(type, 'generating');

      // 显示进度模态框，并等待DOM完全渲染
      await this.progressManager.show(chapterIds, type, chatId);

      // 额外等待，确保DOM完全渲染
      await this.sleep(100);

      this.markChapterWorking(chapterIds, 0);

      // 获取对话历史 - 优先从 window.state 获取（legacy state），然后从 stateManager 获取
      let conversation = null;

      // 1. 尝试从 window.state (legacy) 获取
      if (
        window.state &&
        Array.isArray(window.state.messages) &&
        window.state.messages.length > 0
      ) {
        conversation = window.state.messages.map(msg => ({ role: msg.role, content: msg.content }));
        logger.debug('[生成] 从 window.state 获取对话历史', { count: conversation.length });
      }

      // 2. 如果 legacy state 为空，尝试从 stateManager 获取
      if ((!conversation || conversation.length === 0) && this.state) {
        const stateManagerConversation = this.state.getConversationHistory();
        if (stateManagerConversation && stateManagerConversation.length > 0) {
          conversation = stateManagerConversation;
          logger.debug('[生成] 从 stateManager 获取对话历史', { count: conversation.length });
        }
      }

      if (!conversation || conversation.length === 0) {
        console.error('[生成] 缺少对话历史');
        throw new Error('缺少对话历史，请先完成至少一轮对话');
      }

      logger.debug('[生成] 开始生成章节', {
        type,
        chapterCount: chapterIds.length,
        conversationLength: conversation.length
      });

      // 打印对话历史的前3条和后3条，用于调试
      if (conversation.length > 0) {
        logger.debug('[生成] 对话历史示例（前3条）:', conversation.slice(0, 3));
        if (conversation.length > 3) {
          logger.debug('[生成] 对话历史示例（后3条）:', conversation.slice(-3));
        }
      }

      const chapters = [];
      const failedChapters = [];
      let totalTokens = 0;

      // 循环生成每个章节
      for (let i = 0; i < chapterIds.length; i++) {
        const chapterId = chapterIds[i];
        const chapterTitle = this.getChapterTitle(type, chapterId);

        try {
          console.log(`[生成] 开始生成章节 ${i + 1}/${chapterIds.length}: ${chapterId}`);

          // 验证章节ID有效性
          if (!chapterId) {
            throw new Error('无效的章节ID');
          }

          // 标记章节为工作中
          this.progressManager.updateProgress(chapterId, 'working');

          // 调用API生成章节
          const response = await this.api.request('/api/business-plan/generate-chapter', {
            method: 'POST',
            body: {
              chapterId,
              conversationHistory: conversation,
              type
            },
            timeout: 180000,
            retry: 1
          });

          // 验证响应
          if (!response || response.code !== 0 || !response.data) {
            throw new Error(response?.error || '生成失败，请稍后重试');
          }

          const chapter = {
            id: chapterId,
            chapterId,
            title: chapterTitle,
            content: response.data.content,
            agent: response.data.agent,
            emoji: response.data.emoji,
            tokens: response.data.tokens,
            timestamp: response.data.timestamp || Date.now()
          };

          // 验证章节数据完整性
          if (!chapter.content) {
            throw new Error(`章节 ${chapterId} 内容为空`);
          }

          console.log(`[生成] 章节 ${chapterId} 生成成功:`, chapter);

          chapters.push(chapter);
          totalTokens += response.data.tokens || 0;

          // 更新内存状态（触发 notify）
          this.state.updateProgress(chatId, type, chapter.agent, i + 1, chapter);

          // 更新UI进度
          this.progressManager.updateProgress(chapterId, 'completed', chapter);

          // 持久化当前进度
          const genState = this.state.getGenerationState(chatId);
          await this.persistGenerationState(chatId, type, {
            status: 'generating',
            selectedChapters: chapterIds,
            progress: genState[type].progress,
            startTime: genState[type].startTime,
            endTime: null,
            error: null,
            data: {
              chapters,
              selectedChapters: chapterIds,
              totalTokens,
              timestamp: Date.now()
            }
          });

          console.log(
            `[生成] 进度: ${i + 1}/${chapterIds.length} (${Math.round(((i + 1) / chapterIds.length) * 100)}%)`
          );
        } catch (error) {
          console.error(`[生成] 章节 ${chapterId} 生成失败:`, error);
          failedChapters.push({
            id: chapterId,
            title: chapterTitle,
            message: error.message || '生成失败'
          });

          // 标记章节为错误状态
          this.progressManager.updateProgress(chapterId, 'error');

          // 更新 StateManager 错误状态
          this.state.errorGeneration(chatId, type, error);

          // 持久化错误状态
          const genState = this.state.getGenerationState(chatId);
          await this.persistGenerationState(chatId, type, {
            status: 'error',
            selectedChapters: chapterIds,
            progress: genState[type].progress,
            startTime: genState[type].startTime,
            endTime: Date.now(),
            error: error.message,
            data: {
              chapters,
              selectedChapters: chapterIds,
              totalTokens,
              timestamp: Date.now()
            }
          });

          // 显示用户友好的错误提示
          const errorMessage = error.message || '生成失败';
          if (window.showToast) {
            window.showToast(`章节"${chapterTitle}"生成失败: ${errorMessage}`, 'error');
          }

          // 询问用户是否继续
          const shouldContinue = confirm(
            `章节"${chapterTitle}"生成失败。\n\n` +
              `错误: ${errorMessage}\n\n` +
              '是否继续生成剩余章节？'
          );

          if (!shouldContinue) {
            // 用户选择停止
            throw new Error('用户取消生成');
          }

          // 用户选择继续，跳过当前章节
          console.log(`[生成] 跳过失败的章节 ${chapterId}，继续生成`);
          continue;
        }
      }

      if (failedChapters.length > 0) {
        const failure = new Error(
          `有 ${failedChapters.length}/${chapterIds.length} 个章节生成失败`
        );
        failure.failedChapters = failedChapters;
        throw failure;
      }

      let costStats = null;
      try {
        const costResponse = await this.api.request('/api/business-plan/cost-stats', {
          method: 'GET'
        });
        if (costResponse && costResponse.code === 0) {
          costStats = costResponse.data;
        }
      } catch (error) {}

      // 完成生成
      const genState = this.state.getGenerationState(chatId);
      this.state.completeGeneration(chatId, type, {
        selectedChapters: chapterIds,
        chapters,
        totalTokens,
        costStats,
        timestamp: Date.now()
      });
      await this.persistGenerationState(chatId, type, {
        status: 'completed',
        selectedChapters: chapterIds,
        progress: genState[type].progress,
        startTime: genState[type].startTime,
        endTime: Date.now(),
        data: {
          chapters,
          selectedChapters: chapterIds,
          totalTokens,
          costStats,
          timestamp: Date.now()
        }
      });

      // 🔧 更新按钮状态为"已完成"
      this.updateButtonUI(type, 'completed');

      // 延迟关闭进度框，让用户看到完成状态
      await this.sleep(1000);

      // 检查用户是否在等待（进度弹窗是否可见）
      const progressModal = document.getElementById('agentProgressModal');
      const isUserWaiting = progressModal && progressModal.classList.contains('active');

      this.progressManager.close();

      // 只在用户主动等待时显示成功弹窗
      if (isUserWaiting) {
        window.modalManager.alert(
          `生成完成！共生成 ${chapterIds.length} 个章节，使用 ${totalTokens} tokens${costStats?.costString ? `，成本 ${costStats.costString}` : ''}`,
          'success'
        );
      }

      // 保存到存储
      await this.saveReport(type, {
        chapters,
        selectedChapters: chapterIds,
        totalTokens,
        costStats,
        timestamp: Date.now()
      });

      // 显示查看报告按钮
      this.showViewReportButton(type);
    } catch (error) {
      // 更新状态为错误
      const genState = this.state.getGenerationState(chatId);
      this.state.errorGeneration(chatId, type, error);
      await this.persistGenerationState(chatId, type, {
        status: 'error',
        selectedChapters: chapterIds,
        progress: genState[type].progress,
        endTime: Date.now(),
        error: {
          message: error.message,
          timestamp: Date.now()
        }
      });

      // 🔧 更新按钮状态为"错误"
      this.updateButtonUI(type, 'error');

      // 关闭进度框
      this.progressManager.close();

      // 显示错误提示
      const details =
        Array.isArray(error?.failedChapters) && error.failedChapters.length > 0
          ? '<br><br>失败章节：<br>' +
            error.failedChapters
              .map(
                item =>
                  `- ${this.escapeHtml(item.title || item.id)}：${this.escapeHtml(item.message || '')}`
              )
              .join('<br>')
          : '';
      if (window.modalManager) {
        window.modalManager.alert(`生成失败: ${this.escapeHtml(error.message)}${details}`, 'error');
      } else {
        alert(`生成失败: ${error.message}`);
      }
    }
  }

  /**
   * 获取章节标题
   * @param {String} type - 'business' | 'proposal'
   * @param {String} chapterId - 章节ID
   * @returns {String} 章节标题
   */
  getChapterTitle(type, chapterId) {
    const config = this.chapterConfig[type];
    if (!config) {
      return chapterId;
    }
    const allChapters = [...config.core, ...config.optional];
    const match = allChapters.find(ch => ch.id === chapterId);
    return match?.title || chapterId;
  }

  /**
   * 保存报告到存储
   * @param {String} type - 报告类型
   * @param {Object} data - 报告数据
   */
  async saveReport(type, data) {
    try {
      const chatId = window.state?.currentChat || null;
      // 统一转换为字符串，确保数据隔离
      const normalizedChatId = normalizeChatId(chatId);

      logger.debug('[保存报告] 开始保存:', {
        type,
        chatId: normalizedChatId,
        hasData: Boolean(data)
      });

      // 查找现有报告，使用相同的ID（避免创建重复记录）
      const reports = await window.storageManager.getReportsByChatId(normalizedChatId);
      const existing = reports.find(r => r.type === type);
      const reportId = existing?.id || `${type}-${Date.now()}`;

      logger.debug('[保存报告] 报告ID:', reportId, existing ? '(更新现有)' : '(创建新)');

      const genState = this.state.getGenerationState(normalizedChatId);
      const startTime = genState?.[type]?.startTime || Date.now();
      await window.storageManager.saveReport({
        id: reportId,
        type,
        data,
        chatId: normalizedChatId,
        status: 'completed',
        progress: {
          current: Array.isArray(data.selectedChapters) ? data.selectedChapters.length : 0,
          total: Array.isArray(data.selectedChapters) ? data.selectedChapters.length : 0,
          currentAgent: null,
          percentage: 100
        },
        selectedChapters: data.selectedChapters || [],
        startTime,
        endTime: Date.now(),
        error: null
      });

      // 清除报告状态缓存，确保UI显示最新状态
      if (window.reportStatusManager) {
        window.reportStatusManager.clearCache(normalizedChatId, type);
      }

      logger.debug('[保存报告] 保存成功');
    } catch (error) {
      console.error('[保存报告] 保存失败:', error);
    }
  }

  async persistGenerationState(chatId, type, updates) {
    try {
      if (!window.storageManager) {
        console.warn('[持久化状态] storageManager 未定义');
        return;
      }
      logger.debug('[持久化状态] chatId:', chatId, 'type:', type, 'status:', updates.status);

      if (!chatId) {
        console.warn('[持久化状态] chatId 为空');
        return;
      }
      const normalizedChatId = normalizeChatId(chatId);
      const reports = await window.storageManager.getReportsByChatId(normalizedChatId);
      const existing = reports.find(r => r.type === type);
      logger.debug('[持久化状态] 现有报告:', existing ? `存在(id: ${existing.id})` : '不存在');

      // 如果没有现有报告，生成新ID；否则使用现有ID
      const reportId = existing?.id || `${type}-${Date.now()}`;

      // 🔧 确保 data 字段不会被设置为 null
      // 如果 updates.data 未定义，使用现有数据或默认值
      let reportData;
      if (updates.data !== undefined) {
        reportData = updates.data;
      } else if (existing?.data) {
        reportData = existing.data;
      } else {
        // 默认值：空的报告结构
        reportData = {
          chapters: [],
          selectedChapters: updates.selectedChapters || existing?.selectedChapters || [],
          totalTokens: 0,
          timestamp: Date.now()
        };
      }

      const payload = {
        id: reportId,
        type,
        chatId: normalizedChatId,
        data: reportData,
        status: updates.status ?? existing?.status,
        progress: updates.progress ?? existing?.progress,
        selectedChapters: updates.selectedChapters ?? existing?.selectedChapters,
        startTime: updates.startTime ?? existing?.startTime,
        endTime: updates.endTime ?? existing?.endTime,
        error: updates.error ?? existing?.error
      };
      logger.debug('[持久化状态] 保存payload:', {
        id: payload.id,
        type: payload.type,
        chatId: payload.chatId,
        status: payload.status
      });

      await window.storageManager.saveReport(payload);

      // 清除报告状态缓存，确保UI显示最新状态
      if (
        window.reportStatusManager &&
        (updates.status === 'completed' || updates.status === 'error')
      ) {
        window.reportStatusManager.clearCache(normalizedChatId, type);
      }

      logger.debug('[持久化状态] 保存成功');
    } catch (error) {
      console.error('[持久化状态] 保存失败:', error);
    }
  }

  /**
   * 标记章节为工作中
   * @param {Array} chapterIds - 章节ID数组
   * @param {Number} index - 章节索引
   */
  markChapterWorking(chapterIds, index) {
    const chapterId = chapterIds[index];
    if (!chapterId) {
      console.warn('[markChapterWorking] Invalid chapter index:', index);
      return;
    }

    // 添加日志，便于调试
    logger.debug('[markChapterWorking] Marking chapter as working:', chapterId);

    // 更新进度（updateProgress 内部已有重试机制）
    this.progressManager.updateProgress(chapterId, 'working');
  }

  async restoreProgress(type, reportEntry) {
    const payload = reportEntry?.data || reportEntry || {};
    let chapterIds = payload.selectedChapters || reportEntry?.selectedChapters || [];
    if (window.StateValidator?.validateChapterIds) {
      const valid = window.StateValidator.validateChapterIds(type, chapterIds, this.chapterConfig);
      if (!valid) {
        chapterIds = window.StateValidator.fixChapterIds
          ? window.StateValidator.fixChapterIds(type, chapterIds, this.chapterConfig) || []
          : [];
        if (!chapterIds.length) {
          chapterIds = this.chapterConfig[type]?.core?.map(ch => ch.id) || [];
        }
        logger.warn('[恢复进度] 章节ID与类型不匹配，已修正', { type, chapterIds });
      }
    }

    if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
      console.warn('[恢复进度] 没有章节数据');
      return;
    }

    // 🔧 验证报告类型
    if (!window.StateValidator?.validateReportType(type)) {
      console.error('[恢复进度] 无效的报告类型:', type);
      return;
    }

    // 🔧 验证章节ID是否与类型匹配
    const isValid = window.StateValidator?.validateChapterIds(type, chapterIds, this.chapterConfig);
    if (!isValid) {
      console.warn('[恢复进度] 章节ID与报告类型不匹配，尝试修复');
      console.warn('[恢复进度] 原始章节ID:', chapterIds);
      console.warn('[恢复进度] 报告类型:', type);

      // 修复章节ID列表
      chapterIds = window.StateValidator?.fixChapterIds(type, chapterIds, this.chapterConfig) || [];

      if (chapterIds.length === 0) {
        console.error('[恢复进度] 无法修复章节ID，使用默认章节列表');
        chapterIds = window.StateValidator?.getDefaultChapterIds(type, this.chapterConfig) || [];
      }

      console.warn('[恢复进度] 修复后的章节ID:', chapterIds);

      // 更新存储中的章节列表
      await this.persistGenerationState(reportEntry.chatId, type, {
        ...payload,
        selectedChapters: chapterIds
      });
    }

    // 获取会话ID
    const chatId = reportEntry?.chatId || window.state?.currentChat || null;
    if (!chatId) {
      console.warn('[恢复进度] 缺少会话ID');
      return;
    }

    logger.debug('[恢复进度] 显示进度弹窗', { type, chapterIds, chatId, reportEntry });

    // 检查是否所有章节都已完成
    const completed = Array.isArray(payload.chapters)
      ? payload.chapters.map(ch => ch.chapterId)
      : [];
    const allCompleted = completed.length === chapterIds.length;

    if (allCompleted) {
      // 所有章节都已完成，但状态还是"generating"，说明状态没有正确更新
      logger.debug('[恢复进度] 所有章节已完成，更新状态为completed');
      this.state.completeGeneration(chatId, type, {
        selectedChapters: chapterIds,
        chapters: payload.chapters,
        totalTokens: payload.totalTokens || 0,
        costStats: payload.costStats,
        timestamp: Date.now()
      });

      // 更新持久化状态
      this.persistGenerationState(chatId, type, {
        status: 'completed',
        selectedChapters: chapterIds,
        progress: {
          current: chapterIds.length,
          total: chapterIds.length,
          currentAgent: null,
          percentage: 100
        },
        startTime: reportEntry.startTime,
        endTime: Date.now(),
        data: payload
      });

      // 不显示进度弹窗，直接显示完成提示
      window.modalManager.alert(`生成已完成！共生成 ${chapterIds.length} 个章节`, 'success');
      return;
    }

    // 显示进度弹窗
    await this.progressManager.show(chapterIds, type, chatId);

    // 更新各章节状态
    chapterIds.forEach((chapterId, idx) => {
      if (completed.includes(chapterId)) {
        this.progressManager.updateProgress(chapterId, 'completed');
      } else if (idx === completed.length) {
        this.progressManager.updateProgress(chapterId, 'working');
      } else {
        this.progressManager.updateProgress(chapterId, 'pending');
      }
    });

    // 更新整体进度
    const genState = this.state.getGenerationState(chatId);
    const progress = reportEntry?.progress || genState[type]?.progress;
    const completedCount = completed.length;
    const total = chapterIds.length;
    const percentage = progress?.percentage ?? Math.round((completedCount / total) * 100);
    this.progressManager.updateOverallProgress(percentage, completedCount, total);

    logger.debug('[恢复进度] 进度已恢复', { completedCount, total, percentage });
  }

  /**
   * 显示"查看报告"按钮
   * @param {String} type - 报告类型
   */
  showViewReportButton(type) {
    // 可以在聊天界面添加一个按钮，或者自动打开报告预览
    const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
    const chatId = window.state?.currentChat || null;
    const genState = chatId ? this.state.getGenerationState(chatId) : null;

    // 触发事件，让其他组件知道报告生成完成
    window.dispatchEvent(
      new CustomEvent('reportGenerated', {
        detail: { type, data: genState?.[type]?.results }
      })
    );
  }

  /**
   * 重新生成
   * 显示章节选择弹窗，让用户重新选择要生成的章节
   * @param {String} type - 可选，报告类型 'business' | 'proposal'
   */
  async regenerate(type) {
    logger.debug('[重新生成] 开始重新生成流程', { providedType: type });

    // 获取当前会话ID
    const chatId = window.state?.currentChat || null;
    if (!chatId) {
      console.error('[重新生成] 缺少会话ID');
      alert('生成失败：无法确定当前会话');
      return;
    }

    // 获取当前报告类型，优先使用传入的参数
    const reportType = type || window.currentReportType || 'business';

    logger.debug('[重新生成] 使用的报告类型', { reportType, chatId });

    // 验证类型是否有效
    if (!['business', 'proposal'].includes(reportType)) {
      console.error('[重新生成] 无效的报告类型:', reportType);
      alert('生成失败：无效的报告类型');
      return;
    }

    // 重置生成状态，清理之前的数据
    this.state.resetGeneration(chatId, reportType, false);

    // 清除 IndexedDB 中的旧报告数据
    if (window.storageManager) {
      try {
        await window.storageManager.deleteReportByType(chatId, reportType);
        logger.debug('[重新生成] 已清除IndexedDB中的旧报告数据', { chatId, reportType });
      } catch (error) {
        console.error('[重新生成] 清除旧报告数据失败:', error);
      }
    }

    // 更新 currentReportType
    if (window.currentReportType !== undefined) {
      window.currentReportType = reportType;
      logger.debug('[重新生成] 更新 currentReportType =', reportType);
    }

    // 显示章节选择弹窗，让用户重新选择章节
    this.showChapterSelection(reportType);
  }

  /**
   * 使用已选章节直接重新生成
   * @param {String} type - 可选，报告类型 'business' | 'proposal'
   */
  async regenerateWithSelectedChapters(type) {
    logger.debug('[重新生成-已选章节] 开始重新生成流程', { providedType: type });

    const chatId = window.state?.currentChat || null;
    if (!chatId) {
      console.error('[重新生成-已选章节] 缺少会话ID');
      alert('生成失败：无法确定当前会话');
      return;
    }

    const reportType = type || window.currentReportType || 'business';
    if (!['business', 'proposal'].includes(reportType)) {
      console.error('[重新生成-已选章节] 无效的报告类型:', reportType);
      alert('生成失败：无效的报告类型');
      return;
    }

    const selectedChapters = await this.resolveSelectedChapters(reportType, chatId);
    if (!Array.isArray(selectedChapters) || selectedChapters.length === 0) {
      window.modalManager?.alert('未找到已选章节，请重新选择章节', 'warning');
      this.showChapterSelection(reportType);
      return;
    }

    // 重置生成状态，清理之前的数据
    this.state.resetGeneration(chatId, reportType, false);

    // 清除 IndexedDB 中的旧报告数据
    if (window.storageManager) {
      try {
        await window.storageManager.deleteReportByType(chatId, reportType);
        logger.debug('[重新生成-已选章节] 已清除IndexedDB中的旧报告数据', { chatId, reportType });
      } catch (error) {
        console.error('[重新生成-已选章节] 清除旧报告数据失败:', error);
      }
    }

    if (window.currentReportType !== undefined) {
      window.currentReportType = reportType;
    }

    await this.generate(reportType, selectedChapters);
  }

  /**
   * 获取可用于重新生成的章节列表
   * @param {String} type - 报告类型
   * @param {String} chatId - 会话ID
   * @returns {Promise<Array>}
   */
  async resolveSelectedChapters(type, chatId) {
    let selected = [];

    if (window.storageManager && chatId) {
      try {
        const reportEntry = await window.storageManager.getReport(type, chatId);
        if (
          Array.isArray(reportEntry?.data?.selectedChapters) &&
          reportEntry.data.selectedChapters.length > 0
        ) {
          selected = reportEntry.data.selectedChapters;
        } else if (
          Array.isArray(reportEntry?.selectedChapters) &&
          reportEntry.selectedChapters.length > 0
        ) {
          selected = reportEntry.selectedChapters;
        } else if (
          Array.isArray(reportEntry?.data?.chapters) &&
          reportEntry.data.chapters.length > 0
        ) {
          selected = reportEntry.data.chapters.map(ch => ch.chapterId).filter(Boolean);
        }
      } catch (error) {
        console.warn('[重新生成-已选章节] 读取报告数据失败:', error);
      }
    }

    if (selected.length === 0 && chatId) {
      const genState = this.state.getGenerationState(chatId);
      if (
        Array.isArray(genState?.[type]?.selectedChapters) &&
        genState[type].selectedChapters.length > 0
      ) {
        selected = genState[type].selectedChapters;
      }
    }

    if (
      selected.length === 0 &&
      Array.isArray(window.currentGeneratedChapters) &&
      window.currentGeneratedChapters.length > 0
    ) {
      selected = window.currentGeneratedChapters;
    }

    if (
      window.StateValidator?.validateChapterIds &&
      !window.StateValidator.validateChapterIds(type, selected, this.chapterConfig)
    ) {
      selected = window.StateValidator.fixChapterIds
        ? window.StateValidator.fixChapterIds(type, selected, this.chapterConfig) || []
        : [];
    }

    if (selected.length === 0) {
      if (window.StateValidator?.getDefaultChapterIds) {
        selected = window.StateValidator.getDefaultChapterIds(type, this.chapterConfig) || [];
      } else {
        selected = this.chapterConfig[type]?.core?.map(ch => ch.id) || [];
      }
    }

    return selected;
  }

  /**
   * 更新按钮UI状态
   * @param {String} type - 报告类型
   * @param {String} status - 状态：'idle' | 'generating' | 'completed' | 'error'
   */
  updateButtonUI(type, status) {
    const btnMap = {
      business: 'businessPlanBtn',
      proposal: 'proposalBtn'
    };

    const btnId = btnMap[type];
    if (!btnId) {
      return;
    }

    const btn = document.getElementById(btnId);
    if (!btn) {
      console.warn('[updateButtonUI] 按钮不存在:', btnId);
      return;
    }

    const iconSpan = btn.querySelector('.btn-icon');
    const textSpan = btn.querySelector('.btn-text');

    // 移除所有状态类
    btn.classList.remove('btn-idle', 'btn-generating', 'btn-completed', 'btn-error');
    btn.disabled = false;

    // 根据状态更新按钮
    switch (status) {
      case 'idle':
        btn.classList.add('btn-idle');
        btn.dataset.status = 'idle';
        if (iconSpan) {
          iconSpan.textContent = type === 'business' ? '📊' : '📋';
        }
        if (textSpan) {
          textSpan.textContent = type === 'business' ? '商业计划书' : '产品立项材料';
        }
        break;

      case 'generating':
        btn.classList.add('btn-generating');
        btn.dataset.status = 'generating';
        btn.disabled = false; // 不禁用按钮，允许点击查看进度
        if (iconSpan) {
          iconSpan.textContent = '⏳';
        }
        if (textSpan) {
          textSpan.textContent = '生成中...';
        }
        break;

      case 'completed':
        btn.classList.add('btn-completed');
        btn.dataset.status = 'completed';
        if (iconSpan) {
          iconSpan.textContent = '✅';
        }
        if (textSpan) {
          textSpan.textContent =
            type === 'business' ? '商业计划书（查看）' : '产品立项材料（查看）';
        }
        break;

      case 'error':
        btn.classList.add('btn-error');
        btn.dataset.status = 'error';
        if (iconSpan) {
          iconSpan.textContent = '❌';
        }
        if (textSpan) {
          textSpan.textContent = '生成失败（重试）';
        }
        break;
    }

    logger.debug('[updateButtonUI] 按钮状态已更新:', { type, status, btnId });
  }

  /**
   * 睡眠函数
   * @param {Number} ms - 毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 简单的HTML转义，避免弹窗内容注入
   */
  escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 分享商业计划书
   */
  async shareReport() {
    try {
      const chatId = window.state?.currentChat;
      if (!chatId) {
        alert('无法获取当前会话ID');
        return;
      }

      // 获取当前报告类型
      const modal = document.getElementById('businessReportModal');
      const reportType = modal?.dataset?.reportType || 'business';

      // 从 IndexedDB 获取报告数据
      let reportData = null;
      if (window.storageManager) {
        const reportEntry = await window.storageManager.getReport(reportType, chatId);
        if (reportEntry && reportEntry.data) {
          reportData = reportEntry.data;
        }
      }

      if (!reportData) {
        alert('未找到报告数据，请先生成报告');
        return;
      }

      // 生成分享链接
      const shareUrl = `${window.location.origin}/share?chat=${chatId}&type=${reportType}`;

      // 复制到剪贴板
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert('✅ 分享链接已复制到剪贴板！\n\n' + shareUrl);
      } else {
        // 降级方案
        prompt('请复制以下分享链接：', shareUrl);
      }

      logger.debug('[分享报告] 成功', { chatId, reportType, shareUrl });
    } catch (error) {
      console.error('[分享报告] 失败:', error);
      alert(`分享失败：${error.message}`);
    }
  }

  /**
   * 导出商业计划书/立项材料为PDF
   * @param {String} type - 'business' | 'proposal'
   */
  async exportBusinessPlanPDF(type) {
    try {
      logger.debug('[PDF导出] 开始导出', { type });

      // 获取当前会话ID
      const chatId = window.state?.currentChat;
      if (!chatId) {
        alert('❌ 没有当前会话');
        return;
      }

      // 检查报告状态
      const report = await this.checkReportStatus(type, chatId);

      if (!report) {
        alert('❌ 未找到报告，请先生成报告');
        return;
      }

      if (report.status === 'generating') {
        alert('⚠️ 报告正在生成中，请等待生成完成后再导出');
        return;
      }

      if (report.status !== 'completed' || !report.data) {
        alert('❌ 报告数据不完整，请重新生成');
        return;
      }

      // 显示加载提示
      logger.debug('📄 正在生成PDF，请稍候...');

      // 准备章节数据（后端需要的格式）
      let chapters = [];

      // 支持两种数据格式
      if (report.data.chapters && Array.isArray(report.data.chapters)) {
        // 新格式：chapters 数组
        chapters = report.data.chapters.map(ch => ({
          id: ch.id || ch.chapterId,
          title: ch.title,
          content: ch.content
        }));
      } else if (report.data.document) {
        // 旧格式：document 对象
        const document = report.data.document;
        Object.keys(document).forEach(key => {
          const chapter = document[key];
          if (chapter && typeof chapter === 'object') {
            chapters.push({
              id: key,
              title: chapter.title || key,
              content: chapter.content || JSON.stringify(chapter, null, 2)
            });
          }
        });
      }

      if (chapters.length === 0) {
        alert('❌ 报告章节数据为空');
        return;
      }

      logger.debug('[PDF导出] 章节数据', { count: chapters.length, chapters });

      if (window.requireAuth) {
        const ok = await window.requireAuth({ redirect: true, prompt: true });
        if (!ok) {
          return;
        }
      }

      // 调用后端API生成PDF
      const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
      const authToken = window.getAuthToken ? window.getAuthToken() : null;
      const response = await fetch(`${window.state.settings.apiUrl}/api/pdf-export/business-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          chapters: chapters,
          title: typeTitle,
          type: type
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未授权，请重新登录');
        }
        const errorText = await response.text();
        console.error('[PDF导出] 后端错误', errorText);
        throw new Error(`PDF生成失败: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF生成失败');
      }

      // 下载PDF文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ThinkCraft_${typeTitle}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      logger.debug('[PDF导出] 导出成功');
      alert('✅ PDF导出成功！');
    } catch (error) {
      console.error('[PDF导出] 失败:', error);
      alert(`❌ PDF导出失败：${error.message}`);
    }
  }
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
  window.BusinessPlanGenerator = BusinessPlanGenerator;
}

// ✅ 暴露PDF导出函数到全局
window.exportBusinessReport = async function () {
  const modal = document.getElementById('businessReportModal');
  const type = modal?.dataset?.reportType || 'business';
  if (window.businessPlanGenerator) {
    await window.businessPlanGenerator.exportBusinessPlanPDF(type);
  } else {
    alert('❌ 系统未初始化，请刷新页面');
  }
};

logger.debug('✅ BusinessPlanGenerator 全局函数已暴露');
