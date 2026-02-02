/**
 * 设置管理模块
 * 负责应用设置的加载、保存和管理
 */

/* global state, initTeamSpace, updateTeamTabVisibility, switchSidebarTab */

// 创建日志实例
var logger = window.createLogger ? window.createLogger('Settings') : console;

class SettingsManager {
    constructor() {
        // 初始化设置管理模块
        this.initialized = false;
        // 延迟标记为已初始化，防止初始化时误触发
        setTimeout(() => {
            this.initialized = true;
        }, 1000);
    }

    /**
     * 显示设置弹窗
     */
    showSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }

    /**
     * 关闭设置弹窗
     */
    closeSettings() {
        if (window.modalManager && window.modalManager.isOpen('settingsModal')) {
            window.modalManager.close('settingsModal');
        } else {
            document.getElementById('settingsModal').classList.remove('active');
        }
    }

    /**
     * 打开底部设置面板（移动端）
     */
    openBottomSettings() {
        // 防止在初始化时立即触发
        if (!this.initialized) {
            logger.debug('SettingsManager not fully initialized yet');
            return;
        }

        const sheet = document.getElementById('bottomSettingsSheet');
        if (!sheet) return;

        sheet.classList.add('active');
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
    }

    /**
     * 关闭底部设置面板（移动端）
     */
    closeBottomSettings() {
        if (window.modalManager && window.modalManager.isOpen('bottomSettingsSheet')) {
            window.modalManager.close('bottomSettingsSheet');
        } else {
            const sheet = document.getElementById('bottomSettingsSheet');
            sheet.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * 加载设置
     */
    loadSettings() {
        const saved = localStorage.getItem('thinkcraft_settings');
        if (saved) {
            state.settings = JSON.parse(saved);
        }

        // 如果没有保存过enableTeam设置，默认启用
        if (state.settings.enableTeam === undefined) {
            state.settings.enableTeam = true;
            localStorage.setItem('thinkcraft_settings', JSON.stringify(state.settings));
        }

        const darkModeToggle = document.getElementById('darkModeToggle');
        const saveHistoryToggle = document.getElementById('saveHistoryToggle');
        const enableTeamToggle = document.getElementById('enableTeamToggle');
        const enableTeamToggle2 = document.getElementById('enableTeamToggle2');

        if (darkModeToggle) darkModeToggle.checked = state.settings.darkMode;
        if (saveHistoryToggle) saveHistoryToggle.checked = state.settings.saveHistory;

        // 初始化团队空间数据
        initTeamSpace();

        // 同步团队功能开关状态
        const enableTeam = state.settings.enableTeam || false;
        if (enableTeamToggle) enableTeamToggle.checked = enableTeam;
        if (enableTeamToggle2) enableTeamToggle2.checked = enableTeam;

        // 根据设置显示/隐藏团队Tab
        updateTeamTabVisibility();

        if (window.apiClient && window.apiClient.setBaseURL) {
            const host = window.location.hostname;
            const isLocalhost = host === 'localhost' || host === '127.0.0.1';
            const apiUrl = state.settings.apiUrl || ((isLocalhost && window.location.port !== '3000') ? 'http://localhost:3000' : window.location.origin);
            window.apiClient.setBaseURL(apiUrl);
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        localStorage.setItem('thinkcraft_settings', JSON.stringify(state.settings));
    }

    /**
     * 强制关闭所有设置弹窗（登出时调用）
     */
    forceCloseAllSettings() {
        console.log('[SettingsManager] 强制关闭所有设置弹窗');

        // 关闭桌面端设置弹窗
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.remove('active');
            settingsModal.style.display = 'none';
        }

        // 关闭移动端底部设置面板
        const bottomSheet = document.getElementById('bottomSettingsSheet');
        if (bottomSheet) {
            bottomSheet.classList.remove('active');
        }

        // 恢复body滚动
        document.body.style.overflow = '';
    }

    /**
     * 切换暗黑模式
     */
    toggleDarkMode() {
        state.settings.darkMode = document.getElementById('darkModeToggle').checked;
        this.saveSettings();
        alert('暗色模式功能开发中，敬请期待！');
    }

    /**
     * 切换团队功能
     * @param {HTMLInputElement} sourceToggle - 触发切换的开关元素
     */
    toggleTeamFeature(sourceToggle) {
        const primaryToggle = document.getElementById('enableTeamToggle');
        const secondaryToggle = document.getElementById('enableTeamToggle2');
        const enabled = sourceToggle ? sourceToggle.checked : primaryToggle.checked;

        // 更新state和同步两个checkbox
        state.settings.enableTeam = enabled;
        if (primaryToggle) {
            primaryToggle.checked = enabled;
        }
        if (secondaryToggle) {
            secondaryToggle.checked = enabled;
        }

        // 保存设置
        this.saveSettings();

        // 更新团队Tab的可见性
        updateTeamTabVisibility();

        // 如果禁用了团队功能且当前在团队Tab，切换回对话Tab
        if (!enabled) {
            const teamTab = document.querySelector('[data-tab="team"]');
            if (teamTab && teamTab.classList.contains('active')) {
                switchSidebarTab('chats');
            }
        }
    }

    /**
     * 更新团队Tab的可见性
     */
    updateTeamTabVisibility() {
        const teamTab = document.getElementById('teamTab');
        const sidebarTabs = document.querySelector('.sidebar-tabs');
        const enabled = state.settings.enableTeam || false;

        if (sidebarTabs) {
            // 控制整个Tab区域的显示/隐藏
            if (enabled) {
                sidebarTabs.classList.add('active');
            } else {
                sidebarTabs.classList.remove('active');
            }
        }

        if (teamTab) {
            // 控制团队Tab的显示/隐藏
            teamTab.style.display = enabled ? 'flex' : 'none';
        }
    }
}

// 导出为全局单例
window.settingsManager = new SettingsManager();

// 全局函数桥接（保持向后兼容）
window.showSettings = () => window.settingsManager?.showSettings();
window.closeSettings = () => window.settingsManager?.closeSettings();
window.openBottomSettings = () => window.settingsManager?.openBottomSettings();
window.closeBottomSettings = () => window.settingsManager?.closeBottomSettings();
window.loadSettings = () => window.settingsManager?.loadSettings();
window.saveSettings = () => window.settingsManager?.saveSettings();
window.toggleDarkMode = () => window.settingsManager?.toggleDarkMode();
window.toggleTeamFeature = (sourceToggle) => window.settingsManager?.toggleTeamFeature(sourceToggle);
window.updateTeamTabVisibility = () => window.settingsManager?.updateTeamTabVisibility();
window.forceCloseAllSettings = () => window.settingsManager?.forceCloseAllSettings();
