/**
 * 模块初始化脚本
 * 将 ES6 模块暴露到全局 window 对象，供非模块脚本使用
 */

console.log('[init-modules.js] 开始加载...');

try {
    // 1. 导入用户ID管理器（最优先加载）
    const userIdModule = await import('./infrastructure/UserIdManager.js');
    const { UserIdManager } = userIdModule;
    console.log('[init-modules.js] UserIdManager 模块导入成功');

    // 2. 立即初始化用户ID
    const USER_ID = UserIdManager.init();
    console.log('[初始化] ✅ 用户ID已初始化:', USER_ID);

    // 3. 暴露到全局
    window.UserIdManager = UserIdManager;
    window.USER_ID = USER_ID; // 向后兼容

    // 4. 导入环境配置和 API Client（必须在状态管理之前初始化）
    const envModule = await import('./config/env.js');
    const { ENV_CONFIG } = envModule;
    console.log('[init-modules.js] ENV_CONFIG 导入成功:', ENV_CONFIG);

    const apiClientModule = await import('./core/api-client.js');
    const { default: APIClient } = apiClientModule;
    console.log('[init-modules.js] APIClient 模块导入成功');

    // 初始化 API Client 实例
    window.APIClient = APIClient;
    window.apiClient = new APIClient(ENV_CONFIG.API_BASE_URL);
    window.apiClient.loadTokenFromStorage();
    console.log('[初始化] ✅ APIClient 已初始化，baseURL:', ENV_CONFIG.API_BASE_URL);

    // 5. 导入状态管理模块
    const stateModule = await import('./infrastructure/state/index.js');
    console.log('[init-modules.js] StateManager 模块导入成功:', stateModule);

    // 6. 导入存储管理模块
    const storageModule = await import('./infrastructure/storage/index.js');
    console.log('[init-modules.js] StorageManager 模块导入成功:', storageModule);

    // 7. 导入协同状态模块
    const collaborationStateModule = await import('./infrastructure/state/stores/CollaborationState.js');
    console.log('[init-modules.js] CollaborationState 模块导入成功');

    const { stateManager } = stateModule;
    const { storageManager } = storageModule;
    const { collaborationState } = collaborationStateModule;

    console.log('[init-modules.js] stateManager 实例:', stateManager);
    console.log('[init-modules.js] storageManager 实例:', storageManager);
    console.log('[init-modules.js] collaborationState 实例:', collaborationState);

    // 8. 暴露到全局对象
    window.stateManager = stateManager;
    window.storageManager = storageManager;
    window.collaborationState = collaborationState;

    console.log('[初始化] ✅ StateManager 已暴露到 window.stateManager');
    console.log('[初始化] ✅ StorageManager 已暴露到 window.storageManager');
    console.log('[初始化] ✅ CollaborationState 已暴露到 window.collaborationState');

    // 触发状态管理器就绪事件
    window.dispatchEvent(new CustomEvent('stateManagerReady'));
    console.log('[初始化] ✅ 触发 stateManagerReady 事件');

    // 初始化存储管理器
    window.storageManager.init().then(() => {
        console.log('[初始化] ✅ StorageManager 初始化完成');
        window.storageManager.ready = true;

        // 触发自定义事件，通知应用存储已就绪
        window.dispatchEvent(new CustomEvent('storageReady'));
        console.log('[初始化] ✅ 触发 storageReady 事件');
    }).catch(error => {
        console.error('[初始化] ❌ StorageManager 初始化失败:', error);
        alert('存储系统初始化失败: ' + error.message);
    });
} catch (error) {
    console.error('[init-modules.js] ❌ 模块加载失败:', error);
    console.error('[init-modules.js] 错误堆栈:', error.stack);
    alert('系统模块加载失败，请检查控制台错误信息: ' + error.message);
}
