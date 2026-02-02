/**
 * 全局函数桥接层
 *
 * 为 HTML 内联事件处理器提供全局函数包装器
 * 所有函数都是薄包装器，实际逻辑在各自模块中
 *
 * 创建时间: 2026-01-31
 * 目的: 解决重构后 HTML onclick 引用未定义函数的问题
 */

/* eslint-disable no-unused-vars, no-undef */

// ============================================================================
// 商业计划书生成相关
// ============================================================================

/**
 * 开始生成商业计划书
 * HTML调用位置: index.html:571
 */
function startGeneration() {
    if (!window.businessPlanGenerator) {
        console.error('[startGeneration] businessPlanGenerator 未初始化');
        alert('系统错误：商业计划书生成器未初始化，请刷新页面重试');
        return;
    }

    try {
        window.businessPlanGenerator.startGeneration();
    } catch (error) {
        console.error('[startGeneration] 执行失败:', error);
        alert(`启动生成失败：${error.message}`);
    }
}

/**
 * 取消生成进度
 * HTML调用位置: index.html:602
 */
function cancelGeneration() {
    if (!window.agentProgressManager) {
        console.error('[cancelGeneration] agentProgressManager 未初始化');
        alert('系统错误：进度管理器未初始化，请刷新页面重试');
        return;
    }

    try {
        window.agentProgressManager.cancel();
    } catch (error) {
        console.error('[cancelGeneration] 执行失败:', error);
        alert(`取消生成失败：${error.message}`);
    }
}

/**
 * 调整商业计划书章节
 * HTML调用位置: index.html:627
 */
function adjustBusinessReportChapters() {
    try {
        // 1. 获取当前报告类型
        const reportModal = document.getElementById('businessReportModal');
        const reportType = reportModal?.dataset?.reportType || 'business';

        console.log('[adjustBusinessReportChapters] 当前报告类型:', reportType);

        // 2. 关闭报告模态框
        if (reportModal) {
            reportModal.style.display = 'none';
        }

        // 3. 调用 showChapterSelection 渲染章节列表
        if (window.businessPlanGenerator) {
            window.businessPlanGenerator.showChapterSelection(reportType);
            console.log('[adjustBusinessReportChapters] 已调用 showChapterSelection');
        } else {
            throw new Error('BusinessPlanGenerator 未初始化');
        }
    } catch (error) {
        console.error('[adjustBusinessReportChapters] 执行失败:', error);
        alert(`调整章节失败：${error.message}`);
    }
}

/**
 * 重新生成商业计划书
 * HTML调用位置: index.html:628
 */
function regenerateBusinessReport() {
    if (!window.businessPlanGenerator) {
        console.error('[regenerateBusinessReport] businessPlanGenerator 未初始化');
        alert('系统错误：商业计划书生成器未初始化，请刷新页面重试');
        return;
    }

    try {
        // 确认对话框
        if (!confirm('确定要重新生成商业计划书吗？\n\n当前报告内容将被覆盖。')) {
            return;
        }

        // 关闭报告模态框
        const reportModal = document.getElementById('businessReportModal');
        if (reportModal) {
            reportModal.style.display = 'none';
        }

        // 调用生成器的重新生成方法
        window.businessPlanGenerator.startGeneration();
    } catch (error) {
        console.error('[regenerateBusinessReport] 执行失败:', error);
        alert(`重新生成失败：${error.message}`);
    }
}

/**
 * 分享商业计划书
 * HTML调用位置: index.html:630
 */
function shareBusinessReport() {
    if (!window.businessPlanGenerator) {
        console.error('[shareBusinessReport] businessPlanGenerator 未初始化');
        alert('系统错误：商业计划书生成器未初始化，请刷新页面重试');
        return;
    }

    try {
        window.businessPlanGenerator.shareReport();
    } catch (error) {
        console.error('[shareBusinessReport] 执行失败:', error);
        alert(`分享失败：${error.message}`);
    }
}

// ============================================================================
// 团队协作相关
// ============================================================================

/**
 * 显示添加成员模态框
 * HTML调用位置: index.html:920
 */
