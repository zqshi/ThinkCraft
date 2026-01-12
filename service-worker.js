/**
 * ThinkCraft Service Worker
 * 提供离线缓存和后台同步功能
 * Version: 1.0.0
 */

const CACHE_VERSION = 'thinkcraft-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}`;

// 核心资源列表（优先缓存）
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/variables.css',
    '/css/main.css',
    '/js/core/state-manager.js',
    '/js/core/storage-manager.js',
    '/js/core/gesture-handler.js',
    '/js/core/device-detector.js',
    '/js/components/modal-manager.js',
    '/js/components/agent-progress.js'
];

// 离线后备页面
const OFFLINE_PAGE = '/offline.html';

// ==================== 安装事件 ====================
self.addEventListener('install', (event) => {
    console.log('[Service Worker] 安装中...', CACHE_VERSION);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] 缓存核心资源');
                return cache.addAll(CORE_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] 安装完成');
                return self.skipWaiting();  // 立即激活新的Service Worker
            })
            .catch((error) => {
                console.error('[Service Worker] 安装失败:', error);
            })
    );
});

// ==================== 激活事件 ====================
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] 激活中...');

    event.waitUntil(
        // 清理旧缓存
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] 删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] 激活完成');
                return self.clients.claim();  // 立即控制所有页面
            })
    );
});

// ==================== 请求拦截 ====================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 只处理同源GET请求
    if (request.method !== 'GET' || url.origin !== location.origin) {
        return;
    }

    // API请求：网络优先策略（Network First）
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // 静态资源：缓存优先策略（Cache First）
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // HTML页面：Stale-While-Revalidate策略
    if (request.destination === 'document' || url.pathname.endsWith('.html')) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // 其他请求：默认网络优先
    event.respondWith(networkFirst(request));
});

// ==================== 缓存策略 ====================

/**
 * Stale-While-Revalidate策略
 * 先返回缓存，同时后台更新
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // 后台更新缓存
    const fetchPromise = fetch(request)
        .then((response) => {
            if (response && response.status === 200) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch((error) => {
            console.warn('[Service Worker] 网络请求失败:', error);
            return null;
        });

    // 如果有缓存，立即返回缓存，否则等待网络请求
    return cachedResponse || fetchPromise || createOfflineResponse();
}

/**
 * 网络优先策略（Network First）
 * 适用于API请求和动态内容
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);

        // 缓存成功的响应
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.warn('[Service Worker] 网络请求失败，尝试缓存:', request.url);

        // 网络失败，尝试返回缓存
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // 缓存也没有，返回离线提示
        return createOfflineResponse();
    }
}

/**
 * 缓存优先策略（Cache First）
 * 适用于静态资源（CSS/JS/图片等）
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);

        // 缓存成功的响应
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[Service Worker] 资源加载失败:', request.url);
        return createOfflineResponse();
    }
}

// ==================== 辅助函数 ====================

/**
 * 判断是否为静态资源
 */
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.woff', '.woff2', '.ttf', '.eot'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * 创建离线响应
 */
function createOfflineResponse() {
    return new Response(
        JSON.stringify({
            offline: true,
            message: '当前离线，请稍后重试'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }
    );
}

// ==================== 后台同步 ====================
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] 后台同步触发:', event.tag);

    if (event.tag === 'sync-inspirations') {
        event.waitUntil(syncInspirations());
    }
});

/**
 * 同步灵感数据
 */
async function syncInspirations() {
    try {
        // 通知所有客户端开始同步
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_START'
            });
        });

        console.log('[Service Worker] 灵感同步完成');
    } catch (error) {
        console.error('[Service Worker] 同步失败:', error);
        throw error;  // 重试
    }
}

// ==================== 消息监听 ====================
self.addEventListener('message', (event) => {
    console.log('[Service Worker] 收到消息:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                console.log('[Service Worker] 缓存已清除');
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});

// ==================== 推送通知（未来扩展） ====================
self.addEventListener('push', (event) => {
    console.log('[Service Worker] 推送通知:', event);

    const data = event.data ? event.data.json() : {};
    const title = data.title || 'ThinkCraft';
    const options = {
        body: data.body || '您有新的消息',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        tag: data.tag || 'thinkcraft-notification',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] 通知点击:', event);

    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('[Service Worker] 脚本已加载', CACHE_VERSION);
