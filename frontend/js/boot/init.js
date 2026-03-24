/**
 * 处理 PWA 启动参数
 * 支持快捷方式（语音、相机、新建对话）和 Web Share Target
 */
/* eslint-disable no-undef, no-console */

// 创建日志实例（避免污染全局 logger 命名）
const initLogger = window.createLogger ? window.createLogger('Init') : console;

function handleLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');

  if (action === 'voice') {
    // 启动语音输入
    setTimeout(() => {
      if (window.inputHandler?.handleVoice) {
        window.inputHandler.handleVoice();
      }
    }, 500);
  } else if (action === 'camera') {
    // 启动相机
    setTimeout(() => {
      if (window.inputHandler?.handleCamera) {
        window.inputHandler.handleCamera();
      }
    }, 500);
  } else if (action === 'new-chat') {
    // 新建对话
    if (typeof startNewChat === 'function') {
      startNewChat();
    }
  }

  // 处理 Web Share Target（其他应用分享内容）
  const sharedTitle = params.get('title');
  const sharedText = params.get('text');
  const sharedUrl = params.get('url');

  if (sharedTitle || sharedText || sharedUrl) {
    const input = document.getElementById('mainInput');
    if (input) {
      let content = '';
      if (sharedTitle) {
        content += sharedTitle + '\n';
      }
      if (sharedText) {
        content += sharedText + '\n';
      }
      if (sharedUrl) {
        content += sharedUrl;
      }
      input.value = content.trim();
      if (window.stateManager?.setInputDraft) {
        window.stateManager.setInputDraft(window.state?.currentChat, input.value);
      }
      focusInput();
    }
  }

  // 清理 URL 参数（避免刷新时重复触发）
  if (action || sharedTitle || sharedText || sharedUrl) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function initSessionKeepAlive() {
  const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'focus'];
  let lastActivityAt = 0;
  const throttleMs = 15000;

  const onActivity = () => {
    const now = Date.now();
    if (now - lastActivityAt < throttleMs) {
      return;
    }
    lastActivityAt = now;
    if (window.apiClient?.ensureFreshToken) {
      window.apiClient.ensureFreshToken();
    }
  };

  activityEvents.forEach(eventName => {
    window.addEventListener(eventName, onActivity, { passive: true });
  });
}

/**
 * App initialization (extracted from inline boot)
 */
