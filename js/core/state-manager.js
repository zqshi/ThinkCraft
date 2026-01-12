/**
 * ThinkCraft 状态管理器
 * 统一管理应用状态，提供状态机模式管理生成流程
 */

class StateManager {
  constructor() {
    this.state = {
      // 对话状态
      currentChat: null,
      chats: [],
      messages: [],
      userData: {},
      conversationStep: 0,
      isTyping: false,
      isLoading: false,
      analysisCompleted: false,

      // 生成流程状态机（核心新增）
      generation: {
        type: null, // 'business-plan' | 'proposal' | 'demo' | null
        status: 'idle', // 'idle' | 'selecting' | 'generating' | 'completed' | 'error'
        selectedChapters: [],
        progress: {
          current: 0,
          total: 0,
          currentAgent: null,
          percentage: 0
        },
        results: {}, // { chapterId: { content, agent, timestamp } }
        error: null,
        startTime: null,
        endTime: null
      },

      // Demo生成状态
      demo: {
        type: null, // 'web' | 'app' | 'miniapp' | 'admin' | null
        status: 'idle',
        techStack: [],
        features: [],
        currentStep: null, // 'type-analysis' | 'prd' | 'architecture' | 'code' | 'test' | 'deploy'
        steps: [], // Agent执行步骤
        results: {
          analysis: null,
          prd: null,
          architecture: null,
          code: null,
          test: null,
          deploy: null
        },
        error: null
      },

      // 灵感收件箱状态（Phase 3新增）
      inspiration: {
        mode: 'full', // 'full' | 'quick' (快速捕捉模式)
        items: [], // 灵感列表
        currentEdit: null, // 当前编辑的灵感ID
        filter: 'unprocessed', // 'all' | 'unprocessed' | 'processing' | 'completed'
        autoSaveDelay: 2000, // 自动保存延迟（ms）
        lastSync: null, // 最后同步时间
        totalCount: 0, // 总数统计
        stats: {
          unprocessed: 0,
          processing: 0,
          completed: 0
        }
      },

      // 设置
      settings: {
        darkMode: false,
        saveHistory: true,
        apiUrl: 'http://localhost:3000'
      }
    };

    // 观察者列表
    this.listeners = [];

    // 从localStorage加载保存的设置
    this.loadSettings();
  }

  /**
   * 订阅状态变化
   * @param {Function} listener - 回调函数，接收state作为参数
   */
  subscribe(listener) {
    this.listeners.push(listener);
    // 立即执行一次，让监听器获取初始状态
    listener(this.state);
  }

