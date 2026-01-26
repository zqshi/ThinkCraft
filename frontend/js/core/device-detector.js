/**
 * ThinkCraft 设备检测与能力适配系统
 * 检测设备类型、触摸能力、性能等级，并动态调整体验
 */

class DeviceDetector {
  constructor() {
    this.capabilities = this.detectCapabilities();
    this.deviceType = this.detectDeviceType();
    this.performance = this.detectPerformance();
    this.initialized = false;

    // 监听屏幕方向变化
    window.addEventListener('orientationchange', () => {
      this.handleOrientationChange();
    });

    // 监听窗口大小变化（防抖）
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.handleResize(), 150);
    });
  }

  /**
   * 检测设备能力
   * @returns {Object} 设备能力对象
   */
  detectCapabilities() {
    return {
      // 触摸支持
      touch:
        'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0,

      // 精准指针（鼠标）
      finePointer: window.matchMedia('(pointer: fine)').matches,

      // Hover支持
      hover: window.matchMedia('(hover: hover)').matches,

      // 多点触控
      multiTouch: navigator.maxTouchPoints > 1,

      // 安全区域支持（iOS）
      safeArea: CSS.supports('padding: env(safe-area-inset-top)'),

      // 振动API
      vibration: 'vibrate' in navigator,

      // 设备像素比
      devicePixelRatio: window.devicePixelRatio || 1,

      // 网络连接
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,

      // GPU加速
      gpu: this.detectGPU(),

      // WebGL支持
      webgl: this.detectWebGL(),

      // 本地存储
      localStorage: this.detectLocalStorage(),

      // Service Worker支持
      serviceWorker: 'serviceWorker' in navigator
    };
  }

  /**
   * 检测设备类型
   * @returns {Object} 设备类型对象
   */
  detectDeviceType() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ua = navigator.userAgent;

    // iPhone X及以上（刘海屏）
    const isNotchedIPhone = /iPhone/.test(ua) && window.screen.height >= 812;

    // iPad检测（包括iPad Pro）
    const isIPad =
      /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    return {
      // 基础分类
      isMobile: width <= 640,
      isTablet: width > 640 && width <= 1024,
      isDesktop: width > 1024,

      // 具体设备
      isIOS: /iPhone|iPad|iPod/.test(ua) || isIPad,
      isAndroid: /Android/.test(ua),
      isIPhone: /iPhone/.test(ua),
      isIPad: isIPad,
      isNotchedIPhone,

      // 屏幕方向
      isPortrait: height > width,
      isLandscape: height <= width,
      orientation: height > width ? 'portrait' : 'landscape',

      // 屏幕尺寸分类
      screenSize: this.categorizeScreenSize(width),

      // 具体尺寸
      width,
      height,

      // 浏览器信息
      browser: this.detectBrowser(ua),

      // 操作系统版本
      osVersion: this.detectOSVersion(ua)
    };
  }

  /**
   * 分类屏幕尺寸
   * @param {Number} width - 屏幕宽度
   * @returns {String} 尺寸分类
   */
  categorizeScreenSize(width) {
    if (width <= 480) {
      return 'small-phone';
    }
    if (width <= 640) {
      return 'phone';
    }
    if (width <= 768) {
      return 'large-phone';
    }
    if (width <= 896) {
      return 'small-tablet';
    }
    if (width <= 1024) {
      return 'tablet';
    }
    if (width <= 1366) {
      return 'small-desktop';
    }
    if (width <= 1920) {
      return 'desktop';
    }
    return 'large-desktop';
  }

  /**
   * 检测浏览器
   * @param {String} ua - User Agent
   * @returns {Object} 浏览器信息
   */
  detectBrowser(ua) {
    let name = 'Unknown';
    let version = '';

    if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
      name = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || '';
    } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
      name = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || '';
    } else if (/Firefox/.test(ua)) {
      name = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || '';
    } else if (/Edg/.test(ua)) {
      name = 'Edge';
      version = ua.match(/Edg\/(\d+)/)?.[1] || '';
    }

    return { name, version };
  }

  /**
   * 检测操作系统版本
   * @param {String} ua - User Agent
   * @returns {String} 操作系统版本
   */
  detectOSVersion(ua) {
    if (/iPhone OS (\d+)/.test(ua)) {
      return ua.match(/iPhone OS (\d+)/)[1];
    } else if (/Android (\d+)/.test(ua)) {
      return ua.match(/Android (\d+)/)[1];
    }
    return '';
  }

  /**
   * 检测GPU性能
   * @returns {Object} GPU信息
   */
  detectGPU() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) {
        return { supported: false };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        supported: true,
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown'
      };
    } catch (e) {
      return { supported: false, error: e.message };
    }
  }

  /**
   * 检测WebGL支持
   * @returns {Boolean} 是否支持WebGL
   */
  detectWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  /**
   * 检测本地存储
   * @returns {Boolean} 是否支持本地存储
   */
  detectLocalStorage() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 性能分级
   * @returns {Object} 性能信息
   */
  detectPerformance() {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 2; // GB
    const connection = this.capabilities.connection;

    // 综合评分（0-10分）
    let score = 0;

    // CPU核心数评分（0-3分）
    if (cores >= 8) {
      score += 3;
    } else if (cores >= 4) {
      score += 2;
    } else {
      score += 1;
    }

    // 内存评分（0-3分）
    if (memory >= 8) {
      score += 3;
    } else if (memory >= 4) {
      score += 2;
    } else {
      score += 1;
    }

    // 网络评分（0-2分）
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === '4g') {
        score += 2;
      } else if (effectiveType === '3g') {
        score += 1;
      }
    } else {
      score += 1; // 假设中等网络
    }

    // GPU评分（0-2分）
    if (this.capabilities.gpu.supported) {
      score += 2;
    }

    // 根据总分确定性能等级
    let tier;
    if (score >= 8) {
      tier = 'high';
    } else if (score >= 5) {
      tier = 'medium';
    } else {
      tier = 'low';
    }

    return {
      tier,
      score,
      cores,
      memory,
      connectionType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || null, // Mbps
      rtt: connection?.rtt || null, // ms
      saveData: connection?.saveData || false
    };
  }

  /**
   * 处理屏幕方向变化
   */
  handleOrientationChange() {
    this.deviceType = this.detectDeviceType();
    this.updateBodyClasses();

    // 触发自定义事件
    window.dispatchEvent(
      new CustomEvent('deviceOrientationChange', {
        detail: { orientation: this.deviceType.orientation }
      })
    );
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    const oldDeviceType = this.deviceType.screenSize;
    this.deviceType = this.detectDeviceType();
    const newDeviceType = this.deviceType.screenSize;

    // 只有在设备类型真正改变时才更新
    if (oldDeviceType !== newDeviceType) {
      this.updateBodyClasses();
      // 触发自定义事件
      window.dispatchEvent(
        new CustomEvent('deviceTypeChange', {
          detail: {
            from: oldDeviceType,
            to: newDeviceType,
            deviceType: this.deviceType
          }
        })
      );
    }
  }

  /**
   * 更新body类名（用于CSS响应式）
   */
  updateBodyClasses() {
    const {
      isMobile,
      isTablet,
      isDesktop,
      screenSize,
      isIOS,
      isAndroid,
      isNotchedIPhone,
      isIPad,
      isPortrait,
      isLandscape,
      browser
    } = this.deviceType;
    const { touch, hover, multiTouch, safeArea } = this.capabilities;
    const { tier } = this.performance;

    // 移除旧类名
    document.body.className = document.body.className
      .split(' ')
      .filter(
        c =>
          !c.startsWith('device-') &&
          !c.startsWith('screen-') &&
          !c.startsWith('perf-') &&
          !c.startsWith('browser-') &&
          c !== 'mobile' &&
          c !== 'tablet' &&
          c !== 'desktop' &&
          c !== 'touch-device' &&
          c !== 'hover-device' &&
          c !== 'ios' &&
          c !== 'android' &&
          c !== 'notched-iphone' &&
          c !== 'ipad' &&
          c !== 'portrait' &&
          c !== 'landscape' &&
          c !== 'has-safe-area'
      )
      .join(' ');

    // 添加新类名
    const classes = [];

    // 设备类型
    if (isMobile) {
      classes.push('mobile');
    }
    if (isTablet) {
      classes.push('tablet');
    }
    if (isDesktop) {
      classes.push('desktop');
    }
    classes.push(`screen-${screenSize}`);

    // 平台
    if (isIOS) {
      classes.push('ios');
    }
    if (isAndroid) {
      classes.push('android');
    }
    if (isNotchedIPhone) {
      classes.push('notched-iphone');
    }
    if (isIPad) {
      classes.push('ipad');
    }

    // 方向
    if (isPortrait) {
      classes.push('portrait');
    }
    if (isLandscape) {
      classes.push('landscape');
    }

    // 能力
    if (touch) {
      classes.push('touch-device');
    }
    if (hover) {
      classes.push('hover-device');
    }
    if (multiTouch) {
      classes.push('multi-touch');
    }
    if (safeArea) {
      classes.push('has-safe-area');
    }

    // 性能
    classes.push(`perf-${tier}`);

    // 浏览器
    if (browser.name !== 'Unknown') {
      classes.push(`browser-${browser.name.toLowerCase()}`);
    }

    document.body.className = (document.body.className + ' ' + classes.join(' ')).trim();
  }

  /**
   * 根据设备性能调整体验
   */
  applyPerformanceTier() {
    const tier = this.performance.tier;

    if (tier === 'low') {
      // 低性能设备：禁用动画
      document.body.classList.add('reduce-motion');
      // 减少同时显示的Agent数量（如果存在）
      if (window.agentProgressManager) {
        window.agentProgressManager.maxVisibleAgents = 3;
      }
    } else if (tier === 'medium') {
      // 中等性能：简化动画
      document.documentElement.style.setProperty('--animation-duration-normal', '0.2s');
    } else {
      // 高性能：启用全部特效
      document.body.classList.add('enhanced-animations');
    }

    // 如果用户开启了省流量模式
    if (this.performance.saveData) {
      document.body.classList.add('save-data-mode');
    }
  }

  /**
   * 初始化
   */
  init() {
    if (this.initialized) {
      return;
    }

    this.updateBodyClasses();
    this.applyPerformanceTier();
    this.initialized = true;

    // 触发初始化完成事件
    window.dispatchEvent(
      new CustomEvent('deviceDetectorReady', {
        detail: {
          deviceType: this.deviceType,
          capabilities: this.capabilities,
          performance: this.performance
        }
      })
    );
  }

  /**
   * 获取完整设备信息
   * @returns {Object} 完整设备信息
   */
  getDeviceInfo() {
    return {
      deviceType: this.deviceType,
      capabilities: this.capabilities,
      performance: this.performance
    };
  }
}

// 自动初始化并导出全局实例
if (typeof window !== 'undefined') {
  window.DeviceDetector = DeviceDetector;

  // 等待DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.deviceDetector = new DeviceDetector();
      window.deviceDetector.init();
    });
  } else {
    window.deviceDetector = new DeviceDetector();
    window.deviceDetector.init();
  }
}
