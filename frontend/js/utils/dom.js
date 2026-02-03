/**
 * DOM操作工具函数
 * 提供常用的DOM操作和UI交互功能
 */

/* eslint-disable no-unused-vars, no-undef */

/**
 * 自动调整textarea高度
 * @param {HTMLTextAreaElement} textarea - 文本输入框元素
 */
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    updateMobileChatOffset();
}

/**
 * 滚动到聊天容器底部
 * @param {boolean} force - 是否强制滚动（忽略锁定状态）
 */
function scrollToBottom(force = false) {
    const container = document.getElementById('chatContainer');
    if (!container) return;

    // 从全局state获取滚动状态
    if (!force && (state.autoScrollLocked || !state.autoScrollEnabled)) return;

    updateMobileChatOffset();
    container.scrollTop = container.scrollHeight;
}

/**
 * 更新移动端聊天容器底部安全间距，避免内容被输入区遮挡
 */
function updateMobileChatOffset() {
    const container = document.getElementById('chatContainer');
    if (!container) return;

    const isMobile = document.body.classList.contains('mobile') || window.innerWidth <= 640;
    if (!isMobile) {
        container.style.removeProperty('--input-offset');
        return;
    }

    const inputContainer = document.getElementById('inputContainer');
    const isInputVisible = inputContainer && window.getComputedStyle(inputContainer).display !== 'none';
    const height = isInputVisible
        ? Math.ceil(inputContainer.getBoundingClientRect().height) + 16
        : 0;

    document.documentElement.style.setProperty('--input-offset', `${height}px`);
    container.style.setProperty('--input-offset', `${height}px`);
    container.style.paddingBottom = `${height}px`;
    container.style.scrollPaddingBottom = `${height}px`;

    const messageList = document.getElementById('messageList');
    if (messageList) {
        messageList.style.setProperty('--input-offset', `${height}px`);
        messageList.style.paddingBottom = `${height}px`;
    }
}

/**
 * 聚焦输入框
 * @param {string} inputId - 输入框ID，默认为'mainInput'
 */
function focusInput(inputId = 'mainInput') {
    const input = document.getElementById(inputId);
    if (input) {
        input.focus();
    }
}

/**
 * 锁定自动滚动
 * @param {number} duration - 锁定持续时间（毫秒），默认3000ms
 */
function lockAutoScroll(duration = 3000) {
    state.autoScrollLocked = true;
    if (state.autoScrollUnlockTimer) {
        clearTimeout(state.autoScrollUnlockTimer);
    }
    state.autoScrollUnlockTimer = setTimeout(() => {
        state.autoScrollLocked = false;
    }, duration);
}

/**
 * 解锁自动滚动
 */
function unlockAutoScroll() {
    state.autoScrollLocked = false;
    if (state.autoScrollUnlockTimer) {
        clearTimeout(state.autoScrollUnlockTimer);
        state.autoScrollUnlockTimer = null;
    }
}

/**
 * 显示元素
 * @param {string|HTMLElement} element - 元素ID或元素对象
 */
function showElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
        el.style.display = '';
    }
}

/**
 * 隐藏元素
 * @param {string|HTMLElement} element - 元素ID或元素对象
 */
function hideElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
        el.style.display = 'none';
    }
}

/**
 * 切换元素显示状态
 * @param {string|HTMLElement} element - 元素ID或元素对象
 * @returns {boolean} 切换后的显示状态
 */
function toggleElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return false;

    const isHidden = el.style.display === 'none' || window.getComputedStyle(el).display === 'none';
    el.style.display = isHidden ? '' : 'none';
    return !isHidden;
}

/**
 * 添加CSS类
 * @param {string|HTMLElement} element - 元素ID或元素对象
 * @param {string} className - CSS类名
 */
function addClass(element, className) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
        el.classList.add(className);
    }
}

/**
 * 移除CSS类
 * @param {string|HTMLElement} element - 元素ID或元素对象
 * @param {string} className - CSS类名
 */
function removeClass(element, className) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
        el.classList.remove(className);
    }
}

/**
 * 切换CSS类
 * @param {string|HTMLElement} element - 元素ID或元素对象
 * @param {string} className - CSS类名
 * @returns {boolean} 切换后的状态
 */
function toggleClass(element, className) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (!el) return false;

    return el.classList.toggle(className);
}

// 页面尺寸或方向变化时，更新移动端输入区占位
if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateMobileChatOffset);
    window.addEventListener('orientationchange', updateMobileChatOffset);
    window.addEventListener('load', updateMobileChatOffset);
}

// 在测试环境中将函数导出到全局作用域
if (typeof global !== 'undefined') {
    global.autoResize = autoResize;
    global.scrollToBottom = scrollToBottom;
    global.focusInput = focusInput;
    global.lockAutoScroll = lockAutoScroll;
    global.unlockAutoScroll = unlockAutoScroll;
    global.showElement = showElement;
    global.hideElement = hideElement;
    global.toggleElement = toggleElement;
    global.addClass = addClass;
    global.removeClass = removeClass;
    global.toggleClass = toggleClass;
    global.updateMobileChatOffset = updateMobileChatOffset;
}