function initApp() {
  console.log('开始初始化应用...');

  // 确保InputHandler最先初始化
  if (!window.inputHandler) {
    console.log('创建 InputHandler 实例');
    window.inputHandler = new InputHandler();
    window.inputHandler.init();
  }

  updateUserNameDisplay();

  loadSettings();
  focusInput();

  window.modalManager = new ModalManager();
  window.storageManager = new StorageManager();
  const savedSettings = JSON.parse(localStorage.getItem('thinkcraft_settings') || '{}');
  if (typeof savedSettings.apiUrl === 'string') {
    savedSettings.apiUrl = savedSettings.apiUrl.replace(
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    );
  }
  const apiUrl = savedSettings.apiUrl || state.settings.apiUrl || getDefaultApiUrl();
  window.apiClient = window.apiClient || new APIClient(apiUrl);
  window.apiClient.setBaseURL && window.apiClient.setBaseURL(apiUrl);
  if (window.apiClient?.setKeepAliveConfig) {
    window.apiClient.setKeepAliveConfig({
      thresholdMs: savedSettings.keepAliveRefreshThresholdMs,
      cooldownMs: savedSettings.keepAliveRefreshCooldownMs
    });
  }
  initSessionKeepAlive();
  // StateManager已在core/state-manager.js中创建，不需要重复创建
  window.agentProgressManager = new AgentProgressManager(window.modalManager);
  window.businessPlanGenerator = new BusinessPlanGenerator(
    window.apiClient,
    window.stateManager,
    window.agentProgressManager
  );

  // 初始化Toast管理器
  window.toast = new ToastManager();
  console.log('[Init] Toast管理器初始化完成');

  // 初始化导出验证器
  window.exportValidator = new ExportValidator(window.stateManager, window.storageManager);
  console.log('[Init] 导出验证器初始化完成');

  // 初始化报告状态管理器
  if (window.ReportStatusManager && !window.reportStatusManager) {
    window.reportStatusManager = new window.ReportStatusManager();
    console.log('[Init] ReportStatusManager 已初始化');
  }

  window.storageManager
    .init()
    .then(async () => {
      if (window.storageManager?.migrateFromLocalStorage) {
        await window.storageManager.migrateFromLocalStorage();
      }

      if (window.storageManager?.repairCoreData) {
        await window.storageManager.repairCoreData();
      }

      // 在 apiClient/storage 就绪后再加载会话，避免先渲染本地残留导致点击后 404
      if (window.chatList?.loadChats) {
        await window.chatList.loadChats({ preferLocal: false });
      } else {
        await loadChats();
      }

      // ✅ 确保DOM完全渲染后再恢复状态
      // 使用 requestAnimationFrame 确保在下一帧渲染后执行
      requestAnimationFrame(async () => {
        // 🔍 记录状态恢复开始
        initLogger.debug('[初始化] 开始恢复生成状态', {
          currentChat: window.state?.currentChat,
          timestamp: Date.now()
        });

        await loadGenerationStates();

        // 🔍 验证状态恢复结果
        setTimeout(() => {
          const businessBtn = document.getElementById('businessPlanBtn');
          const proposalBtn = document.getElementById('proposalBtn');
          initLogger.debug('[初始化] 状态恢复完成后按钮状态', {
            businessBtn: businessBtn
              ? {
                  classList: Array.from(businessBtn.classList),
                  dataStatus: businessBtn.dataset.status,
                  dataChatId: businessBtn.dataset.chatId
                }
              : 'not found',
            proposalBtn: proposalBtn
              ? {
                  classList: Array.from(proposalBtn.classList),
                  dataStatus: proposalBtn.dataset.status,
                  dataChatId: proposalBtn.dataset.chatId
                }
              : 'not found',
            currentChat: window.state?.currentChat
          });
        }, 500);
      });
    })
    .catch(error => {
      initLogger.error('[初始化] StorageManager初始化失败', error);
    });

  // 绑定输入框事件
  const mainInput = document.getElementById('mainInput');
  if (mainInput) {
    mainInput.addEventListener('keydown', handleKeyDown);
    mainInput.addEventListener('keyup', handleKeyUp);
    mainInput.addEventListener('input', function () {
      autoResize(this);
      if (window.stateManager?.setInputDraft) {
        window.stateManager.setInputDraft(window.state?.currentChat, this.value);
      }
    });
    // 添加输入法组合事件监听
    mainInput.addEventListener('compositionstart', handleCompositionStart);
    mainInput.addEventListener('compositionend', handleCompositionEnd);
  }

  // 绑定移动端输入框事件
  const mobileTextInput = document.getElementById('mobileTextInput');
  if (mobileTextInput) {
    // 移动端输入框已经在 HTML 中通过 onkeydown 绑定了 handleKeyDown
    // 这里添加输入法组合事件监听
    mobileTextInput.addEventListener('input', function () {
      if (window.stateManager?.setInputDraft) {
        window.stateManager.setInputDraft(window.state?.currentChat, this.value);
      }
    });
    mobileTextInput.addEventListener('compositionstart', handleCompositionStart);
    mobileTextInput.addEventListener('compositionend', handleCompositionEnd);
  }

  // 绑定发送按钮事件
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // 绑定移动端语音按钮事件
  initMobileVoiceButton();

  // 初始化 Agent 系统
  if (typeof window.initAgentSystem === 'function') {
    console.log('初始化 Agent 系统');
    window.initAgentSystem();
  } else {
    console.warn('initAgentSystem 函数未定义，Agent 功能可能不可用');
  }

  // 绑定生成按钮事件
  const businessPlanBtn = document.getElementById('businessPlanBtn');
  if (businessPlanBtn) {
    businessPlanBtn.addEventListener('click', async () => {
      if (window.businessPlanGenerator) {
        console.log('点击商业计划书按钮');
        // ✅ 使用统一的按钮点击处理方法
        await window.businessPlanGenerator.handleButtonClick('business');
      } else {
        console.error('❌ BusinessPlanGenerator 未初始化');
        alert('系统初始化失败，请刷新页面');
      }
    });
    console.log('✅ 商业计划书按钮事件已绑定');
  } else {
    console.error('❌ 找不到 businessPlanBtn 元素');
  }

  const proposalBtn = document.getElementById('proposalBtn');
  if (proposalBtn) {
    proposalBtn.addEventListener('click', async () => {
      if (window.businessPlanGenerator) {
        console.log('点击产品立项按钮');
        // ✅ 使用统一的按钮点击处理方法
        await window.businessPlanGenerator.handleButtonClick('proposal');
      } else {
        console.error('❌ BusinessPlanGenerator 未初始化');
        alert('系统初始化失败，请刷新页面');
      }
    });
    console.log('✅ 产品立项按钮事件已绑定');
  } else {
    console.error('❌ 找不到 proposalBtn 元素');
  }
}

