/**
 * UI控制器模块
 * 负责界面交互和设置管理
 */

/* eslint-disable no-unused-vars, no-undef */

// 创建日志实例
var logger = window.createLogger ? window.createLogger('UIController') : console;


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
        const views = document.querySelectorAll('.sidebar-view');

        tabs.forEach(t => t.classList.remove('active'));
        views.forEach(v => v.style.display = 'none');

        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        const activeView = document.getElementById(`${tab}View`);

        if (activeTab) activeTab.classList.add('active');
        if (activeView) activeView.style.display = 'block';

        // 切换到项目空间时，渲染项目列表
        if (tab === 'team' && window.projectManager && window.projectManager.renderProjectList) {
            window.projectManager.renderProjectList('projectListContainer');
        }
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
        logger.debug('切换团队功能:', toggle);
        // 实现团队功能切换逻辑
    }

    /**
     * 打开底部设置
     */
    openBottomSettings() {
        const panel = document.getElementById('bottomSettingsSheet');  // ✅ 修正ID
        if (panel) {
            panel.style.display = 'block';
            logger.debug('✅ 底部设置面板已打开');
        } else {
            console.error('❌ 找不到 bottomSettingsSheet 元素');
        }
    }

    /**
     * 关闭底部设置
     */
    closeBottomSettings() {
        const panel = document.getElementById('bottomSettingsSheet');  // ✅ 修正ID
        if (panel) {
            panel.style.display = 'none';
            logger.debug('✅ 底部设置面板已关闭');
        } else {
            console.error('❌ 找不到 bottomSettingsSheet 元素');
        }
    }

    /**
     * 关闭章节选择弹窗
     */
    closeChapterSelection() {
        const modal = document.getElementById('chapterSelectionModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 关闭商业计划书弹窗
     */
    closeBusinessReport() {
        const modal = document.getElementById('businessReportModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 关闭项目弹窗
     */
    closeProjectModal() {
        const modal = document.getElementById('projectModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 关闭Agent市场弹窗
     */
    closeAgentMarket() {
        const modal = document.getElementById('agentMarketModal');
        if (modal) {
            modal.style.display = 'none';
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

function openBottomSettings() {
    window.uiController.openBottomSettings();
}

function closeBottomSettings() {
    window.uiController.closeBottomSettings();
}

function closeChapterSelection() {
    window.uiController.closeChapterSelection();
}

function closeBusinessReport() {
    window.uiController.closeBusinessReport();
}

function closeProjectModal() {
    window.uiController.closeProjectModal();
}

function closeAgentMarket() {
    window.uiController.closeAgentMarket();
}

// 暴露全局函数（用于 HTML onclick 事件）
window.toggleSidebar = toggleSidebar;
window.switchSidebarTab = switchSidebarTab;
window.showSettings = showSettings;
window.closeSettings = closeSettings;
window.toggleDarkMode = toggleDarkMode;
window.toggleSaveHistory = toggleSaveHistory;
window.toggleTeamFeature = toggleTeamFeature;
window.openBottomSettings = openBottomSettings;
window.closeBottomSettings = closeBottomSettings;
window.closeChapterSelection = closeChapterSelection;
window.closeBusinessReport = closeBusinessReport;
window.closeProjectModal = closeProjectModal;
window.closeAgentMarket = closeAgentMarket;
