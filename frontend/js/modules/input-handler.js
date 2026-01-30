/**
 * 输入处理模块
 * 负责处理各种输入方式（文本、语音、图片等）
 *
 * @module InputHandler
 * @description 统一管理用户输入，包括文本、语音、图片等多种输入方式
 *
 * @example
 * // 创建实例
 * const inputHandler = new InputHandler();
 *
 * // 初始化
 * inputHandler.init();
 *
 * // 处理语音输入
 * inputHandler.handleVoice();
 *
 * @requires state - 全局状态管理器
 * @requires sendMessage - 消息发送函数
 * @requires addMessage - 添加消息函数
 * @requires autoResize - 自动调整输入框大小函数
 */

/* eslint-disable no-unused-vars, no-undef */

class InputHandler {
  constructor() {
    this.state = window.state;
    this.isRecording = false;
    this.recognition = null;
  }

  /**
   * 处理键盘按下事件
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleKeyDown(e) {
    // Enter键发送消息（但不在输入法组合状态中）
    if (e.key === 'Enter' && !e.shiftKey && !window.isComposing) {
      e.preventDefault();
      if (typeof sendMessage === 'function') {
        sendMessage();
      }
      return;
    }

    // 长按空格键触发语音输入（类似微信）
    if (e.code === 'Space' && !e.repeat && e.target.id === 'mainInput') {
      window.spaceHoldTriggered = false;
      window.spaceHoldTimer = setTimeout(() => {
        window.spaceHoldTriggered = true;
        e.preventDefault();
        this.handleVoice();
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 300);
    }
  }

  /**
   * 处理键盘释放事件
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleKeyUp(e) {
    if (e.code === 'Space') {
      clearTimeout(window.spaceHoldTimer);
      if (window.spaceHoldTriggered) {
        e.preventDefault();
        window.spaceHoldTriggered = false;
      }
    }
  }

  /**
   * 处理语音输入
   * 支持Web Speech API进行语音识别
   */
  handleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('❌ 您的浏览器不支持语音识别\n\n请使用 Chrome、Edge 或 Safari 浏览器');
      return;
    }

    if (this.isRecording) {
      // 停止录音
      if (this.recognition) {
        this.recognition.stop();
      }
      this.isRecording = false;
      return;
    }

    // 初始化语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isRecording = true;

      // 更新桌面端语音按钮状态
      const desktopVoiceBtn = document.getElementById('desktopVoiceBtn');
      const desktopVoiceText = document.getElementById('desktopVoiceText');
      if (desktopVoiceBtn && desktopVoiceBtn.offsetParent !== null) {
        desktopVoiceBtn.classList.add('recording');
        if (desktopVoiceText) {
          desktopVoiceText.textContent = '正在录音...';
        }
      }

      // 更新桌面端文本输入框状态（如果可见）
      const input = document.getElementById('mainInput');
      if (input && input.offsetParent !== null) {
        input.placeholder = '🎤 正在录音...（再次点击停止）';
        input.style.borderColor = '#ef4444';
      }
    };

    this.recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;

      // 移动端：直接发送语音识别结果
      const mobileVoiceBtn = document.getElementById('mobileVoiceBtn');
      if (mobileVoiceBtn && mobileVoiceBtn.offsetParent !== null) {
        // 移动端语音模式：直接发送
        const input = document.getElementById('mainInput');
        input.value = transcript;
        if (typeof sendMessage === 'function') {
          sendMessage();
        }
      } else {
        // 桌面端：填充到输入框
        const input = document.getElementById('mainInput');
        input.value = (input.value + ' ' + transcript).trim();
        if (typeof autoResize === 'function') {
          autoResize(input);
        }
      }

      // 触觉反馈
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    };

    this.recognition.onerror = event => {
      alert(`❌ 语音识别失败：${event.error}\n\n请检查麦克风权限`);
      this.resetVoiceInput();
    };

    this.recognition.onend = () => {
      this.resetVoiceInput();
    };

    this.recognition.start();
  }

  /**
   * 重置语音输入状态
   */
  resetVoiceInput() {
    this.isRecording = false;

    // 重置桌面端语音按钮状态
    const desktopVoiceBtn = document.getElementById('desktopVoiceBtn');
    const desktopVoiceText = document.getElementById('desktopVoiceText');
    if (desktopVoiceBtn) {
      desktopVoiceBtn.classList.remove('recording');
    }
    if (desktopVoiceText) {
      desktopVoiceText.textContent = '点击语音输入';
    }

    // 重置桌面端文本输入框状态
    const input = document.getElementById('mainInput');
    if (input) {
      input.placeholder = '分享你的创意想法，让我们通过深度对话来探索它的可能性...';
      input.style.borderColor = '';
    }
  }

  /**
   * 处理快速语音输入（移动端）
   */
  handleQuickVoice() {
    // 触觉反馈（支持的设备）
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // 自动聚焦输入框（确保用户能看到识别结果）
    const input = document.getElementById('mainInput');
    if (input) {
      input.focus();
    }

    // 调用主语音处理函数
    this.handleVoice();
  }

  /**
   * 处理相机输入
   * 使用后置摄像头拍照
   */
  handleCamera() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 使用后置摄像头

    input.onchange = async e => {
      const file = e.target.files[0];
      if (file) {
        await this.processImageFile(file);
      }
    };

    input.click();
  }

  /**
   * 处理图片上传
   * 允许用户从相册选择图片
   */
  handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = async e => {
      const file = e.target.files[0];
      if (file) {
        await this.processImageFile(file);
      }
    };

    input.click();
  }

  /**
   * 处理图片文件
   * @param {File} file - 图片文件对象
   */
  async processImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('❌ 请选择图片文件');
      return;
    }

    // 显示加载状态
    let loadingMsg = null;
    if (typeof addMessage === 'function') {
      loadingMsg = addMessage('assistant', '🖼️ 正在分析图片...');
    }

    try {
      // 将图片转换为 Base64
      const base64Image = await this.fileToBase64(file);

      // 调用后端API进行图片识别
      const response = await fetch(`${this.state.settings.apiUrl}/api/vision/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image,
          prompt: '请描述这张图片的内容，如果图片中有文字，请提取出来。'
        })
      });

      if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.error || '图片识别失败');
      }

      // 将识别结果填入输入框
      const input = document.getElementById('mainInput');
      const description = data.data.description;
      input.value = `[图片内容]: ${description}`;
      if (typeof autoResize === 'function') {
        autoResize(input);
      }

      // 移除加载消息
      if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.parentNode.removeChild(loadingMsg);
      }
    } catch (error) {
      // 移除加载消息
      if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.parentNode.removeChild(loadingMsg);
      }

      // 降级方案：仅显示图片预览
      const reader = new FileReader();
      reader.onload = e => {
        const input = document.getElementById('mainInput');
        input.value = `[已上传图片: ${file.name}]\n\n请描述你想探讨的内容：`;
        if (typeof autoResize === 'function') {
          autoResize(input);
        }

        // 显示图片预览（可选）
        alert(
          `📷 图片已接收：${file.name}\n\n⚠️ 图片识别功能需要后端支持\n当前仅显示图片名称，请手动描述图片内容。`
        );
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * 文件转 Base64
   * @param {File} file - 文件对象
   * @returns {Promise<string>} Base64编码的字符串
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 智能检测最佳输入方式
   * 根据时间、网络、设备类型等因素推荐最佳输入方式
   * @returns {Object} 输入模式建议
   */
  getSmartInputMode() {
    const hour = new Date().getHours();
    const device = window.deviceDetector;

    // 1. 深夜/清晨时段（22:00 - 7:00）→ 文本模式
    if (hour >= 22 || hour <= 7) {
      return {
        mode: 'text',
        reason: '深夜时段，建议使用文字输入',
        icon: '🌙'
      };
    }

    // 2. 弱网或省流量模式 → 文本模式
    if (navigator.connection) {
      const effectiveType = navigator.connection.effectiveType;
      const saveData = navigator.connection.saveData;

      if (effectiveType === 'slow-2g' || effectiveType === '2g' || saveData) {
        return {
          mode: 'text',
          reason: '网络较慢，建议使用文字输入',
          icon: '📶'
        };
      }
    }

    // 3. 桌面端 → 文本模式（键盘更高效）
    if (device && device.deviceType && device.deviceType.isDesktop) {
      return {
        mode: 'text',
        reason: '桌面端，键盘输入更高效',
        icon: '⌨️'
      };
    }

    // 4. 移动端 + 白天 + 良好网络 → 语音模式
    if (device && device.deviceType && device.deviceType.isMobile) {
      // 检查是否支持语音识别
      const supportsSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

      if (supportsSpeech) {
        return {
          mode: 'voice',
          reason: '点击左上角话筒，快速语音记录',
          icon: '🎤'
        };
      }
    }

    // 5. 默认：文本模式
    return {
      mode: 'text',
      reason: '开始输入你的创意想法',
      icon: '✍️'
    };
  }

  /**
   * 应用智能输入提示
   * 根据智能检测结果更新UI提示
   */
  applySmartInputHint() {
    const inputMode = this.getSmartInputMode();
    const mainInput = document.getElementById('mainInput');
    const quickVoiceBtn = document.querySelector('.quick-voice-btn');

    if (!mainInput) {
      return;
    }

    // 更新输入框提示文字
    if (inputMode.mode === 'voice') {
      mainInput.placeholder = `${inputMode.icon} ${inputMode.reason}`;

      // 移动端语音模式：添加脉冲动画提示
      if (quickVoiceBtn && window.deviceDetector?.deviceType?.isMobile) {
        quickVoiceBtn.style.animation = 'pulse 2s ease-in-out 3';

        // 3次脉冲后移除动画
        setTimeout(() => {
          quickVoiceBtn.style.animation = '';
        }, 6000);
      }
    } else {
      mainInput.placeholder = `${inputMode.icon} ${inputMode.reason}`;
      // 文本模式：自动聚焦输入框
      if (!this.state.currentChat) {
        setTimeout(() => {
          mainInput.focus();
        }, 300);
      }
    }
  }

  /**
   * 快速开始功能
   * 提供预设的快速开始选项
   * @param {string} type - 快速开始类型
   */
  quickStart(type) {
    const prompts = {
      创业想法: '我有一个创业想法，想验证一下可行性',
      产品功能: '我在思考一个产品功能，需要分析一下',
      解决方案: '我遇到了一个问题，想找到最佳解决方案',
      职业发展: '我在考虑职业发展方向，需要规划一下'
    };
    const input = document.getElementById('mainInput');
    if (input) {
      input.value = prompts[type] || '';
      if (typeof sendMessage === 'function') {
        sendMessage();
      }
    }
  }

  /**
   * 切换到文本模式
   */
  switchToTextMode() {
    const voiceMode = document.getElementById('voiceMode');
    const textMode = document.getElementById('textMode');
    if (voiceMode) {
      voiceMode.style.display = 'none';
    }
    if (textMode) {
      textMode.style.display = 'flex';
    }
  }

  /**
   * 切换到语音模式
   */
  switchToVoiceMode() {
    const voiceMode = document.getElementById('voiceMode');
    const textMode = document.getElementById('textMode');
    if (voiceMode) {
      voiceMode.style.display = 'flex';
    }
    if (textMode) {
      textMode.style.display = 'none';
    }
  }

  /**
   * 初始化输入处理器
   */
  init() {
    // 绑定输入法事件
    const mainInput = document.getElementById('mainInput');
    if (mainInput) {
      mainInput.addEventListener('compositionstart', () => {
        window.isComposing = true;
      });
      mainInput.addEventListener('compositionend', () => {
        window.isComposing = false;
      });
    }

    // 应用智能输入提示
    this.applySmartInputHint();
  }
}

// 创建全局实例
window.inputHandler = new InputHandler();

// 暴露全局函数（向后兼容）
function handleKeyDown(e) {
  window.inputHandler.handleKeyDown(e);
}

function handleKeyUp(e) {
  window.inputHandler.handleKeyUp(e);
}

function handleVoice() {
  window.inputHandler.handleVoice();
}

function handleQuickVoice() {
  window.inputHandler.handleQuickVoice();
}

function handleCamera() {
  window.inputHandler.handleCamera();
}

function handleImageUpload() {
  window.inputHandler.handleImageUpload();
}

function quickStart(type) {
  window.inputHandler.quickStart(type);
}

function switchToTextMode() {
  window.inputHandler.switchToTextMode();
}

function switchToVoiceMode() {
  window.inputHandler.switchToVoiceMode();
}

function getSmartInputMode() {
  return window.inputHandler.getSmartInputMode();
}

function applySmartInputHint() {
  window.inputHandler.applySmartInputHint();
}