/**
 * 初始化移动端语音按钮
 */
function initMobileVoiceButton() {
  const mobileVoiceBtn = document.getElementById('mobileVoiceBtn');
  if (!mobileVoiceBtn) {
    console.warn('移动端语音按钮未找到');
    return;
  }

  console.log('初始化移动端语音按钮');

  // 首次点击时显示权限说明
  let isFirstTouch = true;

  mobileVoiceBtn.addEventListener('touchstart', async e => {
    e.preventDefault();
    console.log('touchstart 事件触发');

    // 首次使用时显示权限说明
    if (isFirstTouch) {
      isFirstTouch = false;

      // 检查是否支持语音识别
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('❌ 您的浏览器不支持语音识别\n\n请使用 Chrome、Edge 或 Safari 浏览器');
        isFirstTouch = true;
        return;
      }

      // 显示权限说明
      const confirmed = confirm(
        '🎤 语音输入需要访问麦克风\n\n' +
          '首次使用需要授权麦克风权限，请在浏览器弹窗中点击"允许"。\n\n' +
          '点击"确定"继续'
      );

      if (!confirmed) {
        isFirstTouch = true; // 用户取消，下次还显示说明
        return;
      }
    }

    // 开始录音
    if (window.inputHandler) {
      await window.inputHandler.handleVoice();
      if (window.inputHandler.isRecording) {
        mobileVoiceBtn.classList.add('recording');
      }
    } else {
      console.error('InputHandler 未初始化');
      alert('❌ 语音功能初始化失败，请刷新页面重试');
    }
  });

  mobileVoiceBtn.addEventListener('touchend', async e => {
    e.preventDefault();
    console.log('touchend 事件触发');
    if (window.inputHandler && window.inputHandler.isRecording) {
      await window.inputHandler.handleVoice();
    }
    mobileVoiceBtn.classList.remove('recording');
  });

  mobileVoiceBtn.addEventListener('touchcancel', async e => {
    e.preventDefault();
    console.log('touchcancel 事件触发');
    if (window.inputHandler && window.inputHandler.isRecording) {
      await window.inputHandler.handleVoice();
    }
    mobileVoiceBtn.classList.remove('recording');
  });

  // 添加点击事件作为备用（某些设备可能不支持touch事件）
  mobileVoiceBtn.addEventListener('click', async e => {
    e.preventDefault();
    console.log('click 事件触发');

    // 如果是桌面端点击，也执行相同逻辑
    if (isFirstTouch) {
      isFirstTouch = false;

      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('❌ 您的浏览器不支持语音识别\n\n请使用 Chrome、Edge 或 Safari 浏览器');
        isFirstTouch = true;
        return;
      }

      const confirmed = confirm(
        '🎤 语音输入需要访问麦克风\n\n' +
          '首次使用需要授权麦克风权限，请在浏览器弹窗中点击"允许"。\n\n' +
          '点击"确定"继续'
      );

      if (!confirmed) {
        isFirstTouch = true;
        return;
      }
    }

    if (window.inputHandler) {
      await window.inputHandler.handleVoice();
    } else {
      console.error('InputHandler 未初始化');
      alert('❌ 语音功能初始化失败，请刷新页面重试');
    }
  });

  console.log('移动端语音按钮事件绑定完成');
}

function getDefaultApiUrl() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://127.0.0.1:3000';
  }
  return window.location.origin;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// 在页面完全加载后处理 PWA 启动参数
window.addEventListener('load', async () => {
  handleLaunchParams();

  // 延迟初始化新手引导，确保所有模块已加载
  setTimeout(() => {
    if (typeof initOnboarding === 'function') {
      initOnboarding();
    } else {
      console.warn('initOnboarding 函数未定义，新手引导功能不可用');
    }
  }, 300);
});
