/**
 * ThinkCraft 状态管理器
 * 统一管理应用状态，提供状态机模式管理生成流程
 */

class StateManager {
  constructor() {
    const defaultApiUrl = this.getDefaultApiUrl();
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
        type: null, // 'business-plan' | 'proposal' | null
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

      // 知识库状态（Phase 4新增）
      knowledge: {
        viewMode: 'project', // 'project' | 'global' | 'aggregated'
        currentProjectId: null, // 当前查看的项目ID
        organizationType: 'byProject', // 'byProject' | 'byType' | 'byTimeline' | 'byTags'
        selectedTags: [], // 选中的标签
        items: [], // 知识条目列表
        filter: {
          type: null, // 文档类型过滤
          projectId: null, // 项目过滤
          tags: [] // 标签过滤
        },
        searchKeyword: '', // 搜索关键词
        stats: {
          total: 0,
          byProject: {},
          byType: {},
          byTag: {}
        }
      },

      // 设置
      settings: {
        darkMode: false,
        saveHistory: true,
        apiUrl: defaultApiUrl
      }
    };

    // 观察者列表
    this.listeners = [];

    // 从localStorage加载保存的设置
    this.loadSettings();
  }

  getDefaultApiUrl() {
    if (window.location.hostname === 'localhost' && window.location.port === '8000') {
      return 'http://localhost:3000';
    }
    return window.location.origin;
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
   * @param {String} type - 'business-plan' | 'proposal'
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
      return item;
    }
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
      return true;
    }
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
    }

  /**
   * 展开灵感为完整对话
   * @param {String} inspirationId - 灵感ID
   * @returns {Boolean} 是否成功
   */
  expandToChat(inspirationId) {
    const inspiration = this.getInspirationById(inspirationId);
    if (!inspiration) {
      return false;
    }

    // 标记为处理中
    this.updateInspiration(inspirationId, {
      status: 'processing'
    });

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

  // ========== 知识库管理方法（Phase 4新增） ==========

  /**
   * 设置知识库视图模式
   * @param {String} mode - 'project' | 'global' | 'aggregated'
   */
  setKnowledgeViewMode(mode) {
    this.state.knowledge.viewMode = mode;
    this.notify();
    }

  /**
   * 设置知识库组织方式
   * @param {String} type - 'byProject' | 'byType' | 'byTimeline' | 'byTags'
   */
  setKnowledgeOrganization(type) {
    this.state.knowledge.organizationType = type;
    this.notify();
    }

  /**
   * 设置项目过滤
   * @param {String} projectId - 项目ID
   */
  setKnowledgeProjectFilter(projectId) {
    this.state.knowledge.currentProjectId = projectId;
    this.state.knowledge.filter.projectId = projectId;
    this.notify();
    }

  /**
   * 添加知识条目
   * @param {Object} item - 知识条目
   * @returns {Object} 添加的知识条目
   */
  addKnowledgeItem(item) {
    this.state.knowledge.items.unshift(item);
    this.updateKnowledgeStats();
    this.notify();
    return item;
  }

  /**
   * 更新知识条目
   * @param {String} id - 知识ID
   * @param {Object} updates - 更新内容
   * @returns {Object|null} 更新后的知识条目
   */
  updateKnowledgeItem(id, updates) {
    const item = this.state.knowledge.items.find(i => i.id === id);
    if (item) {
      Object.assign(item, updates, { updatedAt: Date.now() });
      this.updateKnowledgeStats();
      this.notify();
      return item;
    }
    return null;
  }

  /**
   * 删除知识条目
   * @param {String} id - 知识ID
   * @returns {Boolean} 是否删除成功
   */
  deleteKnowledgeItem(id) {
    const index = this.state.knowledge.items.findIndex(i => i.id === id);
    if (index > -1) {
      this.state.knowledge.items.splice(index, 1);
      this.updateKnowledgeStats();
      this.notify();
      return true;
    }
    return false;
  }

  /**
   * 加载知识条目列表
   * @param {Array} items - 知识条目数组
   */
  loadKnowledgeItems(items) {
    this.state.knowledge.items = items || [];
    this.updateKnowledgeStats();
    this.notify();
    }

  /**
   * 根据标签筛选知识
   * @param {Array} tags - 标签数组
   * @returns {Array} 筛选后的知识列表
   */
  filterKnowledgeByTags(tags) {
    if (!tags || tags.length === 0) {
      return this.state.knowledge.items;
    }

    return this.state.knowledge.items.filter(item => {
      return tags.some(tag => item.tags.includes(tag));
    });
  }

  /**
   * 搜索知识
   * @param {String} keyword - 搜索关键词
   * @returns {Array} 匹配的知识列表
   */
  searchKnowledgeItems(keyword) {
    if (!keyword) return this.state.knowledge.items;

    const lowerKeyword = keyword.toLowerCase();
    return this.state.knowledge.items.filter(item => {
      return item.title.toLowerCase().includes(lowerKeyword) ||
             item.content.toLowerCase().includes(lowerKeyword) ||
             item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword));
    });
  }

  /**
   * 设置搜索关键词
   * @param {String} keyword - 搜索关键词
   */
  setKnowledgeSearchKeyword(keyword) {
    this.state.knowledge.searchKeyword = keyword;
    this.notify();
  }

  /**
   * 设置知识类型过滤
   * @param {String} type - 文档类型
   */
  setKnowledgeTypeFilter(type) {
    this.state.knowledge.filter.type = type;
    this.notify();
  }

  /**
   * 设置知识标签过滤
   * @param {Array} tags - 标签数组
   */
  setKnowledgeTagsFilter(tags) {
    this.state.knowledge.filter.tags = tags;
    this.state.knowledge.selectedTags = tags;
    this.notify();
  }

  /**
   * 更新知识库统计信息
   * @private
   */
  updateKnowledgeStats() {
    const items = this.state.knowledge.items;
    const stats = {
      total: items.length,
      byProject: {},
      byType: {},
      byTag: {}
    };

    items.forEach(item => {
      // 按项目统计
      const projectId = item.projectId || 'global';
      stats.byProject[projectId] = (stats.byProject[projectId] || 0) + 1;

      // 按类型统计
      const type = item.type || 'other';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // 按标签统计
      item.tags.forEach(tag => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });
    });

    this.state.knowledge.stats = stats;
  }

  /**
   * 根据ID获取知识条目
   * @param {String} id - 知识ID
   * @returns {Object|null} 知识条目
   */
  getKnowledgeItemById(id) {
    return this.state.knowledge.items.find(i => i.id === id) || null;
  }

  /**
   * 获取当前筛选后的知识列表
   * @returns {Array} 筛选后的知识列表
   */
  getFilteredKnowledgeItems() {
    let items = this.state.knowledge.items;

    // 应用项目过滤
    if (this.state.knowledge.filter.projectId) {
      items = items.filter(i => i.projectId === this.state.knowledge.filter.projectId);
    }

    // 应用类型过滤
    if (this.state.knowledge.filter.type) {
      items = items.filter(i => i.type === this.state.knowledge.filter.type);
    }

    // 应用标签过滤
    if (this.state.knowledge.filter.tags.length > 0) {
      items = this.filterKnowledgeByTags(this.state.knowledge.filter.tags);
    }

    // 应用搜索过滤
    if (this.state.knowledge.searchKeyword) {
      const keyword = this.state.knowledge.searchKeyword.toLowerCase();
      items = items.filter(item => {
        return item.title.toLowerCase().includes(keyword) ||
               item.content.toLowerCase().includes(keyword) ||
               item.tags.some(tag => tag.toLowerCase().includes(keyword));
      });
    }

    return items;
  }

  /**
   * 重置知识库过滤条件
   */
  resetKnowledgeFilters() {
    this.state.knowledge.filter = {
      type: null,
      projectId: null,
      tags: []
    };
    this.state.knowledge.searchKeyword = '';
    this.state.knowledge.selectedTags = [];
    this.notify();
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
      }
  }

  /**
   * 保存设置到localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('thinkcraft_settings', JSON.stringify(this.state.settings));
    } catch (error) {
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
    }
}

// 导出单例实例
if (typeof window !== 'undefined') {
  window.StateManager = StateManager;
  window.stateManager = new StateManager();
  }
