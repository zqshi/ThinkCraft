/**
 * ThinkCraft 触摸手势处理系统
 * 支持滑动、长按、双击、捏合等手势识别
 */

class GestureHandler {
  constructor() {
    this.gestures = {
      swipe: new Map(), // 滑动手势
      longPress: new Map(), // 长按手势
      doubleTap: new Map(), // 双击手势
      pinch: new Map() // 捏合手势
    };

    this.config = {
      swipeThreshold: 50, // 滑动触发距离（px）
      swipeVelocityThreshold: 0.3, // 滑动速度阈值
      longPressDuration: 500, // 长按触发时间（ms）
      doubleTapDelay: 300, // 双击间隔（ms）
      pinchThreshold: 10, // 捏合触发距离
      moveThreshold: 10 // 移动判定阈值（px）
    };
  }

  /**
   * 注册滑动手势
   * @param {HTMLElement} element - 目标元素
   * @param {Object} callbacks - 回调函数集合
   */
  registerSwipe(element, callbacks) {
    if (!element) {
      return;
    }

    let startX, startY, startTime;
    let currentX, currentY;
    let isSwiping = false;
    let hasMoved = false;

    const handleTouchStart = e => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;
      currentY = startY;
      startTime = Date.now();
      isSwiping = true;
      hasMoved = false;

      if (callbacks.onStart) {
        callbacks.onStart(e);
      }
    };