  /**
   * 取消订阅
   * @param {Function} listener - 要移除的回调函数
   */
  unsubscribe(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器状态已变化
   */
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * 更新状态（通用方法）
   * @param {Object} updates - 要更新的状态片段
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  // ========== 对话管理方法 ==========

  setCurrentChat(chatId) {
    this.state.currentChat = chatId;
    this.notify();
  }

  setMessages(messages) {
    this.state.messages = messages;
    this.notify();
  }

  addMessage(message) {
    this.state.messages.push(message);
    this.notify();
  }

  setTyping(isTyping) {
    this.state.isTyping = isTyping;
    this.notify();
  }

  setLoading(isLoading) {
    this.state.isLoading = isLoading;
    this.notify();
  }

  setAnalysisCompleted(completed) {
    this.state.analysisCompleted = completed;
    this.notify();
  }

  // ========== 生成流程状态机方法 ==========

  /**
   * 开始生成流程
   * @param {String} type - 'business-plan' | 'proposal' | 'demo'
   * @param {Array} chapters - 选中的章节ID数组
   */
  startGeneration(type, chapters = []) {
    this.state.generation = {
      type,
      status: 'generating',
      selectedChapters: chapters,
      progress: {
        current: 0,
        total: chapters.length,
        currentAgent: null,
        percentage: 0
      },
      results: {},
      error: null,
      startTime: Date.now(),
      endTime: null
    };
    this.notify();
    console.log(`[StateManager] 开始生成 ${type}，共 ${chapters.length} 个章节`);
  }

  /**
   * 更新生成进度
   * @param {String} agentName - 当前工作的Agent名称
   * @param {Number} current - 已完成数量
   * @param {Object} result - 章节结果数据
   */
  updateProgress(agentName, current, result = null) {
    const total = this.state.generation.progress.total;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    this.state.generation.progress = {
      current,
      total,
      currentAgent: agentName,
      percentage
    };

    if (result) {
      this.state.generation.results[result.id || current] = {
        ...result,
        agent: agentName,
        timestamp: Date.now()
      };
    }

    this.notify();
    console.log(`[StateManager] 进度更新: ${current}/${total} (${percentage}%) - ${agentName}`);
  }

  /**
   * 完成生成流程
   * @param {Object} finalResults - 最终结果数据
   */
  completeGeneration(finalResults = null) {
    this.state.generation.status = 'completed';
    this.state.generation.endTime = Date.now();
    this.state.generation.progress.percentage = 100;

    if (finalResults) {
      this.state.generation.results = {
        ...this.state.generation.results,
        ...finalResults
      };
    }

    const duration = ((this.state.generation.endTime - this.state.generation.startTime) / 1000).toFixed(1);
    console.log(`[StateManager] 生成完成，耗时 ${duration} 秒`);

    this.notify();
  }

  /**
   * 生成流程出错
   * @param {Error} error - 错误对象
   */
  errorGeneration(error) {
    this.state.generation.status = 'error';
    this.state.generation.error = {
      message: error.message,
      timestamp: Date.now()
    };
    this.notify();
    console.error(`[StateManager] 生成失败:`, error);
  }

  /**
   * 重置生成状态（支持重新生成）
   */
  resetGeneration() {
    this.state.generation = {
      type: null,
      status: 'idle',
      selectedChapters: [],
      progress: {
        current: 0,
        total: 0,
        currentAgent: null,
        percentage: 0
      },
      results: {},
      error: null,
      startTime: null,
      endTime: null
    };
    this.notify();
    console.log(`[StateManager] 生成状态已重置`);
  }

  /**
   * 显示章节选择（状态转换）
   * @param {String} type - 'business-plan' | 'proposal'
   */
  showChapterSelection(type) {
    this.state.generation.type = type;
    this.state.generation.status = 'selecting';
    this.notify();
  }

  // ========== Demo生成状态机方法 ==========

  /**
   * 开始Demo生成流程
   */
  startDemoGeneration() {
    this.state.demo = {
      type: null,
      status: 'analyzing',
      techStack: [],
      features: [],
      currentStep: 'type-analysis',
      steps: [
        { id: 'type-analysis', name: '产品类型分析', status: 'working', agent: 'AI分析师' },
        { id: 'prd', name: 'PRD文档生成', status: 'pending', agent: '产品经理' },
        { id: 'architecture', name: '架构设计', status: 'pending', agent: '架构师' },
        { id: 'code', name: '代码生成', status: 'pending', agent: '前端工程师' },
        { id: 'test', name: '测试报告', status: 'pending', agent: '测试工程师' },
        { id: 'deploy', name: '部署配置', status: 'pending', agent: '部署工程师' }
      ],
      results: {},
      error: null
    };
    this.notify();
    console.log(`[StateManager] 开始Demo生成流程`);
  }

  /**
   * 更新Demo步骤状态
   * @param {String} stepId - 步骤ID
   * @param {String} status - 'pending' | 'working' | 'completed' | 'error'
   * @param {Object} result - 步骤结果数据
   */
  updateDemoStep(stepId, status, result = null) {
    const step = this.state.demo.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
    }

    this.state.demo.currentStep = stepId;
    this.state.demo.status = status === 'completed' ? 'generating' : status;

    if (result) {
      this.state.demo.results[stepId] = result;
    }

    this.notify();
    console.log(`[StateManager] Demo步骤更新: ${stepId} - ${status}`);
  }

  /**
   * 设置Demo类型分析结果
   * @param {Object} analysis - { type, techStack, features }
   */
  setDemoAnalysis(analysis) {
    this.state.demo.type = analysis.type;
    this.state.demo.techStack = analysis.techStack || [];
    this.state.demo.features = analysis.features || [];
    this.state.demo.results.analysis = analysis;
    this.updateDemoStep('type-analysis', 'completed', analysis);
  }

  /**
   * 完成Demo生成
   * @param {Object} finalCode - 最终代码
   */
  completeDemoGeneration(finalCode) {
    this.state.demo.status = 'completed';
    this.state.demo.results.code = finalCode;
    this.notify();
    console.log(`[StateManager] Demo生成完成`);
  }

