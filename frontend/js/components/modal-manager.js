/**
 * ThinkCraft Modal Manager
 * 统一管理所有模态框的显示/隐藏，避免重复代码
 */

class ModalManager {
  constructor() {
    this.modals = new Map(); // 存储所有模态框实例
    this.stack = []; // 模态框堆栈（支持多层模态框）
    this.initialized = false;

    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * 初始化：注册所有模态框并绑定事件
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    // 查找所有模态框元素
    document.querySelectorAll('.modal').forEach(modalElement => {
      const id = modalElement.id;
      if (id) {
        this.register(id, modalElement);
      }
    });

    // 绑定全局ESC键关闭
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.stack.length > 0) {
        this.close(this.stack[this.stack.length - 1]);
      }
    });

    this.initialized = true;
  }

  /**
   * 注册模态框
   * @param {String} id - 模态框ID
   * @param {HTMLElement} element - 模态框DOM元素
   */
  register(id, element) {
    if (this.modals.has(id)) {
    }

    // 绑定点击背景关闭
    element.addEventListener('click', e => {
      if (e.target === element) {
        this.close(id);
      }
    });

    this.modals.set(id, {
      id,
      element,
      isOpen: false,
      onOpen: null,
      onClose: null
    });
  }

  /**
   * 打开模态框
   * @param {String} id - 模态框ID
   * @param {Object} options - 选项 { onOpen, onClose, data }
   */
  open(id, options = {}) {
    const modal = this.modals.get(id);

    if (!modal) {
      return;
    }

    if (modal.isOpen) {
      return;
    }

    // 执行打开前回调
    if (options.onOpen) {
      modal.onOpen = options.onOpen;
      options.onOpen(options.data);
    }

    // 显示模态框
    modal.element.classList.add('active');
    modal.isOpen = true;

    // 添加到堆栈
    this.stack.push(id);

    // 设置z-index（支持多层模态框）
    const zIndex = 1000 + this.stack.length * 10;
    modal.element.style.zIndex = zIndex;

    // 保存关闭回调
    if (options.onClose) {
      modal.onClose = options.onClose;
    }

    // 禁止body滚动
    if (this.stack.length === 1) {
      document.body.style.overflow = 'hidden';
    }

    // 移动端自动启用滑动关闭
    if (window.deviceDetector?.deviceType.isMobile) {
      this.enableSwipeToDismiss(id);
    }
  }

  /**
   * 关闭模态框
   * @param {String} id - 模态框ID
   */
  close(id) {
    const modal = this.modals.get(id);

    if (!modal) {
      return;
    }

    if (!modal.isOpen) {
      return;
    }

    // 执行关闭前回调
    if (modal.onClose) {
      modal.onClose();
      modal.onClose = null;
    }

    // 隐藏模态框
    modal.element.classList.remove('active');
    modal.isOpen = false;

    // 从堆栈中移除
    const index = this.stack.indexOf(id);
    if (index > -1) {
      this.stack.splice(index, 1);
    }

    // 恢复body滚动
    if (this.stack.length === 0) {
      document.body.style.overflow = '';
    }
  }

  /**
   * 关闭所有模态框
   */
  closeAll() {
    // 复制堆栈，避免遍历时修改
    const modalsToClose = [...this.stack];
    modalsToClose.forEach(id => this.close(id));
  }

  /**
   * 切换模态框状态
   * @param {String} id - 模态框ID
   */
  toggle(id) {
    const modal = this.modals.get(id);
    if (!modal) {
      return;
    }

    if (modal.isOpen) {
      this.close(id);
    } else {
      this.open(id);
    }
  }

  /**
   * 检查模态框是否打开
   * @param {String} id - 模态框ID
   * @returns {Boolean}
   */
  isOpen(id) {
    const modal = this.modals.get(id);
    return modal ? modal.isOpen : false;
  }

  /**
   * 获取当前打开的模态框列表
   * @returns {Array<String>} 模态框ID数组
   */
  getOpenModals() {
    return [...this.stack];
  }

  /**
   * 更新模态框内容
   * @param {String} id - 模态框ID
   * @param {String} selector - 内容选择器（如 '.modal-body'）
   * @param {String|HTMLElement} content - 新内容
   */
  updateContent(id, selector, content) {
    const modal = this.modals.get(id);
    if (!modal) {
      return;
    }

    const target = modal.element.querySelector(selector);
    if (!target) {
      return;
    }

    if (typeof content === 'string') {
      target.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      target.innerHTML = '';
      target.appendChild(content);
    }
  }

  /**
   * 更新模态框标题
   * @param {String} id - 模态框ID
   * @param {String} title - 新标题
   */
  updateTitle(id, title) {
    this.updateContent(id, '.modal-title', title);
  }

  /**
   * 设置模态框加载状态
   * @param {String} id - 模态框ID
   * @param {Boolean} loading - 是否加载中
   */
  setLoading(id, loading) {
    const modal = this.modals.get(id);
    if (!modal) {
      return;
    }

    if (loading) {
      modal.element.classList.add('loading');
      // 可以添加一个loading遮罩层
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'modal-loading-overlay';
      loadingOverlay.innerHTML = `
        <div class="spinner"></div>
        <p>加载中...</p>
      `;
      modal.element.appendChild(loadingOverlay);
    } else {
      modal.element.classList.remove('loading');
      const overlay = modal.element.querySelector('.modal-loading-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
  }

  /**
   * 创建并打开临时模态框（动态创建）
   * @param {Object} config - { title, content, footer, className, onClose }
   * @returns {String} 临时模态框ID
   */
  openTemp(config) {
    const tempId = config.modalId || `temp-modal-${Date.now()}`;

    // 创建模态框HTML
    const modalHTML = `
      <div class="modal ${config.className || ''}" id="${tempId}">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">${config.title || ''}</h2>
            <button class="close-btn" onclick="modalManager.close('${tempId}')">&times;</button>
          </div>
          <div class="modal-body">
            ${config.content || ''}
          </div>
          ${config.footer ? `<div class="modal-footer">${config.footer}</div>` : ''}
        </div>
      </div>
    `;

    // 添加到DOM
    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    const modalElement = div.firstElementChild;
    document.body.appendChild(modalElement);

    // 注册并打开
    this.register(tempId, modalElement);
    this.open(tempId, {
      onClose: () => {
        // 关闭后移除DOM
        modalElement.remove();
        this.modals.delete(tempId);
        if (config.onClose) {
          config.onClose();
        }
      }
    });

    return tempId;
  }

  /**
   * 显示确认对话框
   * @param {String} message - 确认消息
   * @param {Function} onConfirm - 确认回调
   * @param {Function} onCancel - 取消回调
   */
  confirm(message, onConfirm, onCancel = null) {
    this.openTemp({
      title: '确认',
      content: `<p style="text-align: center; padding: 20px;">${message}</p>`,
      footer: `
        <button class="btn btn-secondary" onclick="modalManager.close(this.closest('.modal').id)">取消</button>
        <button class="btn btn-primary" id="confirm-btn">确定</button>
      `,
      className: 'confirm-modal',
      onClose: onCancel
    });

    // 绑定确认按钮
    setTimeout(() => {
      document.getElementById('confirm-btn')?.addEventListener('click', () => {
        const modalId = document.getElementById('confirm-btn').closest('.modal').id;
        this.close(modalId);
        if (onConfirm) {
          onConfirm();
        }
      });
    }, 0);
  }

  /**
   * 显示提示框
   * @param {String} message - 提示消息
   * @param {String} type - 'success' | 'error' | 'warning' | 'info'
   * @param {Function} callback - 弹窗关闭后的回调函数
   */
  alert(message, type = 'info', callback = null) {
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };

    this.openTemp({
      title: type.charAt(0).toUpperCase() + type.slice(1),
      content: `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 10px;">${icons[type]}</div>
          <p>${message}</p>
        </div>
      `,
      footer: `
        <button class="btn btn-primary" onclick="modalManager.close(this.closest('.modal').id)">确定</button>
      `,
      className: `alert-modal alert-${type}`,
      onClose: callback  // 添加回调支持
    });
  }

  /**
   * 显示自定义模态框
   * @param {String} title - 标题
   * @param {String} contentHTML - 内容HTML
   * @param {String} customId - 自定义模态框ID（可选）
   */
  showCustomModal(title, contentHTML, customId = null) {
    const modalId = customId || `custom-modal-${Date.now()}`;

    this.openTemp({
      title,
      content: contentHTML,
      footer: '', // 自定义内容中包含按钮
      className: 'custom-modal',
      modalId
    });
  }

  /**
   * 为移动端弹窗添加滑动关闭功能
   * @param {String} id - 模态框ID
   */
  enableSwipeToDismiss(id) {
    const modal = this.modals.get(id);
    if (!modal || !window.gestureHandler || !window.deviceDetector?.deviceType.isMobile) {
      return;
    }

    const modalContent = modal.element.querySelector('.modal-content');
    if (!modalContent) {
      return;
    }

    let isDragging = false;
    const initialTransform = 0;

    window.gestureHandler.registerSwipe(modalContent, {
      onSwipeMove: (deltaX, deltaY) => {
        // 只允许向下滑动关闭
        if (deltaY > 0) {
          isDragging = true;
          modalContent.style.transform = `translateY(${deltaY}px)`;
          modalContent.style.transition = 'none';

          // 计算透明度（滑动距离越大越透明）
          const opacity = 1 - deltaY / window.innerHeight;
          modal.element.style.backgroundColor = `rgba(0, 0, 0, ${0.5 * opacity})`;
        }
      },

      onSwipeDown: (deltaY, velocity) => {
        // 滑动距离超过30%屏幕高度，或速度足够快，则关闭
        if (deltaY > window.innerHeight * 0.3 || velocity > 0.5) {
          // 关闭动画
          modalContent.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          modalContent.style.transform = `translateY(${window.innerHeight}px)`;

          setTimeout(() => {
            this.close(id);
            // 重置样式
            modalContent.style.transform = '';
            modalContent.style.transition = '';
            modal.element.style.backgroundColor = '';
          }, 300);
        } else {
          // 回弹
          modalContent.style.transition = 'transform 0.2s ease-out';
          modalContent.style.transform = 'translateY(0)';
          modal.element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        }
      },

      onSwipeEnd: () => {
        if (isDragging) {
          isDragging = false;
          modalContent.style.transition = 'transform 0.2s ease-out';
          modalContent.style.transform = 'translateY(0)';
          modal.element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        }
      },

      preventScroll: false // 允许内容滚动
    });
  }
}

// 导出单例实例
if (typeof window !== 'undefined') {
  window.ModalManager = ModalManager;
  window.modalManager = new ModalManager();
}
