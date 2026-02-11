/**
 * ProjectManager 项目列表渲染模块
 */

window.projectManagerProjectList = {
  renderProjectList(pm, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    if (
      !pm.projectsLoaded &&
      !pm.projectsLoadPromise &&
      (pm.storageManager || window.storageManager) &&
      !pm._projectListBootstrapInProgress
    ) {
      pm._projectListBootstrapInProgress = true;
      (async () => {
        try {
          await pm.loadProjects();
          if (pm.projectsLoaded) {
            pm.renderProjectList(containerId);
          }
        } catch (_error) {
          // ignore initial load failures
        } finally {
          pm._projectListBootstrapInProgress = false;
        }
      })();
    }

    const visibleProjects = pm.projects.filter(project => project.status !== 'deleted');
    const headerHTML = `
            <div class="project-list-header">
                <div class="project-list-title">
                    项目空间
                    <span class="project-list-count">${visibleProjects.length}</span>
                </div>
                <button class="btn-primary btn-compact" onclick="projectManager.showCreateProjectDialog()">
                    新建项目
                </button>
            </div>
        `;

    if (visibleProjects.length === 0) {
      container.innerHTML = `
                <div class="project-list">
                    ${headerHTML}
                    <div class="project-list-empty">
                        <div class="project-list-empty-title">还没有项目</div>
                        <div class="project-list-empty-sub">从创意对话或知识库引入内容，快速建立项目空间</div>
                        <button class="btn-primary btn-compact" onclick="projectManager.showCreateProjectDialog()">
                            新建项目
                        </button>
                    </div>
                </div>
            `;
      return;
    }

    const projectCardsHTML = visibleProjects.map(project => pm.renderProjectCard(project)).join('');

    container.innerHTML = `
            <div class="project-list">
                ${headerHTML}
                <div class="project-list-grid">
                    ${projectCardsHTML}
                </div>
            </div>
        `;
  },

  renderProjectCard(pm, project) {
    const statusText =
      {
        planning: '规划中',
        active: '进行中',
        in_progress: '进行中',
        testing: '测试中',
        completed: '已完成',
        archived: '已归档',
        on_hold: '已暂停',
        cancelled: '已取消'
      }[project.status] || project.status;

    const timeAgo = project.updatedAt ? pm.formatTimeAgo(project.updatedAt) : '刚刚';
    const isActive = pm.currentProjectId === project.id;
    const statusClass = `status-${project.status || 'planning'}`;
    const memberCount = (project.assignedAgents || []).length;
    const ideaCount = project.ideaId ? 1 : 0;
    const stages = project.workflow?.stages || [];
    const stageCount = stages.length;
    const completedStages = stages.filter(stage => stage.status === 'completed').length;
    const pendingStages = Math.max(stageCount - completedStages, 0);
    const hasStageActivity = stages.some(stage => stage.status && stage.status !== 'pending');
    const hasStageArtifacts = stages.some(
      stage => Array.isArray(stage.artifacts) && stage.artifacts.length > 0
    );
    const showStageProgress =
      Boolean(project.collaborationExecuted) || hasStageActivity || hasStageArtifacts;
    const progress = pm.calculateWorkflowProgress(project.workflow);
    const metaItems = showStageProgress
      ? [`更新 ${timeAgo}`, `阶段 ${stageCount}`, `待完成 ${pendingStages}`]
      : [`更新 ${timeAgo}`, '阶段 未生成'];

    const contentHTML = showStageProgress
      ? `
                <div class="project-card-progress-row">
                    <div class="project-card-progress-label">进度 ${progress}%</div>
                    <div class="project-card-progress">
                        <span style="width: ${progress}%;"></span>
                    </div>
                </div>
            `
      : '';

    return `
            <div class="project-card${isActive ? ' active' : ''}" data-project-id="${project.id}" onclick="projectManager.openProject('${project.id}')">
                <div class="project-card-head">
                    <div class="project-card-title-row">
                        <div class="project-card-title">${pm.escapeHtml(project.name)}</div>
                    </div>
                    <div class="project-card-badges">
                        <span class="project-pill ${statusClass}">${statusText}</span>
                    </div>
                    <div class="project-card-meta">
                        ${metaItems
                          .map(
                            (item, index) => `
                            ${index ? '<span class="project-card-meta-dot"></span>' : ''}
                            <span>${item}</span>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                <div class="project-card-kpis">
                    <div class="project-card-kpi">
                        <span>成员</span>
                        <strong>${memberCount}</strong>
                    </div>
                    <div class="project-card-kpi">
                        <span>创意</span>
                        <strong>${ideaCount}</strong>
                    </div>
                    <div class="project-card-kpi">
                        <span>进度</span>
                        <strong>${showStageProgress ? `${progress}%` : '-'}</strong>
                    </div>
                </div>
                ${contentHTML}
            </div>
        `;
  }
};
