/**
 * Toast提示管理器
 * 提供非阻塞式消息提示功能
 *
 * @class ToastManager
 * @description
 * - 支持4种类型：success, error, warning, info
 * - 自动消失，支持堆叠显示
 * - 最多同时显示3个toast
 */
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
    }

    /**
     * 显示toast提示
     * @param {string} message - 提示消息
     * @param {string} type - 类型：success, error, warning, info
     * @param {number} duration - 显示时长（毫秒）
     */
    show(message, type = 'info', duration = 3000) {
        // 创建容器（首次调用时）
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }

        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${this.getIcon(type)}</div>
            <div class="toast-message">${this.escapeHtml(message)}</div>
        `;

        // 添加到容器
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // 限制最多3个toast
        if (this.toasts.length > 3) {
            const oldToast = this.toasts.shift();
            oldToast.remove();
        }

        // 自动移除
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => {
                toast.remove();
                const index = this.toasts.indexOf(toast);
                if (index > -1) {
                    this.toasts.splice(index, 1);
                }
            }, 300);
        }, duration);
    }

    /**
     * 获取类型对应的图标
     * @param {string} type - 类型
     * @returns {string} 图标字符
     */
    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * 转义HTML特殊字符（防止XSS）
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示成功提示
     * @param {string} message - 提示消息
     * @param {number} duration - 显示时长（毫秒）
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    /**
     * 显示错误提示
     * @param {string} message - 提示消息
     * @param {number} duration - 显示时长（毫秒）
     */
    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }

    /**
     * 显示警告提示
     * @param {string} message - 提示消息
     * @param {number} duration - 显示时长（毫秒）
     */
    warning(message, duration = 5000) {
        this.show(message, 'warning', duration);
    }

    /**
     * 显示信息提示
     * @param {string} message - 提示消息
     * @param {number} duration - 显示时长（毫秒）
     */
    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
}
