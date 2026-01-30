// ThinkCraft Mock数据清理脚本
// 在ThinkCraft应用页面的浏览器控制台中执行此脚本

(async function cleanMockData() {
    console.log('%c🗑️ ThinkCraft Mock数据清理工具', 'font-size: 20px; color: #dc3545; font-weight: bold;');
    console.log('%c开始清理所有Mock数据...', 'font-size: 14px; color: #666;');
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    // 1. 清理 localStorage
    try {
        console.log('%c[1/7] 清理 localStorage...', 'color: #17a2b8;');
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            console.log(`  删除: ${key}`);
            localStorage.removeItem(key);
        });
        console.log(`%c✓ localStorage 已清空 (${keys.length} 项)`, 'color: #28a745;');
        successCount++;
    } catch (error) {
        console.error('✗ localStorage 清理失败:', error);
        errorCount++;
    }
    console.log('');

    // 2. 清理 sessionStorage
    try {
        console.log('%c[2/7] 清理 sessionStorage...', 'color: #17a2b8;');
        const count = Object.keys(sessionStorage).length;
        sessionStorage.clear();
        console.log(`%c✓ sessionStorage 已清空 (${count} 项)`, 'color: #28a745;');
        successCount++;
    } catch (error) {
        console.error('✗ sessionStorage 清理失败:', error);
        errorCount++;
    }
    console.log('');

    // 3. 清理 IndexedDB 数据
    try {
        console.log('%c[3/7] 清理 IndexedDB 数据...', 'color: #17a2b8;');
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('ThinkCraft', 7);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const stores = ['chats', 'reports', 'projects', 'inspirations', 'knowledge', 'artifacts', 'settings'];
        for (const storeName of stores) {
            try {
                await new Promise((resolve, reject) => {
                    const transaction = db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    request.onsuccess = () => {
                        console.log(`  清空: ${storeName}`);
                        resolve();
                    };
                    request.onerror = () => resolve(); // 忽略错误
                });
            } catch (error) {
                console.log(`  跳过: ${storeName} (不存在)`);
            }
        }

        db.close();
        console.log('%c✓ IndexedDB 数据已清空', 'color: #28a745;');
        successCount++;
    } catch (error) {
        console.error('✗ IndexedDB 清理失败:', error);
        errorCount++;
    }
    console.log('');

    // 4. 删除 IndexedDB 数据库
    try {
        console.log('%c[4/7] 删除 ThinkCraft 数据库...', 'color: #17a2b8;');
        await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase('ThinkCraft');
            request.onsuccess = () => {
                console.log('%c✓ ThinkCraft 数据库已删除', 'color: #28a745;');
                resolve();
            };
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
                console.warn('⚠ 数据库删除被阻止，请关闭其他ThinkCraft标签页');
                resolve();
            };
        });
        successCount++;
    } catch (error) {
        console.error('✗ 数据库删除失败:', error);
        errorCount++;
    }
    console.log('');

    // 5. 清理 Cookies
    try {
        console.log('%c[5/7] 清理 Cookies...', 'color: #17a2b8;');
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            console.log(`  删除: ${name}`);
        });
        console.log(`%c✓ Cookies 已清空 (${cookies.length} 项)`, 'color: #28a745;');
        successCount++;
    } catch (error) {
        console.error('✗ Cookies 清理失败:', error);
        errorCount++;
    }
    console.log('');

    // 6. 清理应用缓存
    try {
        console.log('%c[6/7] 清理应用缓存...', 'color: #17a2b8;');
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
                console.log(`  删除缓存: ${cacheName}`);
            }
            console.log(`%c✓ 应用缓存已清空 (${cacheNames.length} 项)`, 'color: #28a745;');
        } else {
            console.log('  跳过: 浏览器不支持 Cache API');
        }
        successCount++;
    } catch (error) {
        console.error('✗ 应用缓存清理失败:', error);
        errorCount++;
    }
    console.log('');

    // 7. 注销 Service Worker
    try {
        console.log('%c[7/7] 注销 Service Worker...', 'color: #17a2b8;');
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('  Service Worker 已注销');
            }
            console.log(`%c✓ Service Worker 已清理 (${registrations.length} 项)`, 'color: #28a745;');
        } else {
            console.log('  跳过: 浏览器不支持 Service Worker');
        }
        successCount++;
    } catch (error) {
        console.error('✗ Service Worker 清理失败:', error);
        errorCount++;
    }
    console.log('');

    // 总结
    console.log('%c========================================', 'color: #28a745;');
    console.log('%c✓ 清理完成！', 'font-size: 18px; color: #28a745; font-weight: bold;');
    console.log('%c========================================', 'color: #28a745;');
    console.log('');
    console.log(`成功: ${successCount} 项`);
    console.log(`失败: ${errorCount} 项`);
    console.log('');
    console.log('%c⚠️ 重要：请立即刷新页面！', 'font-size: 16px; color: #dc3545; font-weight: bold;');
    console.log('%cWindows/Linux: Ctrl+Shift+R', 'color: #666;');
    console.log('%cMac: Cmd+Shift+R', 'color: #666;');
    console.log('');

    // 询问是否刷新
    if (confirm('Mock数据已清除！\n\n是否立即刷新页面？')) {
        location.reload(true);
    }
})();
