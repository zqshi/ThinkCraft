import { StateStore } from '../core/StateStore.js';

/**
 * 对话状态管理
 */
export class ConversationState extends StateStore {
  constructor() {
    super({
      currentChat: null,
      chats: [],
      messages: [],
      userData: {},
      conversationStep: 0,
      isTyping: false,
      isLoading: false,
      analysisCompleted: false
    });
  }

  // ========== Getters ==========

  getCurrentChat() {
    return this._state.currentChat;
  }

  getMessages() {
    return [...this._state.messages];
  }

  getUserData() {
    return { ...this._state.userData };
  }

  getConversationStep() {
    return this._state.conversationStep;
  }

  isTyping() {
    return this._state.isTyping;
  }

  isLoading() {
    return this._state.isLoading;
  }

  isAnalysisCompleted() {
    return this._state.analysisCompleted;
  }

  // ========== Setters ==========

  setCurrentChat(chat) {
    this.setState({ currentChat: chat });
  }

  setMessages(messages) {
    this.setState({ messages: [...messages] });
  }

  setUserData(userData) {
    this.setState({ userData: { ...userData } });
  }

  updateUserData(key, value) {
    const userData = { ...this._state.userData };
    userData[key] = value;
    this.setState({ userData });
  }

  addMessage(message) {
    this.setState({
      messages: [...this._state.messages, message]
    });
  }

  updateMessage(index, updates) {
    const messages = [...this._state.messages];
    if (messages[index]) {
      messages[index] = { ...messages[index], ...updates };
      this.setState({ messages });
    }
  }

  setConversationStep(step) {
    this.setState({ conversationStep: step });
  }

  incrementConversationStep() {
    this.setState({
      conversationStep: this._state.conversationStep + 1
    });
  }

  setTyping(isTyping) {
    this.setState({ isTyping });
  }

  setLoading(isLoading) {
    this.setState({ isLoading });
  }

  setAnalysisCompleted(completed) {
    this.setState({ analysisCompleted: completed });
  }

  // ========== 复合操作 ==========

  startNewChat(chatId) {
    this.setState({
      currentChat: chatId,
      messages: [],
      conversationStep: 0,
      userData: {},
      analysisCompleted: false,
      isTyping: false,
      isLoading: false
    });
  }

  clearConversation() {
    this.setState({
      currentChat: null,
      messages: [],
      conversationStep: 0,
      userData: {},
      isTyping: false,
      isLoading: false,
      analysisCompleted: false
    });
  }

  loadChat(chat) {
    this.setState({
      currentChat: chat.id,
      messages: chat.messages || [],
      userData: chat.userData || {},
      conversationStep: chat.conversationStep || 0,
      analysisCompleted: chat.analysisCompleted || false,
      isTyping: false,
      isLoading: false
    });
  }
}

// 导出单例
export const conversationState = new ConversationState();
