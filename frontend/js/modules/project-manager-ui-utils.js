/**
 * Project Manager UI Utils
 * Keep small UI helpers out of the main ProjectManager class file.
 */

(function initProjectManagerUiUtils(global) {
  const logger = global.createLogger ? global.createLogger('ProjectManagerUiUtils') : console;

  const api = {
    calculateWorkflowProgress(ctx, workflow) {
      if (!workflow || !Array.isArray(workflow.stages) || workflow.stages.length === 0) {
        return 0;
      }
      const completedStages = workflow.stages.filter(stage => stage.status === 'completed').length;
      return Math.round((completedStages / workflow.stages.length) * 100);
    },

    switchStage(ctx, stageId) {
      if (!ctx.currentProject || !stageId) {
        return;
      }
      ctx.currentStageId = stageId;
      ctx.renderStageContent(ctx.currentProject, stageId);

      const tabs = document.querySelectorAll('.project-stage-tab');
      tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.stageId === stageId);
      });
    },

    selectStage(ctx, stageId) {
      ctx.currentStageId = stageId;

      document.querySelectorAll('.workflow-step').forEach(step => {
        step.classList.toggle('selected', step.dataset.stageId === stageId);
      });

      document.querySelectorAll('.workflow-stage-detail').forEach(detail => {
        detail.classList.toggle('active', detail.dataset.stageId === stageId);
      });
    },

    viewAllArtifacts(ctx, projectId, stageId) {
      logger.info('查看所有交付物:', projectId, stageId);
    },

    confirmStage(ctx, stageId) {
      global.modalManager?.alert(`已确认阶段 ${stageId}`, 'success');
    },

    requestStageRevision(ctx, stageId) {
      global.modalManager?.alert(`已退回阶段 ${stageId}，请补充意见`, 'warning');
    },

    addStageNote(_ctx, _stageId) {
      const note = prompt('请输入补充意见：');
      if (!note) {
        return;
      }
      global.modalManager?.alert('已记录补充意见', 'success');
    },

    loadChatFromProject(ctx, chatId) {
      if (typeof global.loadChat === 'function') {
        global.loadChat(chatId);
      }
    }
  };

  global.projectManagerUiUtils = api;
})(window);
