/**
 * UI控制器模块
 * 负责界面交互和设置管理
 */

/* eslint-disable no-unused-vars, no-undef */

class UIController {
    constructor() {
        this.state = window.state;
    }

    /**
     * 切换侧边栏
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    }

    /**
     * 切换侧边栏标签页
     * @param {string} tab - 标签页名称
     */
    switchSidebarTab(tab) {
        const tabs = document.querySelectorAll('.sidebar-tab');
        const contents = document.querySelectorAll('.sidebar-content');

        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        const activeContent = document.getElementById(`${tab}Tab`);

        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    /**
     * 显示设置
     */
    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * 关闭设置
     */
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 切换深色模式
     */
    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
    }

    /**
     * 切换保存历史
     */
    toggleSaveHistory() {
        if (this.state && this.state.settings) {
            this.state.settings.saveHistory = !this.state.settings.saveHistory;
            localStorage.setItem('saveHistory', this.state.settings.saveHistory);
        }
    }

    /**
     * 切换团队功能
     * @param {boolean} toggle - 是否启用
     */
    toggleTeamFeature(toggle) {
        console.log('切换团队功能:', toggle);
        // 实现团队功能切换逻辑
    }

    /**
     * 处理登出
     */
    handleLogout() {
        if (confirm('确定要退出登录吗？')) {
            localStorage.clear();
            window.location.reload();
        }
    }

    /**
     * 打开底部设置
     */
    openBottomSettings() {
        const panel = document.getElementById('bottomSettingsPanel');
        if (panel) {
            panel.style.display = 'block';
        }
    }

    /**
     * 关闭底部设置
     */
    closeBottomSettings() {
        const panel = document.getElementById('bottomSettingsPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * 初始化UI控制器
     */
    init() {
        // 加载深色模式设置
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
        }

        // 加载保存历史设置
        if (this.state && this.state.settings) {
            const saveHistory = localStorage.getItem('saveHistory');
            if (saveHistory !== null) {
                this.state.settings.saveHistory = saveHistory === 'true';
            }
        }
    }
}

// 创建全局实例
window.uiController = new UIController();

// 暴露全局函数（向后兼容）
function toggleSidebar() {
    window.uiController.toggleSidebar();
}

function switchSidebarTab(tab) {
    window.uiController.switchSidebarTab(tab);
}

function showSettings() {
    window.uiController.showSettings();
}

function closeSettings() {
    window.uiController.closeSettings();
}

function toggleDarkMode() {
    window.uiController.toggleDarkMode();
}

function toggleSaveHistory() {
    window.uiController.toggleSaveHistory();
}

function toggleTeamFeature(toggle) {
    window.uiController.toggleTeamFeature(toggle);
}

function handleLogout() {
    window.uiController.handleLogout();
}

function openBottomSettings() {
    window.uiController.openBottomSettings();
}

function closeBottomSettings() {
    window.uiController.closeBottomSettings();
}
