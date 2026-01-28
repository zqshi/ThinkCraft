/**
 * 商业计划书生成器（前端）
 * 负责协调章节选择、API调用、进度展示
 */

class BusinessPlanGenerator {
  constructor(apiClient, stateManager, agentProgressManager) {
    this.api = apiClient;
    this.state = stateManager;
    this.progressManager = agentProgressManager;

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
          { id: 'executive_summary', title: '项目摘要', desc: '项目背景、核心目标、预期成果' },
          { id: 'market_analysis', title: '问题洞察', desc: '用户痛点、市场需求、解决方案价值' },
          { id: 'solution', title: '产品方案', desc: '功能设计、技术选型、用户体验' },
          { id: 'implementation_plan', title: '实施路径', desc: '开发计划、资源需求、时间节点' }
        ],
        optional: [
          { id: 'competitive_landscape', title: '竞品分析', desc: '竞品对比、差异化优势' },
          { id: 'financial_projection', title: '预算规划', desc: '开发成本、运营成本、ROI分析' },
          { id: 'risk_assessment', title: '风险控制', desc: '技术风险、进度风险、应对措施' }
        ]
      }
    };
  }

  /**
   * 显示章节选择模态框
   * @param {String} type - 'business' | 'proposal'
   */
  showChapterSelection(type) {
    const config = this.chapterConfig[type];
    if (!config) {
      return;
    }

    // 更新状态
    this.state.showChapterSelection(type);

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

    // 开始生成流程
    const type = this.state.state.generation.type;
    await this.generate(type, selectedChapters);
  }

  /**
   * 生成商业计划书/产品立项材料
   * @param {String} type - 报告类型
   * @param {Array} chapterIds - 章节ID数组
   */
  async generate(type, chapterIds) {
    try {
      // 更新状态
      this.state.startGeneration(type, chapterIds);

      // 显示进度模态框
      this.progressManager.show(chapterIds);

      // 获取对话历史
      let conversation = this.state.getConversationHistory();
      if ((!conversation || conversation.length === 0) && window.state && Array.isArray(window.state.messages)) {
        conversation = window.state.messages.map(msg => ({ role: msg.role, content: msg.content }));
      }

      if (!conversation || conversation.length === 0) {
        throw new Error('缺少对话历史，请先完成至少一轮对话');
      }

      // 调用后端API使用完整文档提示词生成（真实注入对话）
      const normalizedChapterIds = chapterIds.map(id => id.replace(/_/g, '-'));
      const response = await this.api.request('/api/business-plan/generate-full', {
        method: 'POST',
        body: {
          chapterIds: normalizedChapterIds,
          conversationHistory: conversation,
          type
        },
        timeout: 240000,
        retry: 1
      });

      if (!response || response.code !== 0 || !response.data) {
        throw new Error(response?.error || '生成失败，请稍后重试');
      }

      const { document, tokens, costStats } = response.data;

      // 生成完成后统一更新进度（按所选章节数量）
      for (let i = 0; i < chapterIds.length; i++) {
        const chapterId = chapterIds[i];
        const chapterTitle = this.getChapterTitle(type, chapterId);
        const chapter = {
          id: chapterId,
          chapterId,
          title: chapterTitle,
          content: '',
          agent: 'AI文档生成'
        };
        this.state.updateProgress(chapter.agent, i + 1, chapter);
        this.progressManager.updateProgress(chapterId, 'completed', chapter);
      }

      // 完成生成
      this.state.completeGeneration({
        document,
        selectedChapters: chapterIds,
        totalTokens: tokens,
        costStats,
        timestamp: Date.now()
      });

      // 延迟关闭进度框，让用户看到完成状态
      await this.sleep(1000);
      this.progressManager.close();

      // 显示成功提示
      window.modalManager.alert(
        `生成完成！共生成 ${chapterIds.length} 个章节，使用 ${tokens} tokens，成本 ${costStats.costString}`,
        'success'
      );

      // 保存到存储
      await this.saveReport(type, {
        document,
        selectedChapters: chapterIds,
        totalTokens: tokens,
        costStats,
        timestamp: Date.now()
      });

      // 显示查看报告按钮
      this.showViewReportButton(type);
    } catch (error) {
      // 更新状态为错误
      this.state.errorGeneration(error);

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
      await window.storageManager.saveReport({
        id: `${type}-${Date.now()}`,
        type,
        data,
        chatId: this.state.state.currentChat
      });
    } catch (error) {}
  }

  /**
   * 显示"查看报告"按钮
   * @param {String} type - 报告类型
   */
  showViewReportButton(type) {
    // 可以在聊天界面添加一个按钮，或者自动打开报告预览
    const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
    // 触发事件，让其他组件知道报告生成完成
    window.dispatchEvent(
      new CustomEvent('reportGenerated', {
        detail: { type, data: this.state.state.generation.results }
      })
    );
  }

  /**
   * 重新生成
   */
  async regenerate() {
    const type = this.state.state.generation.type;
    const chapters = this.state.state.generation.selectedChapters;

    // 重置状态
    this.state.resetGeneration();

    // 重新生成
    await this.generate(type, chapters);
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
