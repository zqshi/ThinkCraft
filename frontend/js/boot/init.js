/**
 * App initialization (extracted from inline boot)
 */
function initApp() {
  // 一次性清理：只保留mock数据
  const saved = localStorage.getItem('thinkcraft_chats');
  if (saved && saved !== '[]') {
    try {
      const allChats = JSON.parse(saved);
      const mockChatIds = ['demo_fitness_app', 'chat_001', 'chat_002'];
      const filteredChats = allChats.filter(chat => mockChatIds.includes(chat.id));

      if (filteredChats.length < 3) {
        localStorage.removeItem('thinkcraft_chats');
      } else {
        localStorage.setItem('thinkcraft_chats', JSON.stringify(filteredChats));
      }
    } catch (e) {
      localStorage.removeItem('thinkcraft_chats');
    }
  }

  updateUserNameDisplay();

  loadChats();
  loadSettings();
  focusInput();

  window.modalManager = new ModalManager();
  window.storageManager = new StorageManager();
  const savedSettings = JSON.parse(localStorage.getItem('thinkcraft_settings') || '{}');
  const apiUrl = savedSettings.apiUrl || state.settings.apiUrl || 'http://localhost:3000';
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
    .then(() => {
      loadGenerationStates();
    })
    .catch(error => {});

  window.stateManager.subscribe(newState => {
    updateGenerationButtonState(newState.generation);
  });

  setTimeout(() => {
    if (!state.currentChat && state.chats.length > 0) {
      const demoChat = state.chats.find(c => c.id === 'demo_fitness_app');
      if (demoChat) {
        loadChat(demoChat.id);
      }
    }
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
