/* eslint-disable no-undef */
/* global state, formatTime, generateChatId, autoResize, scrollToBottom, focusInput, lockAutoScroll, unlockAutoScroll, getDefaultIconSvg, getAgentIconSvg, buildIconSvg, resolveAgentIconKey, typeWriter, typeWriterWithCompletion, sendMessage, addMessage, handleAPIResponse, quickReply, isCurrentChatBusy, startNewChat, loadChats, renameChat, togglePinChat, deleteChat, clearAllHistory */

// ==================== 模块化说明 ====================
// ⭐ DOM操作函数已迁移到 utils/dom.js (autoResize, scrollToBottom等)
// ⭐ 图标相关函数已迁移到 utils/icons.js
// ⭐ 打字机效果已迁移到 modules/chat/typing-effect.js
// ⭐ 消息处理已迁移到 modules/chat/message-handler.js
// ⭐ 对话列表管理已迁移到 modules/chat/chat-list.js
// ⭐ 报告状态管理已迁移到 modules/state/state-manager.js
// ⭐ 设置管理已迁移到 modules/settings/settings-manager.js
// ⭐ 团队协作已迁移到 modules/team/team-collaboration.js

// ==================== 全局变量 ====================
let spaceHoldTimer = null;
let spaceHoldTriggered = false;
let isComposing = false;
const AUTO_SCROLL_BOTTOM_THRESHOLD = 100;
let saveDebounceTimer = null;
const generatedReports = new Map();
const DEBUG_STATE = true;
let currentGeneratedChapters = [];
let myAgents = [];
let availableAgentTypes = [];
let recognition = null;
let isRecording = false;

// ==================== 自动滚动辅助函数 ====================

/**
 * 判断容器是否接近底部
 * @param {HTMLElement} container - 滚动容器
 * @returns {boolean} 是否接近底部
 */
function isNearBottom(container) {
    return (container.scrollHeight - container.scrollTop - container.clientHeight) <= AUTO_SCROLL_BOTTOM_THRESHOLD;
}

/**
 * 初始化聊天自动滚动
 * 智能检测用户滚动行为，自动锁定/解锁滚动
 */
function initChatAutoScroll() {
    const container = document.getElementById('chatContainer');
    if (!container) return;

    // 初始化状态
    if (typeof state.autoScrollEnabled !== 'boolean') {
        state.autoScrollEnabled = true;
    }
    if (typeof state.autoScrollLocked !== 'boolean') {
        state.autoScrollLocked = false;
    }

    // 锁定自动滚动
    const lockAutoScroll = () => {
        state.autoScrollLocked = true;
        state.autoScrollEnabled = false;
        container.style.scrollBehavior = 'auto';
    };

    let lastScrollTop = container.scrollTop;
    state.autoScrollEnabled = isNearBottom(container);

    // 监听滚动事件
    container.addEventListener('scroll', () => {
        const currentTop = container.scrollTop;
        const scrolledUp = currentTop < lastScrollTop;

        if (scrolledUp) {
            lockAutoScroll();
        }
        if (isNearBottom(container)) {
            state.autoScrollLocked = false;
            state.autoScrollEnabled = true;
        } else {
            state.autoScrollEnabled = false;
        }

        lastScrollTop = currentTop;
        container.style.scrollBehavior = state.autoScrollLocked ? 'auto' : 'smooth';
    });

    // 监听鼠标滚轮
    container.addEventListener('wheel', () => {
        lockAutoScroll();
    }, { passive: true });

    // 监听触摸滚动
    let touchStartY = null;
    container.addEventListener('touchstart', (event) => {
        if (event.touches && event.touches.length) {
            touchStartY = event.touches[0].clientY;
        }
    }, { passive: true });

    container.addEventListener('touchmove', (event) => {
        if (touchStartY === null || !event.touches || !event.touches.length) return;
        const currentY = event.touches[0].clientY;
        if (currentY - touchStartY > 5) {
            lockAutoScroll();
        }
    }, { passive: true });

    // 监听键盘导航
    container.addEventListener('keydown', (event) => {
        if (event.key === 'PageUp' || event.key === 'Home' || event.key === 'ArrowUp') {
            lockAutoScroll();
        }
    });
}

// ==================== 事件监听器 ====================

// 页面关闭/刷新前自动保存当前对话
window.addEventListener('beforeunload', (e) => {
    if (state.messages.length > 0 && state.settings.saveHistory) {
        saveCurrentChat();
    }
});

