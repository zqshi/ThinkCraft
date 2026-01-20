/**
 * ThinkCraft 工具函数模块
 * 提供通用的辅助函数
 */

/**
 * 自动调整textarea高度
 * @param {HTMLTextAreaElement} textarea
 */
export function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

/**
 * 滚动到底部
 */
export function scrollToBottom() {
    const container = document.getElementById('chatContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * 聚焦输入框
 */
export function focusInput() {
    const input = document.getElementById('mainInput');
    if (input) {
        input.focus();
    }
}

/**
 * 睡眠函数
 * @param {number} ms 毫秒数
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 复制文本到剪贴板
 * @param {string} text 要复制的文本
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('✅ 已复制到剪贴板！');
    } catch (err) {
        console.error('复制失败:', err);
        alert('❌ 复制失败，请手动复制');
    }
}

/**
 * 格式化日期时间
 * @param {Date|string} date 日期对象或ISO字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDateTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 格式化时间（仅小时:分钟）
 * @returns {string}
 */
export function formatTime() {
    return new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 生成唯一ID
 * @returns {string}
 */
export function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 添加日志到Demo日志面板
 * @param {string} message 日志消息
 */
export function addDemoLog(message) {
    const logsEl = document.getElementById('demoLogs');
    if (logsEl) {
        const logLine = document.createElement('div');
        logLine.textContent = message;
        logLine.style.marginBottom = '4px';
        logsEl.appendChild(logLine);
        // 自动滚动到底部
        logsEl.scrollTop = logsEl.scrollHeight;
    }
}

/**
 * 关闭所有聊天菜单
 */
export function closeAllChatMenus() {
    document.querySelectorAll('.chat-item-menu').forEach(menu => {
        menu.classList.remove('active');
        restoreChatMenu(menu);
    });
    document.querySelectorAll('.chat-item.menu-open').forEach(item => {
        item.classList.remove('menu-open');
    });
}

/**
 * 关闭指定的聊天菜单
 * @param {string} chatId 聊天ID
 */
export function closeChatMenu(chatId) {
    const menu = document.getElementById(`menu-${chatId}`);
    if (menu) {
        menu.classList.remove('active');
        restoreChatMenu(menu);
    }
    document.querySelectorAll('.chat-item.menu-open').forEach(item => {
        item.classList.remove('menu-open');
    });
}

function restoreChatMenu(menu) {
    const menuId = menu.id || '';
    const menuChatId = menu.dataset.chatId || (menuId.startsWith('menu-') ? menuId.slice(5) : '');
    if (!menuChatId) return;
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${menuChatId}"]`);
    const actions = chatItem ? chatItem.querySelector('.chat-item-actions') : null;
    if (actions && menu.parentElement !== actions) {
        actions.appendChild(menu);
    } else if (!actions && menu.parentElement === document.body) {
        menu.remove();
    }
}

/**
 * 震动反馈（如果支持）
 * @param {number} duration 震动时长（毫秒）
 */
export function vibrate(duration = 30) {
    if (navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

/**
 * 检测是否为移动端
 * @returns {boolean}
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 获取文件扩展名
 * @param {string} filename 文件名
 * @returns {string} 扩展名（小写）
 */
export function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
}

/**
 * 截断文本
 * @param {string} text 原文本
 * @param {number} maxLength 最大长度
 * @param {string} suffix 后缀（默认"..."）
 * @returns {string}
 */
export function truncateText(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
}
