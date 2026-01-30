/**
 * App initialization (extracted from inline boot)
 */
function initApp() {
  updateUserNameDisplay();

  loadChats();
  loadSettings();
  focusInput();

  window.modalManager = new ModalManager();
  window.storageManager = new StorageManager();
  const savedSettings = JSON.parse(localStorage.getItem('thinkcraft_settings') || '{}');
  const apiUrl = savedSettings.apiUrl || state.settings.apiUrl || getDefaultApiUrl();
  window.apiClient = window.apiClient || new APIClient(apiUrl);
  window.apiClient.setBaseURL && window.apiClient.setBaseURL(apiUrl);
  window.stateManager = new StateManager();
  window.agentProgressManager = new AgentProgressManager(window.modalManager);
  window.businessPlanGenerator = new BusinessPlanGenerator(
    window.apiClient,
    window.stateManager,
    window.agentProgressManager
  );

  window.storageManager
    .init()
    .then(async () => {
      if (window.storageManager?.migrateFromLocalStorage) {
        await window.storageManager.migrateFromLocalStorage();
      }
      loadGenerationStates();
    })
    .catch(error => {});

  window.stateManager.subscribe(newState => {
    updateGenerationButtonState(newState.generation);
  });

  // 绑定输入框事件
  const mainInput = document.getElementById('mainInput');
  if (mainInput) {
    mainInput.addEventListener('keydown', handleKeyDown);
    mainInput.addEventListener('keyup', handleKeyUp);
    mainInput.addEventListener('input', function() {
      autoResize(this);
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
    mobileTextInput.addEventListener('compositionstart', handleCompositionStart);
    mobileTextInput.addEventListener('compositionend', handleCompositionEnd);
  }

  // 绑定发送按钮事件
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
}

function getDefaultApiUrl() {
  if (window.location.hostname === 'localhost' && window.location.port === '8000') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
