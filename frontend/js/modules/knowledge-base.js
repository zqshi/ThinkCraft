/**
 * 知识库模块
 * 负责知识库的展示和管理
 */

/* eslint-disable no-unused-vars, no-undef */

class KnowledgeBase {
    constructor() {
        this.state = window.state;
    }

    /**
     * 显示知识库
     */
    showKnowledgeBase() {
        const modal = document.getElementById('knowledgeBaseModal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadKnowledgeList();
        }
    }

    /**
     * 关闭知识库
     */
    closeKnowledgeBase() {
        const modal = document.getElementById('knowledgeBaseModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 切换知识库组织方式
     * @param {string} type - 组织类型
     */
    switchKnowledgeOrg(type) {
        console.log('切换知识库组织方式:', type);
        // 实现知识库组织切换逻辑
    }

    /**
     * 搜索知识库
     * @param {string} keyword - 搜索关键词
     */
    onKnowledgeSearch(keyword) {
        console.log('搜索知识库:', keyword);
        // 实现搜索逻辑
    }

    /**
     * 创建新知识
     */
    createKnowledge() {
        console.log('创建新知识');
        // 实现创建知识逻辑
    }

    /**
     * 加载知识列表
     */
    loadKnowledgeList() {
        // 实现加载知识列表逻辑
        console.log('加载知识列表');
    }
}

// 创建全局实例
window.knowledgeBase = new KnowledgeBase();

// 暴露全局函数（向后兼容）
function showKnowledgeBase() {
    window.knowledgeBase.showKnowledgeBase();
}

function closeKnowledgeBase() {
    window.knowledgeBase.closeKnowledgeBase();
}

function switchKnowledgeOrg(type) {
    window.knowledgeBase.switchKnowledgeOrg(type);
}

function onKnowledgeSearch(keyword) {
    window.knowledgeBase.onKnowledgeSearch(keyword);
}

function createKnowledge() {
    window.knowledgeBase.createKnowledge();
}