// 点击页面其他地方关闭所有菜单
document.addEventListener('click', () => {
    document.querySelectorAll('.chat-item-menu').forEach(menu => {
        menu.classList.remove('active');
        restoreChatMenu(menu);
    });
    document.querySelectorAll('.chat-item.menu-open').forEach(item => {
        item.classList.remove('menu-open');
    });
});

// 滚动和窗口调整大小时关闭所有菜单
const chatHistory = document.querySelector('.chat-history');
if (chatHistory) {
    chatHistory.addEventListener('scroll', () => {
        document.querySelectorAll('.chat-item-menu').forEach(menu => {
            menu.classList.remove('active');
            restoreChatMenu(menu);
        });
        document.querySelectorAll('.chat-item.menu-open').forEach(item => {
            item.classList.remove('menu-open');
        });
    });
}

window.addEventListener('resize', () => {
    document.querySelectorAll('.chat-item-menu').forEach(menu => {
        menu.classList.remove('active');
        restoreChatMenu(menu);
    });
    document.querySelectorAll('.chat-item.menu-open').forEach(item => {
        item.classList.remove('menu-open');
    });
});

// 点击模态框外部关闭
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ==================== 响应式侧边栏自动管理 ====================

/**
 * 处理响应式侧边栏
 * 根据屏幕宽度自动显示/隐藏侧边栏
 */
function handleResponsiveSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');

    if (!sidebar || !menuToggle) return;

    const isOverlayMode = window.getComputedStyle(menuToggle).display !== 'none';

    // 在overlay模式下（移动端），默认隐藏侧边栏
    if (isOverlayMode) {
        sidebar.classList.remove('active');
    } else {
        // 在非overlay模式下（桌面端），默认显示侧边栏
        sidebar.classList.add('active');
    }
}

/**
 * 初始化聊天项长按手势
 */
function initChatItemLongPress() {
    // 长按手势已由device-detector.js处理
    // 这里保留空函数以保持兼容性
}

/**
 * 初始化分享卡片双击手势
 */
function initShareCardDoubleTap() {
    // 双击手势已由device-detector.js处理
    // 这里保留空函数以保持兼容性
}

/**
 * 初始化输入手势
 */
function initInputGestures() {
    // 输入手势已由input-handler.js处理
    // 这里保留空函数以保持兼容性
}

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResponsiveSidebar, 150);
});

// 页面DOM加载完成后尽早初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(handleResponsiveSidebar, 0);
});

// 页面完全加载后再次确认（防止样式延迟加载）
window.addEventListener('load', () => {
    handleResponsiveSidebar();
    // handleLaunchParams(); // 已移除，功能已整合到其他模块
    initChatAutoScroll();

    // 应用智能输入提示
    setTimeout(() => {
        applySmartInputHint();
    }, 500);

    // 移动端语音按钮初始化已移至 boot/init.js
    console.log('app-boot.js load 事件完成');
});

// 移动端遮罩点击关闭侧边栏
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');

    if (!sidebar || !menuToggle) return;

    const isOverlayMode = window.getComputedStyle(menuToggle).display !== 'none';
    const isSidebarOpen = sidebar.classList.contains('active');

    if (isOverlayMode && isSidebarOpen) {
        const clickedInsideSidebar = sidebar.contains(e.target);
        const clickedMenuToggle = menuToggle.contains(e.target);

        if (!clickedInsideSidebar && !clickedMenuToggle) {
            sidebar.classList.remove('active');
        }
    }
});

// 设备检测器就绪后初始化手势
window.addEventListener('deviceDetectorReady', () => {
    initChatItemLongPress();
    initShareCardDoubleTap();
    initInputGestures();
});

if (window.deviceDetector?.initialized) {
    initChatItemLongPress();
    initShareCardDoubleTap();
    initInputGestures();
}

// ==================== Service Worker注册 ====================
if ('serviceWorker' in navigator) {
    const isLocalDev =
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        (window.location.port === '5173' ||
            window.location.port === '3000' ||
            window.location.port === '8000' ||
            window.location.port === '8001');

    if (isLocalDev) {
        window.addEventListener('load', async () => {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
                const cacheKeys = await caches.keys();
                await Promise.all(cacheKeys.map(key => caches.delete(key)));
                console.info('[Service Worker] 已禁用并清理缓存（本地开发环境）');
            } catch (error) {
                console.warn('[Service Worker] 清理失败:', error);
            }
        });
    } else {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then((registration) => {
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // 新版本已安装，可以在这里显示更新提示UI
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('Service Worker注册失败:', error);
                });

            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SYNC_START') {
                    // 触发同步逻辑
                }
            });
        });
    }
}
