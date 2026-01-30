/**
 * 商业计划书生成器（前端）
 * 负责协调章节选择、API调用、进度展示
 */

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
            id: 'executive_summary',
            title: '执行摘要',
            desc: '业务概述、市场机会、解决方案、商业模式'
          },
          {
            id: 'market_analysis',
            title: '市场分析',
            desc: '市场规模、目标用户、痛点分析、市场趋势'
          },
          { id: 'solution', title: '解决方案', desc: '产品定位、核心功能、技术方案、差异化优势' },
          {
            id: 'business_model',
            title: '商业模式',
            desc: '收入模式、定价策略、成本结构、盈利预测'
          }
        ],
        optional: [
          {
            id: 'competitive_landscape',
            title: '竞争格局',
            desc: '竞争对手分析、差异化策略、进入壁垒'
          },
          {
            id: 'marketing_strategy',
            title: '市场策略',
            desc: '客户获取、营销渠道、品牌定位、增长策略'
          },
          {
            id: 'team_structure',
            title: '团队架构',
            desc: '核心团队、组织架构、人才需求、股权激励'
          },
          {
            id: 'financial_projection',
            title: '财务预测',
            desc: '收入预测、成本预算、现金流、融资需求'
          },
          {
            id: 'risk_assessment',
            title: '风险评估',
            desc: '市场风险、技术风险、运营风险、应对策略'
          },
          {
            id: 'implementation_plan',
            title: '实施计划',
            desc: '里程碑规划、产品开发、市场推广、KPI设定'
          },
          { id: 'appendix', title: '附录', desc: '术语表、参考资料、补充材料、联系方式' }
        ]
      },
      proposal: {
        core: [
          { id: 'project_summary', title: '项目摘要', desc: '项目背景、核心目标、预期成果' },
          { id: 'problem_insight', title: '问题洞察', desc: '用户痛点、市场需求、解决方案价值' },
          { id: 'product_solution', title: '产品方案', desc: '功能设计、技术选型、用户体验' },
          { id: 'implementation_path', title: '实施路径', desc: '开发计划、资源需求、时间节点' }
        ],
        optional: [
          { id: 'competitive_analysis', title: '竞品分析', desc: '竞品对比、差异化优势' },
          { id: 'budget_planning', title: '预算规划', desc: '开发成本、运营成本、ROI分析' },
          { id: 'risk_control', title: '风险控制', desc: '技术风险、进度风险、应对措施' }
        ]
      }
    };
  }

  /**
   * 显示章节选择模态框
   * @param {String} type - 'business' | 'proposal'
   */
  showChapterSelection(type) {
    console.log('[章节选择] 显示章节选择弹窗', { type });

    const config = this.chapterConfig[type];
    if (!config) {
      console.error('[章节选择] 未找到配置', { type });
      return;
    }

    console.log('[章节选择] 配置信息', {
      type,
      coreCount: config.core.length,
      optionalCount: config.optional.length,
      totalCount: config.core.length + config.optional.length,
      coreChapters: config.core.map(ch => ch.title),
      optionalChapters: config.optional.map(ch => ch.title)
    });

    // 更新状态
    const chatId = this.state.state.currentChat || window.state?.currentChat || null;
    if (chatId) {
      this.state.showChapterSelection(chatId, type);
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

  /**
   * 开始生成
   */
  async startGeneration() {
    // 获取选中的章节
    const checkboxes = document.querySelectorAll('#chapterList input[type="checkbox"]:checked');
    const selectedChapters = Array.from(checkboxes).map(cb => cb.dataset.chapter);

    if (selectedChapters.length === 0) {
      window.modalManager.alert('请至少选择一个章节', 'warning');
      return;
    }

    // 关闭选择模态框
    window.modalManager.close('chapterSelectionModal');

    // 获取当前报告类型 - 从模态框的数据属性获取
    const modal = document.getElementById('chapterSelectionModal');
    const type = modal?.dataset?.reportType || 'business';

    console.log('[开始生成] 报告类型:', type, '选中章节:', selectedChapters);

    // 开始生成流程
    await this.generate(type, selectedChapters);
  }

  /**
   * 生成商业计划书/产品立项材料
   * @param {String} type - 报告类型
   * @param {Array} chapterIds - 章节ID数组
   */
  async generate(type, chapterIds) {
    try {
      // 验证参数
      if (!type) {
        console.error('[生成] 缺少报告类型');
        alert('生成失败：缺少报告类型');
        return;
      }

      if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
        console.error('[生成] 缺少章节ID');
        alert('生成失败：请至少选择一个章节');
        return;
      }

      // 🔧 获取当前会话ID，用于数据隔离
      const chatId = this.state.state.currentChat || window.state?.currentChat || null;
      if (!chatId) {
        console.error('[生成] 缺少会话ID');
        alert('生成失败：无法确定当前会话');
        return;
      }

      console.log('[生成] 开始生成:', { type, chapterIds, chatId });

      // 更新状态
      this.state.startGeneration(chatId, type, chapterIds);
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
        error: null
      });

      // 🔧 立即更新按钮状态为"生成中"
      this.updateButtonUI(type, 'generating');

      // 显示进度模态框，并等待DOM完全渲染
      await this.progressManager.show(chapterIds);

      // 额外等待，确保DOM完全渲染
      await this.sleep(100);

      this.markChapterWorking(chapterIds, 0);

      // 获取对话历史 - 优先从 window.state 获取（legacy state），然后从 stateManager 获取
      let conversation = null;

      // 1. 尝试从 window.state (legacy) 获取
      if (window.state && Array.isArray(window.state.messages) && window.state.messages.length > 0) {
        conversation = window.state.messages.map(msg => ({ role: msg.role, content: msg.content }));
        console.log('[生成] 从 window.state 获取对话历史', { count: conversation.length });
      }

      // 2. 如果 legacy state 为空，尝试从 stateManager 获取
      if ((!conversation || conversation.length === 0) && this.state) {
        const stateManagerConversation = this.state.getConversationHistory();
        if (stateManagerConversation && stateManagerConversation.length > 0) {
          conversation = stateManagerConversation;
          console.log('[生成] 从 stateManager 获取对话历史', { count: conversation.length });
        }
      }

      if (!conversation || conversation.length === 0) {
        console.error('[生成] 缺少对话历史');
        throw new Error('缺少对话历史，请先完成至少一轮对话');
      }

      console.log('[生成] 开始生成章节', { type, chapterCount: chapterIds.length, conversationLength: conversation.length });

      // 打印对话历史的前3条和后3条，用于调试
      if (conversation.length > 0) {
        console.log('[生成] 对话历史示例（前3条）:', conversation.slice(0, 3));
        if (conversation.length > 3) {
          console.log('[生成] 对话历史示例（后3条）:', conversation.slice(-3));
        }
      }

      const chapters = [];
      let totalTokens = 0;
      for (let i = 0; i < chapterIds.length; i++) {
        const chapterId = chapterIds[i];
        const chapterTitle = this.getChapterTitle(type, chapterId);
        this.progressManager.updateProgress(chapterId, 'working');

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

        chapters.push(chapter);
        totalTokens += response.data.tokens || 0;

        this.state.updateProgress(chatId, type, chapter.agent, i + 1, chapter);
        this.progressManager.updateProgress(chapterId, 'completed', chapter);

        const genState = this.state.getGenerationState(chatId);
        await this.persistGenerationState(chatId, type, {
          status: 'generating',
          selectedChapters: chapterIds,
          progress: genState[type].progress,
          data: {
            chapters,
            selectedChapters: chapterIds,
            totalTokens,
            timestamp: Date.now()
          }
        });
      }

      let costStats = null;
      try {
        const costResponse = await this.api.request('/api/business-plan/cost-stats', { method: 'GET' });
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
      window.modalManager.alert(`生成失败: ${error.message}`, 'error');
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
    if (!config) return chapterId;
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
      const chatId = this.state.state.currentChat || window.state?.currentChat || null;
      // 统一转换为字符串，确保数据隔离
      const normalizedChatId = chatId ? String(chatId).trim() : null;

      console.log('[保存报告] 开始保存:', { type, chatId: normalizedChatId, hasData: !!data });

      // 查找现有报告，使用相同的ID（避免创建重复记录）
      const reports = await window.storageManager.getAllReports();
      const existing = reports.find(r => r.type === type && r.chatId === normalizedChatId);
      const reportId = existing?.id || `${type}-${Date.now()}`;

      console.log('[保存报告] 报告ID:', reportId, existing ? '(更新现有)' : '(创建新)');

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
        startTime: this.state.state.generation.startTime,
        endTime: Date.now(),
        error: null
      });

      console.log('[保存报告] 保存成功');
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
      console.log('[持久化状态] chatId:', chatId, 'type:', type, 'status:', updates.status);

      if (!chatId) {
        console.warn('[持久化状态] chatId 为空');
        return;
      }
      const reports = await window.storageManager.getAllReports();
      const existing = reports.find(r => r.type === type && r.chatId === String(chatId));
      console.log('[持久化状态] 现有报告:', existing ? `存在(id: ${existing.id})` : '不存在');

      // 如果没有现有报告，生成新ID；否则使用现有ID
      const reportId = existing?.id || `${type}-${Date.now()}`;

      const payload = {
        id: reportId,
        type,
        chatId,
        data: updates.data ?? existing?.data ?? null,
        status: updates.status ?? existing?.status,
        progress: updates.progress ?? existing?.progress,
        selectedChapters: updates.selectedChapters ?? existing?.selectedChapters,
        startTime: updates.startTime ?? existing?.startTime,
        endTime: updates.endTime ?? existing?.endTime,
        error: updates.error ?? existing?.error
      };
      console.log('[持久化状态] 保存payload:', { id: payload.id, type: payload.type, chatId: payload.chatId, status: payload.status });

      await window.storageManager.saveReport(payload);
      console.log('[持久化状态] 保存成功');
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
    console.log('[markChapterWorking] Marking chapter as working:', chapterId);

    // 更新进度（updateProgress 内部已有重试机制）
    this.progressManager.updateProgress(chapterId, 'working');
  }

  async restoreProgress(type, reportEntry) {
    const payload = reportEntry?.data || reportEntry || {};
    const chapterIds = payload.selectedChapters || reportEntry?.selectedChapters || [];
    if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
      console.warn('[恢复进度] 没有章节数据');
      return;
    }

    // 获取会话ID
    const chatId = reportEntry?.chatId || this.state.state.currentChat || window.state?.currentChat || null;
    if (!chatId) {
      console.warn('[恢复进度] 缺少会话ID');
      return;
    }

    console.log('[恢复进度] 显示进度弹窗', { type, chapterIds, chatId, reportEntry });

    // 检查是否所有章节都已完成
    const completed = Array.isArray(payload.chapters) ? payload.chapters.map(ch => ch.chapterId) : [];
    const allCompleted = completed.length === chapterIds.length;

    if (allCompleted) {
      // 所有章节都已完成，但状态还是"generating"，说明状态没有正确更新
      console.log('[恢复进度] 所有章节已完成，更新状态为completed');
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
      window.modalManager.alert(
        `生成已完成！共生成 ${chapterIds.length} 个章节`,
        'success'
      );
      return;
    }

    // 显示进度弹窗
    await this.progressManager.show(chapterIds);

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

    console.log('[恢复进度] 进度已恢复', { completedCount, total, percentage });
  }

  /**
   * 显示"查看报告"按钮
   * @param {String} type - 报告类型
   */
  showViewReportButton(type) {
    // 可以在聊天界面添加一个按钮，或者自动打开报告预览
    const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
    const chatId = this.state.state.currentChat || window.state?.currentChat || null;
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
    console.log('[重新生成] 开始重新生成流程', { providedType: type });

    // 获取当前会话ID
    const chatId = this.state.state.currentChat || window.state?.currentChat || null;
    if (!chatId) {
      console.error('[重新生成] 缺少会话ID');
      alert('生成失败：无法确定当前会话');
      return;
    }

    // 获取当前报告类型，优先使用传入的参数
    const reportType = type || window.currentReportType || 'business';

    console.log('[重新生成] 使用的报告类型', { reportType, chatId });

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
        console.log('[重新生成] 已清除IndexedDB中的旧报告数据', { chatId, reportType });
      } catch (error) {
        console.error('[重新生成] 清除旧报告数据失败:', error);
      }
    }

    // 更新 currentReportType
    if (window.currentReportType !== undefined) {
      window.currentReportType = reportType;
      console.log('[重新生成] 更新 currentReportType =', reportType);
    }

    // 显示章节选择弹窗，让用户重新选择章节
    this.showChapterSelection(reportType);
  }

  /**
   * 更新按钮UI状态
   * @param {String} type - 报告类型
   * @param {String} status - 状态：'idle' | 'generating' | 'completed' | 'error'
   */
  updateButtonUI(type, status) {
    const btnMap = {
      'business': 'businessPlanBtn',
      'proposal': 'proposalBtn'
    };

    const btnId = btnMap[type];
    if (!btnId) return;

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
        if (iconSpan) iconSpan.textContent = type === 'business' ? '📊' : '📋';
        if (textSpan) textSpan.textContent = type === 'business' ? '商业计划书' : '产品立项材料';
        break;

      case 'generating':
        btn.classList.add('btn-generating');
        btn.dataset.status = 'generating';
        btn.disabled = false; // 不禁用按钮，允许点击查看进度
        if (iconSpan) iconSpan.textContent = '⏳';
        if (textSpan) textSpan.textContent = '生成中...';
        break;

      case 'completed':
        btn.classList.add('btn-completed');
        btn.dataset.status = 'completed';
        if (iconSpan) iconSpan.textContent = '✅';
        if (textSpan) textSpan.textContent = type === 'business' ? '商业计划书（查看）' : '产品立项材料（查看）';
        break;

      case 'error':
        btn.classList.add('btn-error');
        btn.dataset.status = 'error';
        if (iconSpan) iconSpan.textContent = '❌';
        if (textSpan) textSpan.textContent = '生成失败（重试）';
        break;
    }

    console.log('[updateButtonUI] 按钮状态已更新:', { type, status, btnId });
  }

  /**
   * 睡眠函数
   * @param {Number} ms - 毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
  window.BusinessPlanGenerator = BusinessPlanGenerator;
}
