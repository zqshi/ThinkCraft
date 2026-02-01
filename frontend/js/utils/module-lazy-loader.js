/**
 * 模块懒加载管理器
 *
 * 实现按需加载策略，减少初始加载体积，提升首屏性能
 *
 * 使用方式:
 * const module = await ModuleLazyLoader.load('reportGenerator');
 */

class ModuleLazyLoader {
  constructor() {
    // 模块缓存，避免重复加载
    this.moduleCache = new Map();

    // 模块加载状态
    this.loadingPromises = new Map();

    // 模块配置：定义模块路径和初始化方法
    this.moduleConfig = {
      // 报告生成系统（约1200行，按需加载）
      reportGenerator: {
        path: './modules/report/report-generator.js',
        className: 'ReportGenerator',
        dependencies: ['apiClient', 'stateManager'],
        priority: 'low' // 用户点击"生成报告"时才加载
      },
      reportViewer: {
        path: './modules/report/report-viewer.js',
        className: 'ReportViewer',
        dependencies: [],
        priority: 'low'
      },
      shareCard: {
        path: './modules/report/share-card.js',
        className: 'ShareCard',
        dependencies: [],
        priority: 'low'
      },
      businessPlanGenerator: {
        path: './modules/business-plan-generator.js',
        className: 'BusinessPlanGenerator',
        dependencies: ['apiClient', 'stateManager', 'agentProgressManager'],
        priority: 'low'
      },

      // Agent协作系统（约1500行，按需加载）
      agentCollaboration: {
        path: './modules/agent-collaboration.js',
        className: 'AgentCollaboration',
        dependencies: ['apiClient'],
        priority: 'low' // 用户点击"Agent管理"时才加载
      },

      // 项目管理系统（约1000行，按需加载）
      projectManager: {
        path: './modules/project-manager.js',
        className: 'ProjectManager',
        dependencies: ['apiClient'],
        priority: 'low' // 用户点击"项目"时才加载
      },

      // 知识库系统（约800行，按需加载）
      knowledgeBase: {
        path: './modules/knowledge-base.js',
        className: 'KnowledgeBase',
        dependencies: ['apiClient'],
        priority: 'low' // 用户点击"知识库"时才加载
      },

      // 输入处理器（约200行，高优先级，立即加载）
      inputHandler: {
        path: './modules/input-handler.js',
        className: 'InputHandler',
        dependencies: [],
        priority: 'high' // 用户可能立即使用语音/图片输入
      },

      // 新手引导（约370行，条件加载）
      onboardingManager: {
        path: './modules/onboarding/onboarding-manager.js',
        className: 'OnboardingManager',
        dependencies: [],
        priority: 'conditional', // 仅首次访问时加载
        condition: () => !localStorage.getItem('onboarding_completed')
      },

      // 设置管理器（按需加载）
      settingsManager: {
        path: './modules/settings/settings-manager.js',
        className: 'SettingsManager',
        dependencies: [],
        priority: 'low' // 用户点击"设置"时才加载
      },

      // 聊天系统（高优先级，立即加载）
      messageHandler: {
        path: './modules/chat/message-handler.js',
        className: 'MessageHandler',
        dependencies: ['apiClient'],
        priority: 'high'
      },
      chatList: {
        path: './modules/chat/chat-list.js',
        className: 'ChatList',
        dependencies: [],
        priority: 'high'
      }
    };
  }

