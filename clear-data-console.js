/**
 * ThinkCraft 数据清理脚本
 * 在浏览器控制台中执行此脚本以清理所有数据
 *
 * 使用方法：
 * 1. 打开 ThinkCraft 应用
 * 2. 按 F12 打开开发者工具
 * 3. 切换到 Console 标签
 * 4. 复制并粘贴此脚本
 * 5. 按 Enter 执行
 */

(async function clearAllData() {
    console.log('%c========================================', 'color: #667eea; font-weight: bold');
    console.log('%c  ThinkCraft 数据清理工具', 'color: #667eea; font-weight: bold; font-size: 16px');
    console.log('%c========================================', 'color: #667eea; font-weight: bold');
    console.log('');

    // 警告信息
    console.log('%c⚠️  警告：此操作不可逆！', 'color: #dc3545; font-weight: bold; font-size: 14px');
    console.log('%c清理后，所有数据将被永久删除，无法恢复。', 'color: #ffc107');
    console.log('');

    // 确认操作
    const confirmed = confirm('确定要清理所有数据吗？\n\n此操作将删除：\n- 所有对话数据\n- 所有报告数据\n- 所有项目数据\n- 所有灵感数据\n- 所有知识库数据\n- 所有本地存储\n- 所有浏览器缓存\n\n此操作不可逆！');

    if (!confirmed) {
        console.log('%c已取消清理操作', 'color: #6c757d');
        return;
    }

    console.log('');
    console.log('%c开始清理数据...', 'color: #0c5460; font-weight: bold');
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    // 1. 清理 IndexedDB
    try {
        console.log('%c[1/7] 清理 IndexedDB...', 'color: #0c5460');

        // 删除 ThinkCraftDB
        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase('ThinkCraftDB');
            request.onsuccess = () => {
                console.log('%c  ✓ IndexedDB 已清理', 'color: #28a745');
                successCount++;
                resolve();
            };
            request.onerror = () => {
                console.error('%c  ✗ IndexedDB 清理失败', 'color: #dc3545', request.error);
                errorCount++;
                reject(request.error);
            };
            request.onblocked = () => {
                console.warn('%c  ⚠ IndexedDB 被阻塞，请关闭其他标签页', 'color: #ffc107');
                reject(new Error('Database blocked'));
            };
        });
    } catch (error) {
        console.error('%c  ✗ IndexedDB 清理失败:', 'color: #dc3545', error);
        errorCount++;
    }

    // 2. 清理 localStorage
    try {
        console.log('%c[2/7] 清理 localStorage...', 'color: #0c5460');
        const localStorageKeys = Object.keys(localStorage);
        localStorage.clear();
        console.log('%c  ✓ localStorage 已清理 (' + localStorageKeys.length + ' 项)', 'color: #28a745');
        successCount++;
    } catch (error) {
        console.error('%c  ✗ localStorage 清理失败:', 'color: #dc3545', error);
        errorCount++;
    }

    // 3. 清理 sessionStorage
    try {
        console.log('%c[3/7] 清理 sessionStorage...', 'color: #0c5460');
        const sessionStorageKeys = Object.keys(sessionStorage);
        sessionStorage.clear();
        console.log('%c  ✓ sessionStorage 已清理 (' + sessionStorageKeys.length + ' 项)', 'color: #28a745');
        successCount++;
    } catch (error) {
        console.error('%c  ✗ sessionStorage 清理失败:', 'color: #dc3545', error);
        errorCount++;
    }

    // 4. 清理 Cache Storage
    try {
        console.log('%c[4/7] 清理 Cache Storage...', 'color: #0c5460');
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('%c  ✓ Cache Storage 已清理 (' + cacheNames.length + ' 个缓存)', 'color: #28a745');
            successCount++;
        } else {
            console.log('%c  ℹ Cache Storage 不可用', 'color: #6c757d');
        }
    } catch (error) {
        console.error('%c  ✗ Cache Storage 清理失败:', 'color: #dc3545', error);
        errorCount++;
    }

    // 5. 注销 Service Worker
    try {
        console.log('%c[5/7] 注销 Service Worker...', 'color: #0c5460');
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(registration => registration.unregister()));
            console.log('%c  ✓ Service Worker 已注销 (' + registrations.length + ' 个)', 'color: #28a745');
            successCount++;
        } else {
            console.log('%c  ℹ Service Worker 不可用', 'color: #6c757d');
        }
    } catch (error) {
        console.error('%c  ✗ Service Worker 注销失败:', 'color: #dc3545', error);
        errorCount++;
    }

    // 6. 清理 Cookies
    try {
        console.log('%c[6/7] 清理 Cookies...', 'color: #0c5460');
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        }
        console.log('%c  ✓ Cookies 已清理 (' + cookies.length + ' 个)', 'color: #28a745');
        successCount++;
    } catch (error) {
        console.error('%c  ✗ Cookies 清理失败:', 'color: #dc3545', error);
        errorCount++;
    }

    // 7. 清理全局状态
    try {
        console.log('%c[7/7] 清理全局状态...', 'color: #0c5460');
        if (window.state) {
            window.state.currentChat = null;
            window.state.chats = [];
            window.state.messages = [];
            window.state.generation = {};
            console.log('%c  ✓ 全局状态已清理', 'color: #28a745');
            successCount++;
        } else {
            console.log('%c  ℹ 全局状态不存在', 'color: #6c757d');
        }
    } catch (error) {
        console.error('%c  ✗ 全局状态清理失败:', 'color: #dc3545', error);
        errorCount++;
    }

    // 总结
    console.log('');
    console.log('%c========================================', 'color: #667eea; font-weight: bold');
    console.log('%c  清理完成', 'color: #667eea; font-weight: bold; font-size: 16px');
    console.log('%c========================================', 'color: #667eea; font-weight: bold');
    console.log('');
    console.log('%c成功: ' + successCount + ' 项', 'color: #28a745; font-weight: bold');
    if (errorCount > 0) {
        console.log('%c失败: ' + errorCount + ' 项', 'color: #dc3545; font-weight: bold');
    }
    console.log('');

    // 验证清理结果
    console.log('%c验证清理结果:', 'color: #0c5460; font-weight: bold');
    console.log('');

    // 检查 IndexedDB
    const dbs = await indexedDB.databases();
    const thinkCraftDB = dbs.find(db => db.name === 'ThinkCraftDB');
    if (thinkCraftDB) {
        console.log('%c  ⚠ IndexedDB 仍然存在（可能被阻塞）', 'color: #ffc107');
        console.log('%c    → 请关闭其他标签页后重试', 'color: #6c757d');
    } else {
        console.log('%c  ✓ IndexedDB 已完全删除', 'color: #28a745');
    }

    // 检查 localStorage
    if (Object.keys(localStorage).length === 0) {
        console.log('%c  ✓ localStorage 已清空', 'color: #28a745');
    } else {
        console.log('%c  ⚠ localStorage 仍有数据', 'color: #ffc107');
    }

    // 检查 Cache Storage
    if ('caches' in window) {
        const remainingCaches = await caches.keys();
        if (remainingCaches.length === 0) {
            console.log('%c  ✓ Cache Storage 已清空', 'color: #28a745');
        } else {
            console.log('%c  ⚠ Cache Storage 仍有缓存', 'color: #ffc107');
        }
    }

    console.log('');
    console.log('%c建议操作:', 'color: #0c5460; font-weight: bold');
    console.log('%c1. 刷新页面（Ctrl+Shift+R）', 'color: #6c757d');
    console.log('%c2. 检查应用是否恢复到初始状态', 'color: #6c757d');
    console.log('%c3. 如有问题，请清除浏览器缓存（Ctrl+Shift+Delete）', 'color: #6c757d');
    console.log('');

    // 询问是否刷新页面
    const shouldReload = confirm('清理完成！\n\n是否立即刷新页面？');
    if (shouldReload) {
        window.location.reload(true);
    }
})();
