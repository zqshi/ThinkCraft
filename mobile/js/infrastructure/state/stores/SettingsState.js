import { StateStore } from '../core/StateStore.js';

/**
 * 设置状态管理
 */
export class SettingsState extends StateStore {
  constructor() {
    super({
      darkMode: false,
      saveHistory: true,
      apiUrl: 'http://localhost:3000',
      language: 'zh-CN',
      fontSize: 'medium', // 'small' | 'medium' | 'large'
      autoSave: true,
      notifications: true,
      theme: 'default'
    });
  }

  // ========== Getters ==========

  isDarkMode() {
    return this._state.darkMode;
  }

  isSaveHistory() {
    return this._state.saveHistory;
  }

  getApiUrl() {
    return this._state.apiUrl;
  }

  getLanguage() {
    return this._state.language;
  }

  getFontSize() {
    return this._state.fontSize;
  }

  isAutoSave() {
    return this._state.autoSave;
  }

  isNotifications() {
    return this._state.notifications;
  }

  getTheme() {
    return this._state.theme;
  }

  getAllSettings() {
    return this.getState();
  }

  // ========== Setters ==========

  setDarkMode(darkMode) {
    this.setState({ darkMode });
  }

  toggleDarkMode() {
    this.setState({ darkMode: !this._state.darkMode });
  }

  setSaveHistory(saveHistory) {
    this.setState({ saveHistory });
  }

  setApiUrl(apiUrl) {
    this.setState({ apiUrl });
  }

  setLanguage(language) {
    this.setState({ language });
  }

  setFontSize(fontSize) {
    this.setState({ fontSize });
  }

  setAutoSave(autoSave) {
    this.setState({ autoSave });
  }

  setNotifications(notifications) {
    this.setState({ notifications });
  }

  setTheme(theme) {
    this.setState({ theme });
  }

  // ========== 批量更新 ==========

  updateSettings(settings) {
    this.setState(settings);
  }

  // ========== 重置 ==========

  resetToDefaults() {
    this.reset({
      darkMode: false,
      saveHistory: true,
      apiUrl: 'http://localhost:3000',
      language: 'zh-CN',
      fontSize: 'medium',
      autoSave: true,
      notifications: true,
      theme: 'default'
    });
  }

  // ========== 导入/导出 ==========

  exportSettings() {
    return JSON.stringify(this.getState(), null, 2);
  }

  importSettings(jsonString) {
    try {
      const settings = JSON.parse(jsonString);
      this.setState(settings);
      return true;
    } catch (error) {
      console.error('[SettingsState] Import failed:', error);
      return false;
    }
  }
}

// 导出单例
export const settingsState = new SettingsState();