  /**
   * 加载模块
   * @param {string} moduleName - 模块名称
   * @returns {Promise<any>} 模块实例
   */
  async load(moduleName) {
    // 1. 检查缓存
    if (this.moduleCache.has(moduleName)) {
      return this.moduleCache.get(moduleName);
    }

    // 2. 检查是否正在加载（避免重复加载）
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // 3. 获取模块配置
    const config = this.moduleConfig[moduleName];
    if (!config) {
      throw new Error(`未知的模块: ${moduleName}`);
    }

    // 4. 开始加载
    const loadingPromise = this._loadModule(moduleName, config);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const module = await loadingPromise;
      this.moduleCache.set(moduleName, module);
      return module;
    } finally {
      this.loadingPromises.delete(moduleName);
    }
  }

  /**
   * 内部加载方法
   * @private
   */
  async _loadModule(moduleName, config) {
    console.log(`[LazyLoader] 开始加载模块: ${moduleName}`);
    const startTime = performance.now();

    try {
      // 1. 动态导入模块
      const module = await import(config.path);

      // 2. 获取类构造函数
      const ModuleClass = module[config.className];
      if (!ModuleClass) {
        throw new Error(`模块 ${moduleName} 中未找到类 ${config.className}`);
      }

      // 3. 解析依赖
      const dependencies = this._resolveDependencies(config.dependencies);

      // 4. 实例化模块
      const instance = new ModuleClass(...dependencies);

      // 5. 初始化模块（如果有init方法）
      if (typeof instance.init === 'function') {
        await instance.init();
      }

      const loadTime = (performance.now() - startTime).toFixed(2);
      console.log(`[LazyLoader] 模块 ${moduleName} 加载完成，耗时: ${loadTime}ms`);

      return instance;
    } catch (error) {
      console.error(`[LazyLoader] 模块 ${moduleName} 加载失败:`, error);
      throw error;
    }
  }

  /**
   * 解析模块依赖
   * @private
   */
  _resolveDependencies(dependencies) {
    return dependencies.map(depName => {
      const dep = window[depName];
      if (!dep) {
        console.warn(`[LazyLoader] 依赖 ${depName} 未找到，使用null`);
      }
      return dep;
    });
  }

  /**
   * 预加载高优先级模块
   */
  async preloadHighPriority() {
    console.log('[LazyLoader] 开始预加载高优先级模块');

    const highPriorityModules = Object.entries(this.moduleConfig)
      .filter(([_, config]) => config.priority === 'high')
      .map(([name, _]) => name);

    await Promise.all(
      highPriorityModules.map(moduleName =>
        this.load(moduleName).catch(err => {
          console.error(`[LazyLoader] 预加载 ${moduleName} 失败:`, err);
        })
      )
    );

    console.log('[LazyLoader] 高优先级模块预加载完成');
  }

  /**
   * 预加载条件模块
   */
  async preloadConditional() {
    console.log('[LazyLoader] 检查条件模块');

    const conditionalModules = Object.entries(this.moduleConfig)
      .filter(([_, config]) => config.priority === 'conditional')
      .filter(([_, config]) => !config.condition || config.condition());

    for (const [moduleName, _] of conditionalModules) {
      await this.load(moduleName).catch(err => {
        console.error(`[LazyLoader] 条件加载 ${moduleName} 失败:`, err);
      });
    }
  }

  /**
   * 预加载所有模块（用于测试或特殊场景）
   */
  async preloadAll() {
    console.log('[LazyLoader] 开始预加载所有模块');

    const allModules = Object.keys(this.moduleConfig);

    await Promise.all(
      allModules.map(moduleName =>
        this.load(moduleName).catch(err => {
          console.error(`[LazyLoader] 预加载 ${moduleName} 失败:`, err);
        })
      )
    );

    console.log('[LazyLoader] 所有模块预加载完成');
  }

  /**
   * 获取模块加载统计
   */
  getStats() {
    return {
      totalModules: Object.keys(this.moduleConfig).length,
      loadedModules: this.moduleCache.size,
      loadingModules: this.loadingPromises.size,
      loadedModuleNames: Array.from(this.moduleCache.keys())
    };
  }

  /**
   * 清除模块缓存（用于热重载或测试）
   */
  clearCache(moduleName) {
    if (moduleName) {
      this.moduleCache.delete(moduleName);
      console.log(`[LazyLoader] 已清除模块缓存: ${moduleName}`);
    } else {
      this.moduleCache.clear();
      console.log('[LazyLoader] 已清除所有模块缓存');
    }
  }
}

// 创建全局单例
window.moduleLazyLoader = new ModuleLazyLoader();

/**
 * 全局桥接函数工厂
 * 自动创建懒加载的全局桥接函数
 */
function createLazyBridge(moduleName, methodName, globalFunctionName) {
  window[globalFunctionName] = async function (...args) {
    try {
      // 懒加载模块
      const module = await window.moduleLazyLoader.load(moduleName);

      // 调用方法
      if (typeof module[methodName] === 'function') {
        return module[methodName](...args);
      } else {
        console.error(`[LazyBridge] 方法 ${methodName} 在模块 ${moduleName} 中不存在`);
      }
    } catch (error) {
      console.error(`[LazyBridge] 调用 ${globalFunctionName} 失败:`, error);
    }
  };
}

// 创建懒加载的全局桥接函数
createLazyBridge('reportGenerator', 'exportFullReport', 'exportFullReport');
createLazyBridge('shareCard', 'generateShareLink', 'generateShareLink');
createLazyBridge('agentCollaboration', 'showAgentManagement', 'showAgentManagement');
createLazyBridge('agentCollaboration', 'initAgentSystem', 'initAgentSystem');
createLazyBridge('projectManager', 'createNewProject', 'createNewProject');
createLazyBridge('knowledgeBase', 'showKnowledgeBase', 'showKnowledgeBase');
createLazyBridge('inputHandler', 'handleVoice', 'handleVoice');
createLazyBridge('inputHandler', 'handleImageUpload', 'handleImageUpload');
createLazyBridge('onboardingManager', 'init', 'initOnboarding');

/**
 * 使用示例
 *
 * // 1. 在应用启动时预加载高优先级模块
 * await window.moduleLazyLoader.preloadHighPriority();
 *
 * // 2. 按需加载低优先级模块
 * document.getElementById('reportBtn').addEventListener('click', async () => {
 *   const reportGenerator = await window.moduleLazyLoader.load('reportGenerator');
 *   reportGenerator.exportFullReport();
 * });
 *
 * // 3. 使用全局桥接函数（自动懒加载）
 * window.exportFullReport(); // 第一次调用会自动加载模块
 *
 * // 4. 查看加载统计
 * console.log(window.moduleLazyLoader.getStats());
 */

export { ModuleLazyLoader, createLazyBridge };