function showAddMember() {
    if (!window.teamCollaboration) {
        console.error('[showAddMember] teamCollaboration 未初始化');
        alert('系统错误：团队协作模块未初始化，请刷新页面重试');
        return;
    }

    try {
        window.teamCollaboration.showAddMember();
    } catch (error) {
        console.error('[showAddMember] 执行失败:', error);
        alert(`显示添加成员界面失败：${error.message}`);
    }
}

/**
 * 切换添加成员标签页
 * HTML调用位置: index.html:956,957
 * @param {string} tab - 标签页名称 ('market' 或 'hired')
 */
function switchAddMemberTab(tab) {
    if (!window.teamCollaboration) {
        console.error('[switchAddMemberTab] teamCollaboration 未初始化');
        alert('系统错误：团队协作模块未初始化，请刷新页面重试');
        return;
    }

    try {
        window.teamCollaboration.switchAddMemberTab(tab);
    } catch (error) {
        console.error('[switchAddMemberTab] 执行失败:', error);
        alert(`切换标签页失败：${error.message}`);
    }
}

/**
 * 切换员工市场标签页
 * HTML调用位置: index.html:996,997
 * @param {string} tab - 标签页名称
 */
function switchMarketTab(tab) {
    try {
        // 获取所有市场标签按钮和内容
        const tabButtons = document.querySelectorAll('.market-tabs .tab-btn');
        const tabContents = document.querySelectorAll('.market-tab-content');

        // 移除所有active状态
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // 添加active状态到当前标签
        const activeButton = document.querySelector(`.market-tabs .tab-btn[onclick*="${tab}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        const activeContent = document.getElementById(`${tab}Tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        } else {
            console.warn('[switchMarketTab] 未找到标签内容:', tab);
        }
    } catch (error) {
        console.error('[switchMarketTab] 执行失败:', error);
        alert(`切换市场标签失败：${error.message}`);
    }
}

// ============================================================================
// 知识库相关
// ============================================================================

/**
 * 切换知识库组织方式
 * HTML调用位置: index.html:658,659,660
 * @param {string} orgType - 组织方式 ('type', 'timeline', 'tags')
 *
 * 注意: 这是一个别名函数，实际调用 switchKnowledgeOrg()
 */
function switchKnowledgeOrganization(orgType) {
    if (typeof switchKnowledgeOrg !== 'function') {
        console.error('[switchKnowledgeOrganization] switchKnowledgeOrg 函数未定义');
        alert('系统错误：知识库切换功能未初始化，请刷新页面重试');
        return;
    }

    try {
        switchKnowledgeOrg(orgType);
    } catch (error) {
        console.error('[switchKnowledgeOrganization] 执行失败:', error);
        alert(`切换知识库组织方式失败：${error.message}`);
    }
}

// ============================================================================
// 全局暴露
// ============================================================================

// 商业计划书生成相关
window.startGeneration = startGeneration;
window.cancelGeneration = cancelGeneration;
window.adjustBusinessReportChapters = adjustBusinessReportChapters;
window.regenerateBusinessReport = regenerateBusinessReport;
window.shareBusinessReport = shareBusinessReport;

// 团队协作相关
window.showAddMember = showAddMember;
window.switchAddMemberTab = switchAddMemberTab;
window.switchMarketTab = switchMarketTab;

// 知识库相关
window.switchKnowledgeOrganization = switchKnowledgeOrganization;

// ✅ 确保关闭函数正确暴露
if (!window.closeBusinessReport) {
  window.closeBusinessReport = function () {
    console.log('[global-bridges] 调用 closeBusinessReport');
    if (window.uiController) {
      window.uiController.closeBusinessReport();
    } else {
      // 降级处理
      const modal = document.getElementById('businessReportModal');
      if (modal) {
        modal.style.display = 'none';
        console.log('[global-bridges] 降级关闭 businessReportModal');
      }
    }
  };
  console.log('[global-bridges] closeBusinessReport 已暴露');
}

console.log('[global-bridges] 全局函数桥接层已加载');