    const handleTouchMove = e => {
      if (!isSwiping) {
        return;
      }

      const touch = e.touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // 判断是否真正开始移动
      if (
        !hasMoved &&
        (Math.abs(deltaX) > this.config.moveThreshold ||
          Math.abs(deltaY) > this.config.moveThreshold)
      ) {
        hasMoved = true;
      }

      // 阻止默认滚动（可选）
      if (callbacks.preventScroll && hasMoved) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          e.preventDefault();
        }
      }

      // 触发实时滑动回调（用于视觉反馈）
      if (callbacks.onSwipeMove && hasMoved) {
        callbacks.onSwipeMove(deltaX, deltaY, e);
      }
    };

    const handleTouchEnd = e => {
      if (!isSwiping) {
        return;
      }

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const duration = Date.now() - startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / duration; // px/ms

      // 判断滑动方向
      const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI);
      const isHorizontal = angle < 45; // 角度小于45度为横向滑动
      const isVertical = angle >= 45; // 角度大于等于45度为纵向滑动

      // 触发对应方向的回调
      if (isHorizontal && Math.abs(deltaX) > this.config.swipeThreshold) {
        if (deltaX > 0 && callbacks.onSwipeRight) {
          callbacks.onSwipeRight(deltaX, velocity, e);
        } else if (deltaX < 0 && callbacks.onSwipeLeft) {
          callbacks.onSwipeLeft(Math.abs(deltaX), velocity, e);
        }
      } else if (isVertical && Math.abs(deltaY) > this.config.swipeThreshold) {
        if (deltaY > 0 && callbacks.onSwipeDown) {
          callbacks.onSwipeDown(deltaY, velocity, e);
        } else if (deltaY < 0 && callbacks.onSwipeUp) {
          callbacks.onSwipeUp(Math.abs(deltaY), velocity, e);
        }
      }

      isSwiping = false;

      // 滑动结束回调
      if (callbacks.onSwipeEnd) {
        callbacks.onSwipeEnd(e);
      }
    };

    const handleTouchCancel = () => {
      isSwiping = false;
      if (callbacks.onSwipeEnd) {
        callbacks.onSwipeEnd(null);
      }
    };

    // 绑定事件
    element.addEventListener('touchstart', handleTouchStart, { passive: !callbacks.preventScroll });
    element.addEventListener('touchmove', handleTouchMove, { passive: !callbacks.preventScroll });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchCancel);

    // 保存清理函数
    this.gestures.swipe.set(element, () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    });
  }

  /**
   * 注册长按手势
   * @param {HTMLElement} element - 目标元素
   * @param {Function} callback - 长按回调
   * @param {Number} duration - 长按时长（可选）
   */
  registerLongPress(element, callback, duration = this.config.longPressDuration) {
    if (!element || !callback) {
      return;
    }

    let pressTimer;
    let startX, startY;
    let isPressed = false;

    const handleTouchStart = e => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isPressed = true;

      // 启动长按计时器
      pressTimer = setTimeout(() => {
        if (isPressed) {
          // 触发震动反馈（如果支持）
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }

          callback(e);
          isPressed = false; // 防止重复触发
        }
      }, duration);
    };

    const handleTouchMove = e => {
      if (!isPressed) {
        return;
      }

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - startX);
      const deltaY = Math.abs(touch.clientY - startY);

      // 如果手指移动超过阈值，取消长按
      if (deltaX > this.config.moveThreshold || deltaY > this.config.moveThreshold) {
        clearTimeout(pressTimer);
        isPressed = false;
      }
    };

    const handleTouchEnd = () => {
      clearTimeout(pressTimer);
      isPressed = false;
    };

    // 绑定事件
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    // 保存清理函数
    this.gestures.longPress.set(element, () => {
      clearTimeout(pressTimer);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    });
  }

  /**
   * 注册双击手势
   * @param {HTMLElement} element - 目标元素
   * @param {Function} callback - 双击回调
   */
  registerDoubleTap(element, callback) {
    if (!element || !callback) {
      return;
    }

    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    const handleTouchEnd = e => {
      const touch = e.changedTouches[0];
      const now = Date.now();
      const timeDiff = now - lastTapTime;
      const distX = Math.abs(touch.clientX - lastTapX);
      const distY = Math.abs(touch.clientY - lastTapY);

      // 检查时间间隔和位置距离
      if (
        timeDiff < this.config.doubleTapDelay &&
        timeDiff > 0 &&
        distX < this.config.moveThreshold &&
        distY < this.config.moveThreshold
      ) {
        // 触发双击
        callback(e);

        // 震动反馈
        if (navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }

        lastTapTime = 0; // 重置，防止三击
      } else {
        lastTapTime = now;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
      }
    };

    element.addEventListener('touchend', handleTouchEnd);

    // 保存清理函数
    this.gestures.doubleTap.set(element, () => {
      element.removeEventListener('touchend', handleTouchEnd);
    });
  }

  /**
   * 注册捏合手势（缩放）
   * @param {HTMLElement} element - 目标元素
   * @param {Object} callbacks - 回调函数集合 { onPinchStart, onPinchMove, onPinchEnd }
   */
  registerPinch(element, callbacks) {
    if (!element) {
      return;
    }

    let initialDistance = 0;
    let currentScale = 1;
    let isPinching = false;

    const getDistance = (touch1, touch2) => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = e => {
      if (e.touches.length === 2) {
        isPinching = true;
        initialDistance = getDistance(e.touches[0], e.touches[1]);

        if (callbacks.onPinchStart) {
          callbacks.onPinchStart(e);
        }
      }
    };

    const handleTouchMove = e => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault(); // 阻止默认缩放

        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistance;

        if (callbacks.onPinchMove) {
          callbacks.onPinchMove(scale, currentScale, e);
        }

        currentScale = scale;
      }
    };

    const handleTouchEnd = e => {
      if (isPinching) {
        isPinching = false;

        if (callbacks.onPinchEnd) {
          callbacks.onPinchEnd(currentScale, e);
        }

        // 重置
        currentScale = 1;
        initialDistance = 0;
      }
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    // 保存清理函数
    this.gestures.pinch.set(element, () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    });
  }

  /**
   * 清理指定元素的所有手势监听器
   * @param {HTMLElement} element - 目标元素
   */
  cleanup(element) {
    if (!element) {
      return;
    }

    let cleaned = false;

    Object.values(this.gestures).forEach(gestureMap => {
      const cleanupFn = gestureMap.get(element);
      if (cleanupFn) {
        cleanupFn();
        gestureMap.delete(element);
        cleaned = true;
      }
    });

    if (cleaned) {
    }
  }

  /**
   * 清理所有手势监听器
   */
  cleanupAll() {
    let count = 0;

    Object.values(this.gestures).forEach(gestureMap => {
      gestureMap.forEach((cleanupFn, element) => {
        cleanupFn();
        count++;
      });
      gestureMap.clear();
    });
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return { ...this.config };
  }
}

// 自动初始化并导出全局实例
if (typeof window !== 'undefined') {
  window.GestureHandler = GestureHandler;
  window.gestureHandler = new GestureHandler();
}
