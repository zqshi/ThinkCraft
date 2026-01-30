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
      appendix: { name: '文档专家', emoji: '📎' },
      project_summary: { name: '产品经理', emoji: '📋' },
      problem_insight: { name: '用户研究专家', emoji: '🔍' },
      product_solution: { name: '产品设计专家', emoji: '💡' },
      implementation_path: { name: '项目管理专家', emoji: '🛤️' },
      competitive_analysis: { name: '竞品分析专家', emoji: '⚔️' },
      budget_planning: { name: '财务规划专家', emoji: '💰' },
      risk_control: { name: '风险管理专家', emoji: '⚠️' }
    };

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
    });
  }

  /**
   * 显示进度模态框
   * @param {Array} chapterIds - 章节ID数组
   * @returns {Promise} 返回Promise，确保DOM渲染完成
   */
  async show(chapterIds) {
    // 验证参数
    if (!chapterIds || !Array.isArray(chapterIds)) {
      console.error('[AgentProgressManager] 无效的章节ID列表:', chapterIds);
      throw new Error('无效的章节ID列表');
    }

    if (chapterIds.length === 0) {
      console.error('[AgentProgressManager] 章节ID列表为空');
      throw new Error('章节ID列表为空');
    }

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

    // 等待浏览器完成渲染
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
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
                <div class="agent-avatar ${spinClass}">${this.getAgentIconSvg(agent.emoji || agent.name, 28, 'agent-avatar-icon')}</div>
                <div class="agent-info">
                    <h4>${agent.name}</h4>
                    <p class="task">生成 ${this.getChapterTitle(agent.id)}</p>
                    <p class="status" id="status-${agent.id}">${agent.statusText}</p>
                </div>
            </div>
        `;
  }

  buildIconSvg(paths, size, className) {
    return `
            <svg class="${className}" width="${size}" height="${size}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${paths.map(d => `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/>`).join('')}
            </svg>
        `;
  }

  resolveAgentIconKey(key) {
    const value = String(key || '');
    if (/市场|📊/.test(value)) return 'chart';
    if (/技术|架构|工程|⚙️|👨‍💻|👩‍💻/.test(value)) return 'cog';
    if (/增长|营销|📈/.test(value)) return 'trend';
    if (/组织|团队|👥/.test(value)) return 'users';
    if (/财务|资金|💰|💵/.test(value)) return 'dollar';
    if (/风险|⚠️/.test(value)) return 'shield';
    if (/产品|创意|💡/.test(value)) return 'lightbulb';
    if (/项目|📋/.test(value)) return 'clipboard';
    if (/文档|📎/.test(value)) return 'document';
    if (/竞争|⚔️/.test(value)) return 'shield';
    if (/综合|🤖/.test(value)) return 'default';
    return 'default';
  }

  getAgentIconSvg(key, size = 28, className = 'agent-avatar-icon') {
    const iconKey = this.resolveAgentIconKey(key);
    const icons = {
      default: [
        'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
      ],
      lightbulb: [
        'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
      ],
      chart: [
        'M3 3v18h18',
        'M8 17V9',
        'M12 17V5',
        'M16 17v-7'
      ],
      cog: [
        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
      ],
      trend: [
        'M3 17l6-6 4 4 7-7',
        'M14 7h7v7'
      ],
      users: [
        'M16 7a4 4 0 11-8 0 4 4 0 018 0z',
        'M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
      ],
      dollar: [
        'M12 8c-2.761 0-5 1.343-5 3s2.239 3 5 3 5 1.343 5 3-2.239 3-5 3m0-12V6m0 12v2'
      ],
      shield: [
        'M12 3l7 4v5c0 5-3.5 9.5-7 11-3.5-1.5-7-6-7-11V7l7-4z'
      ],
      clipboard: [
        'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
      ],
      document: [
        'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
      ]
    };

    return this.buildIconSvg(icons[iconKey] || icons.default, size, className);
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
      appendix: '附录',
      project_summary: '项目摘要',
      problem_insight: '问题洞察',
      product_solution: '产品方案',
      implementation_path: '实施路径',
      competitive_analysis: '竞品分析',
      budget_planning: '预算规划',
      risk_control: '风险控制'
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
      console.warn('[AgentProgress] Agent not found:', chapterId);
      return;
    }

    // 更新状态
    agent.status = status;
    agent.statusText = this.getStatusText(status);

    // 使用重试机制更新DOM
    this._updateDOMWithRetry(chapterId, status, agent, 0);

    // 更新整体进度
    const completedCount = this.agents.filter(a => a.status === 'completed').length;
    const totalCount = this.agents.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    this.updateOverallProgress(percentage, completedCount, totalCount);

    // 移动端：只显示当前工作的Agent
    if (this.isMobile) {
      this.toggleMobileView(chapterId, status);
    }
  }

  /**
   * 使用重试机制更新DOM
   * @private
   */
  _updateDOMWithRetry(chapterId, status, agent, retryCount) {
    const maxRetries = 5;

    const agentElement = document.getElementById(`agent-${chapterId}`);
    const statusElement = document.getElementById(`status-${chapterId}`);

    if (agentElement && statusElement) {
      // DOM元素存在，执行更新
      agentElement.classList.remove('pending', 'working', 'completed');
      agentElement.classList.add(status);

      const avatar = agentElement.querySelector('.agent-avatar');
      if (avatar) {
        avatar.classList.toggle('spinning', status === 'working');
      }

      statusElement.textContent = agent.statusText;

      console.log('[AgentProgress] DOM updated successfully:', chapterId, status);
    } else if (retryCount < maxRetries) {
      // DOM元素不存在，使用 requestAnimationFrame 重试
      console.warn(`[AgentProgress] DOM not ready, retry ${retryCount + 1}/${maxRetries}:`, chapterId);
      requestAnimationFrame(() => {
        this._updateDOMWithRetry(chapterId, status, agent, retryCount + 1);
      });
    } else {
      // 达到最大重试次数
      console.error('[AgentProgress] Failed to update DOM after retries:', chapterId);
    }
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
  }

  /**
   * 取消生成
   */
  cancel() {
    this.modalManager.confirm('确定要取消生成吗？已生成的内容将丢失。', () => {
      // 关闭模态框
      this.close();

      // 重置状态
      if (window.stateManager) {
        window.stateManager.resetGeneration();
      }

      // 重置生成按钮状态
      if (typeof window.resetGenerationButtons === 'function') {
        window.resetGenerationButtons();
      }

      // 返回到报告页面
      const reportModal = document.getElementById('reportModal');
      if (reportModal && !reportModal.classList.contains('active')) {
        reportModal.classList.add('active');
      }
    });
  }

  /**
   * 显示错误
   * @param {String} chapterId - 章节ID
   * @param {Error} error - 错误对象
   */
  showError(chapterId, error) {
    const agent = this.agents.find(a => a.id === chapterId);
    if (!agent) {
      return;
    }

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
    if (this.isMobile) {
      return;
    }

    const agent = this.agents.find(a => a.id === chapterId);
    if (!agent || agent.status !== 'completed') {
      return;
    }

    // 显示章节内容预览
    // 这里可以扩展为显示完整的章节内容
  }

  /**
   * 恢复进度弹窗（会话切换回来时）
   * @param {string} chatId - 会话ID
   * @param {string} type - 报告类型
   * @returns {Promise<boolean>} 是否成功恢复
   */
  async restore(chatId, type) {
    try {
      console.log('[AgentProgress] 尝试恢复进度弹窗:', { chatId, type });

      // 从StateManager获取生成状态
      const genState = window.stateManager?.getGenerationState?.(chatId);
      if (!genState || !genState[type] || genState[type].status !== 'generating') {
        console.log('[AgentProgress] 无需恢复，状态不是generating');
        return false;
      }

      const state = genState[type];
      const chapterIds = state.selectedChapters || [];

      if (chapterIds.length === 0) {
        console.warn('[AgentProgress] 无章节列表，无法恢复');
        return false;
      }

      // 显示进度弹窗
      await this.show(chapterIds);

      // 恢复每个章节的状态
      const progress = state.progress || {};
      const currentIndex = progress.current || 0;

      chapterIds.forEach((chapterId, index) => {
        if (index < currentIndex) {
          // 已完成的章节
          this.updateProgress(chapterId, 'completed');
        } else if (index === currentIndex) {
          // 当前正在生成的章节
          this.updateProgress(chapterId, 'working');
        }
        // 其他章节保持pending状态
      });

      console.log('[AgentProgress] 进度弹窗恢复成功');
      return true;
    } catch (error) {
      console.error('[AgentProgress] 恢复进度弹窗失败:', error);
      return false;
    }
  }
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
  window.AgentProgressManager = AgentProgressManager;
}