  /**
   * Demo生成出错
   * @param {Error} error - 错误对象
   */
  errorDemoGeneration(error) {
    this.state.demo.status = 'error';
    this.state.demo.error = {
      message: error.message,
      timestamp: Date.now()
    };
    this.notify();
    console.error(`[StateManager] Demo生成失败:`, error);
  }

  /**
   * 重置Demo状态
   */
  resetDemo() {
    this.state.demo = {
      type: null,
      status: 'idle',
      techStack: [],
      features: [],
      currentStep: null,
      steps: [],
      results: {},
      error: null
    };
    this.notify();
  }

  // ========== 灵感收件箱管理方法（Phase 3新增） ==========

  /**
   * 添加新灵感
   * @param {Object} inspiration - { content, type, attachments }
   * @returns {Object} 创建的灵感对象
   */
  addInspiration(inspiration) {
    const item = {
      id: `inspiration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: inspiration.content,
      type: inspiration.type || 'text', // 'text' | 'voice' | 'image' | 'sketch'
      status: 'unprocessed', // 'unprocessed' | 'processing' | 'completed'
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: inspiration.tags || [],
      attachments: inspiration.attachments || [], // 图片/语音文件
      linkedChatId: null, // 关联的对话ID
      category: null, // AI分类结果
      priority: 0 // 优先级评分(0-5)
    };

    this.state.inspiration.items.unshift(item);
    this.state.inspiration.totalCount = this.state.inspiration.items.length;
    this.updateInspirationStats();
    this.notify();

    console.log(`[StateManager] 新增灵感: ${item.id}`);
    return item;
  }

  /**
   * 更新灵感
   * @param {String} id - 灵感ID
   * @param {Object} updates - 更新内容
   */
  updateInspiration(id, updates) {
    const item = this.state.inspiration.items.find(i => i.id === id);
    if (item) {
      Object.assign(item, updates, { updatedAt: Date.now() });
      this.updateInspirationStats();
      this.notify();
      console.log(`[StateManager] 更新灵感: ${id}`);
      return item;
    }
    console.warn(`[StateManager] 灵感不存在: ${id}`);
    return null;
  }

  /**
   * 删除灵感
   * @param {String} id - 灵感ID
   * @returns {Boolean} 是否删除成功
   */
  deleteInspiration(id) {
    const index = this.state.inspiration.items.findIndex(i => i.id === id);
    if (index > -1) {
      this.state.inspiration.items.splice(index, 1);
      this.state.inspiration.totalCount = this.state.inspiration.items.length;
      this.updateInspirationStats();
      this.notify();
      console.log(`[StateManager] 删除灵感: ${id}`);
      return true;
    }
    console.warn(`[StateManager] 灵感不存在: ${id}`);
    return false;
  }

  /**
   * 批量删除灵感
   * @param {Array} ids - 灵感ID数组
   * @returns {Number} 删除数量
   */
  deleteInspirations(ids) {
    let count = 0;
    ids.forEach(id => {
      if (this.deleteInspiration(id)) {
        count++;
      }
    });
    return count;
  }

  /**
   * 获取所有灵感
   * @returns {Array} 灵感列表
   */
  getInspirations() {
    return [...this.state.inspiration.items];
  }

  /**
   * 根据状态筛选灵感
   * @param {String} status - 'all' | 'unprocessed' | 'processing' | 'completed'
   * @returns {Array} 筛选后的灵感列表
   */
  getInspirationsByStatus(status) {
    if (status === 'all') {
      return this.getInspirations();
    }
    return this.state.inspiration.items.filter(i => i.status === status);
  }

  /**
   * 根据ID获取灵感
   * @param {String} id - 灵感ID
   * @returns {Object|null} 灵感对象
   */
  getInspirationById(id) {
    return this.state.inspiration.items.find(i => i.id === id) || null;
  }

  /**
   * 设置灵感过滤器
   * @param {String} filter - 'all' | 'unprocessed' | 'processing' | 'completed'
   */
  setInspirationFilter(filter) {
    this.state.inspiration.filter = filter;
    this.notify();
  }

  /**
   * 切换灵感模式
   * @param {String} mode - 'full' | 'quick'
   */
  setInspirationMode(mode) {
    this.state.inspiration.mode = mode;
    this.notify();
    console.log(`[StateManager] 灵感模式: ${mode}`);
  }

  /**
   * 展开灵感为完整对话
   * @param {String} inspirationId - 灵感ID
   * @returns {Boolean} 是否成功
   */
  expandToChat(inspirationId) {
    const inspiration = this.getInspirationById(inspirationId);
    if (!inspiration) {
      console.warn(`[StateManager] 灵感不存在: ${inspirationId}`);
      return false;
    }

    // 标记为处理中
    this.updateInspiration(inspirationId, {
      status: 'processing'
    });

    console.log(`[StateManager] 展开灵感为对话: ${inspirationId}`);
    return true;
  }

  /**
   * 更新灵感统计信息
   * @private
   */
  updateInspirationStats() {
    const stats = {
      unprocessed: 0,
      processing: 0,
      completed: 0
    };

    this.state.inspiration.items.forEach(item => {
      if (stats[item.status] !== undefined) {
        stats[item.status]++;
      }
    });

    this.state.inspiration.stats = stats;
  }

  /**
   * 加载灵感列表（从存储）
   * @param {Array} items - 灵感数组
   */
  loadInspirations(items) {
    this.state.inspiration.items = items || [];
    this.state.inspiration.totalCount = this.state.inspiration.items.length;
    this.updateInspirationStats();
    this.notify();
    console.log(`[StateManager] 加载 ${items.length} 条灵感`);
  }

  /**
   * 搜索灵感
   * @param {String} keyword - 搜索关键词
   * @returns {Array} 匹配的灵感列表
   */
  searchInspirations(keyword) {
    if (!keyword) return this.getInspirations();

    const lowerKeyword = keyword.toLowerCase();
    return this.state.inspiration.items.filter(item => {
      return item.content.toLowerCase().includes(lowerKeyword) ||
             item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword));
    });
  }

  /**
   * 标记灵感为已完成
   * @param {String} id - 灵感ID
   * @param {String} chatId - 关联的对话ID
   */
  completeInspiration(id, chatId = null) {
    return this.updateInspiration(id, {
      status: 'completed',
      linkedChatId: chatId
    });
  }

  // ========== 设置管理 ==========

  /**
   * 更新设置
   * @param {Object} updates - 设置更新
   */
  updateSettings(updates) {
    this.state.settings = { ...this.state.settings, ...updates };
    this.saveSettings();
    this.notify();
  }

  /**
   * 从localStorage加载设置
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('thinkcraft_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.state.settings = { ...this.state.settings, ...settings };
      }
    } catch (error) {
      console.error('[StateManager] 加载设置失败:', error);
    }
  }

  /**
   * 保存设置到localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('thinkcraft_settings', JSON.stringify(this.state.settings));
    } catch (error) {
      console.error('[StateManager] 保存设置失败:', error);
    }
  }

  // ========== 工具方法 ==========

  /**
   * 获取当前状态（只读）
   * @returns {Object} 当前状态的深拷贝
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 获取生成进度百分比
   * @returns {Number} 0-100
   */
  getGenerationProgress() {
    return this.state.generation.progress.percentage;
  }

  /**
   * 检查是否正在生成
   * @returns {Boolean}
   */
  isGenerating() {
    return this.state.generation.status === 'generating';
  }

  /**
   * 检查是否正在Demo生成
   * @returns {Boolean}
   */
  isDemoGenerating() {
    return this.state.demo.status !== 'idle' && this.state.demo.status !== 'completed';
  }

  /**
   * 获取当前对话历史（格式化为API调用格式）
   * @returns {Array} [{ role, content }, ...]
   */
  getConversationHistory() {
    return this.state.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * 调试：打印当前状态
   */
  debug() {
    console.log('===== ThinkCraft State =====');
    console.log('对话:', {
      currentChat: this.state.currentChat,
      messageCount: this.state.messages.length,
      isTyping: this.state.isTyping,
      isLoading: this.state.isLoading
    });
    console.log('生成:', this.state.generation);
    console.log('Demo:', this.state.demo);
    console.log('设置:', this.state.settings);
    console.log('============================');
  }
}

// 导出单例实例
if (typeof window !== 'undefined') {
  window.StateManager = StateManager;
  window.stateManager = new StateManager();
  console.log('[StateManager] 状态管理器已初始化');
}
