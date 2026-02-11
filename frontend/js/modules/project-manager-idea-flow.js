/**
 * ProjectManager 创意选择与项目创建流程模块
 * 说明：从 project-manager.js 拆分，保持原逻辑与提示文案。
 */

const ideaFlowLogger = window.createLogger
  ? window.createLogger('ProjectManagerIdeaFlow')
  : console;

window.projectManagerIdeaFlow = {
  async getAllChatsForIdeaSelection(pm) {
    let chats = [];
    if (pm.storageManager) {
      chats = await pm.storageManager.getAllChats().catch(() => []);
    }
    if (chats.length === 0) {
      chats = window.state?.chats ? [...window.state.chats] : [];
    }
    if (chats.length === 0) {
      const saved = localStorage.getItem('thinkcraft_chats');
      if (saved) {
        try {
          const parsedChats = JSON.parse(saved);
          if (Array.isArray(parsedChats)) {
            chats = parsedChats;
          }
        } catch (e) {
          ideaFlowLogger.error('Failed to parse chats from localStorage:', e);
        }
      }
    }
    return Array.isArray(chats) ? chats : [];
  },

  async showReplaceIdeaDialog(pm, projectId) {
    if (!window.modalManager) {
      alert('创意更换功能暂不可用');
      return;
    }

    const project = await pm.getProject(projectId);
    if (!project) {
      return;
    }

    let analyzedChats = await pm.getChatsWithCompletedAnalysis();
    if (analyzedChats.length === 0) {
      analyzedChats = await this.getAllChatsForIdeaSelection(pm);
      if (analyzedChats.length > 0) {
        window.modalManager.alert('未识别到分析报告，已回退为显示全部对话', 'info');
      }
    }
    const projects = await pm.storageManager.getAllProjects().catch(() => []);
    const activeProjects = projects.filter(p => p.status !== 'deleted');
    const chatIdToProjectName = new Map(
      activeProjects.map(p => [pm.normalizeIdeaIdForCompare(p.ideaId), p.name || '未命名项目'])
    );
    const chatIdsWithProjects = new Set(
      activeProjects.map(p => pm.normalizeIdeaIdForCompare(p.ideaId))
    );

    if (analyzedChats.length === 0) {
      window.modalManager.alert('暂无可用创意，请先创建对话', 'info');
      return;
    }

    const ideaListHTML = analyzedChats
      .map(chat => {
        const chatIdKey = pm.normalizeIdeaIdForCompare(chat.id);
        const isCurrent = chatIdKey === pm.normalizeIdeaIdForCompare(project.ideaId);
        const usedByOtherProject = chatIdsWithProjects.has(chatIdKey) && !isCurrent;
        const disabled = isCurrent || usedByOtherProject;
        const referencedBy = usedByOtherProject ? chatIdToProjectName.get(chatIdKey) : '';
        const hint = isCurrent
          ? '· 当前项目'
          : usedByOtherProject
            ? `· 已被项目“${pm.escapeHtml(referencedBy)}”引用`
            : '';
        return `
                <label class="idea-item ${disabled ? 'disabled' : ''}" style="display: flex; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; cursor: ${disabled ? 'not-allowed' : 'pointer'}; opacity: ${disabled ? '0.5' : '1'};">
                    <input type="radio" name="replaceIdea" value="${chat.id}" ${disabled ? 'disabled' : ''} style="margin-top: 4px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 4px;">${pm.escapeHtml(chat.title)}</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">
                            ${pm.formatTimeAgo(chat.updatedAt)}
                            ${hint}
                        </div>
                    </div>
                </label>
            `;
      })
      .join('');

    const dialogHTML = `
            <div style="max-height: 60vh; overflow-y: auto; padding: 4px;">
                <div style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
                    选择新的创意替换当前项目创意（将重新推荐流程）：
                </div>
                <div id="replaceIdeaList" style="display: flex; flex-direction: column; gap: 12px;">
                    ${ideaListHTML}
                </div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
                <button class="btn-secondary" onclick="window.modalManager.close('replaceIdeaDialog')" style="flex: 1;">取消</button>
                <button class="btn-primary" onclick="projectManager.confirmReplaceIdea('${project.id}')" style="flex: 1;">确认更换</button>
            </div>
        `;

    window.modalManager.showCustomModal('更换创意', dialogHTML, 'replaceIdeaDialog');
  },

  async confirmReplaceIdea(pm, projectId) {
    const selected = document.querySelector('input[name="replaceIdea"]:checked');
    if (!selected) {
      window.modalManager.alert('请选择一个创意', 'warning');
      return;
    }

    const project = await pm.getProject(projectId);
    if (!project) {
      return;
    }

    const ideaId = pm.normalizeIdeaId(selected.value);
    const updatedProject = await pm.updateProject(projectId, { ideaId, workflowCategory: null });
    const viewProject = updatedProject || { ...project, ideaId, workflowCategory: null };

    window.modalManager.close('replaceIdeaDialog');
    pm.renderProjectIdeasPanel(viewProject);
  },

  async saveIdeaKnowledge(pm, projectId, ideaId) {
    if (!pm.storageManager) {
      return;
    }

    try {
      const normalizedIdeaId = pm.normalizeIdeaId(ideaId);
      const chat =
        (await pm.storageManager.getChat(normalizedIdeaId)) ||
        (await pm.storageManager.getChat(ideaId));
      if (!chat) {
        return;
      }

      await pm.storageManager.saveKnowledge({
        projectId,
        scope: 'project',
        type: 'idea',
        title: chat.title || '创意摘要',
        content:
          chat.messages
            ?.slice(0, 3)
            .map(m => `${m.role}: ${m.content}`)
            .join('\n') || '',
        tags: ['创意引入'],
        createdAt: Date.now()
      });
    } catch (error) {
      // ignore knowledge write errors
    }
  },

  async showCreateProjectDialog(pm) {
    try {
      let chats = await pm.getChatsWithCompletedAnalysis();
      if (chats.length === 0) {
        chats = await this.getAllChatsForIdeaSelection(pm);
        if (chats.length > 0) {
          window.modalManager?.alert('未识别到分析报告，已回退为显示全部对话', 'info');
        }
      }

      const projects = await pm.storageManager.getAllProjects().catch(() => []);
      const activeProjects = projects.filter(p => p.status !== 'deleted');
      const chatIdToProjectName = new Map(
        activeProjects.map(p => [pm.normalizeIdeaIdForCompare(p.ideaId), p.name || '未命名项目'])
      );
      const chatIdsWithProjects = new Set(
        activeProjects.map(p => pm.normalizeIdeaIdForCompare(p.ideaId))
      );

      if (chats.length === 0) {
        window.modalManager?.alert('暂无可用创意，请先创建对话', 'info');
        return;
      }

      const ideaListHTML = chats
        .map(chat => {
          const chatIdKey = pm.normalizeIdeaIdForCompare(chat.id);
          const hasProject = chatIdsWithProjects.has(chatIdKey);
          const disabled = hasProject;
          const disabledClass = disabled ? 'disabled' : '';
          const disabledAttr = disabled ? 'disabled' : '';
          let hint = '';
          if (hasProject) {
            const projectName = chatIdToProjectName.get(chatIdKey);
            hint = `· 已被项目"${pm.escapeHtml(projectName || '未命名项目')}"引用`;
          }

          ideaFlowLogger.info('[创建项目对话框] 创意:', {
            id: chat.id,
            title: chat.title,
            disabled
          });

          return `
                    <label class="idea-item ${disabledClass}" style="display: flex; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; cursor: ${disabled ? 'not-allowed' : 'pointer'}; opacity: ${disabled ? '0.5' : '1'};">
                        <input type="radio" name="selectedIdea" value="${chat.id || ''}" ${disabledAttr} style="margin-top: 4px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; margin-bottom: 4px;">${pm.escapeHtml(chat.title)}</div>
                            <div style="font-size: 14px; color: var(--text-secondary);">
                                ${pm.formatTimeAgo(chat.updatedAt)}
                                ${hint}
                            </div>
                        </div>
                    </label>
                `;
        })
        .join('');

      const dialogHTML = `
                <div style="max-height: 60vh; overflow-y: auto; padding: 4px;">
                    <div style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
                        选择一个已完成分析的创意来创建项目：
                    </div>
                    <div id="ideaList" style="display: flex; flex-direction: column; gap: 12px;">
                        ${ideaListHTML}
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="window.modalManager.close('createProjectDialog')" style="flex: 1;">取消</button>
                    <button class="btn-primary" onclick="projectManager.confirmCreateProject()" style="flex: 1;">创建项目</button>
                </div>
            `;

      if (window.modalManager) {
        window.modalManager.showCustomModal('创建项目', dialogHTML, 'createProjectDialog');
      } else {
        const eligibleChats = chats.filter(
          chat => !chatIdsWithProjects.has(pm.normalizeIdeaIdForCompare(chat.id))
        );
        const chatTitles = eligibleChats.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
        const choice = prompt(`选择创意（输入序号）：\n\n${chatTitles}`);
        if (choice) {
          const index = parseInt(choice) - 1;
          if (index >= 0 && index < eligibleChats.length) {
            const chat = eligibleChats[index];
            await pm.createProjectFromIdea(chat.id, chat.title);
          }
        }
      }
    } catch (error) {
      alert('显示对话框失败: ' + error.message);
    }
  },

  hasCompletedAnalysisReport(pm, report) {
    if (!report || !report.chatId) {
      return false;
    }
    const reportType = String(report.type || '').toLowerCase();
    const isAnalysisType =
      reportType === 'analysis' ||
      reportType === 'analysis-report' ||
      reportType === 'analysis_report';
    if (!isAnalysisType) {
      return false;
    }
    const normalizedStatus = String(report.status || '').toLowerCase();
    const statusCompleted =
      normalizedStatus === 'completed' ||
      normalizedStatus === 'success' ||
      normalizedStatus === 'done' ||
      normalizedStatus === 'finished';
    if (!statusCompleted && normalizedStatus) {
      return false;
    }
    const data = report.data || {};
    const chapters = data.chapters;
    const hasChapters = Array.isArray(chapters)
      ? chapters.length > 0
      : chapters && typeof chapters === 'object'
        ? Object.keys(chapters).length > 0
        : false;
    const hasDocument = typeof data.document === 'string' && data.document.trim().length > 0;
    return hasChapters || hasDocument;
  },

  async getChatsWithCompletedAnalysis(pm) {
    let chats = [];
    if (pm.storageManager) {
      chats = await pm.storageManager.getAllChats().catch(() => []);
    }
    if (chats.length === 0) {
      chats = window.state?.chats ? [...window.state.chats] : [];
    }
    if (chats.length === 0) {
      const saved = localStorage.getItem('thinkcraft_chats');
      if (saved) {
        try {
          const parsedChats = JSON.parse(saved);
          if (Array.isArray(parsedChats)) {
            chats = parsedChats;
          }
        } catch (e) {
          ideaFlowLogger.error('Failed to parse chats from localStorage:', e);
        }
      }
    }

    const reports = await pm.storageManager?.getAllReports?.().catch(() => []);
    const analysisChatIds = new Set();
    (Array.isArray(reports) ? reports : []).forEach(report => {
      if (pm.hasCompletedAnalysisReport(report)) {
        analysisChatIds.add(pm.normalizeIdeaIdForCompare(report.chatId));
      }
    });
    chats.forEach(chat => {
      const reportStateStatus = String(chat?.reportState?.analysis?.status || '').toLowerCase();
      const chatMarkedCompleted =
        chat?.analysisCompleted === true ||
        reportStateStatus === 'completed' ||
        reportStateStatus === 'success' ||
        reportStateStatus === 'done' ||
        reportStateStatus === 'finished';
      if (chatMarkedCompleted) {
        analysisChatIds.add(pm.normalizeIdeaIdForCompare(chat.id));
      }
    });
    return chats.filter(chat => analysisChatIds.has(pm.normalizeIdeaIdForCompare(chat.id)));
  },

  async filterCompletedIdeas(pm, chats = []) {
    if (!Array.isArray(chats) || chats.length === 0) {
      return [];
    }
    const reports = await pm.storageManager?.getAllReports?.().catch(() => []);
    const analysisChatIds = new Set();
    (Array.isArray(reports) ? reports : []).forEach(report => {
      if (pm.hasCompletedAnalysisReport(report)) {
        analysisChatIds.add(pm.normalizeIdeaIdForCompare(report.chatId));
      }
    });
    chats.forEach(chat => {
      const reportStateStatus = String(chat?.reportState?.analysis?.status || '').toLowerCase();
      const chatMarkedCompleted =
        chat?.analysisCompleted === true ||
        reportStateStatus === 'completed' ||
        reportStateStatus === 'success' ||
        reportStateStatus === 'done' ||
        reportStateStatus === 'finished';
      if (chatMarkedCompleted) {
        analysisChatIds.add(pm.normalizeIdeaIdForCompare(chat.id));
      }
    });
    return chats.filter(chat => analysisChatIds.has(pm.normalizeIdeaIdForCompare(chat.id)));
  },

  async confirmCreateProject(pm) {
    try {
      const selectedIdeaInput = document.querySelector('input[name="selectedIdea"]:checked');
      if (!selectedIdeaInput) {
        if (window.modalManager) {
          window.modalManager.alert('请选择一个创意', 'warning');
        } else {
          alert('请选择一个创意');
        }
        return;
      }

      const ideaId = selectedIdeaInput.value;

      ideaFlowLogger.info('[创建项目] 选中的创意ID:', ideaId, '类型:', typeof ideaId);

      if (!ideaId || ideaId.trim() === '') {
        ideaFlowLogger.error('[创建项目] 创意ID为空');
        if (window.modalManager) {
          window.modalManager.alert('创意ID无效，请重新选择', 'warning');
        } else {
          alert('创意ID无效，请重新选择');
        }
        return;
      }

      const normalizedIdeaId = pm.normalizeIdeaId(ideaId);
      ideaFlowLogger.info(
        '[创建项目] 规范化后的ID:',
        normalizedIdeaId,
        '类型:',
        typeof normalizedIdeaId
      );

      if (!normalizedIdeaId) {
        ideaFlowLogger.error('[创建项目] 规范化后的ID为空');
        if (window.modalManager) {
          window.modalManager.alert('创意ID格式错误，请重新选择', 'warning');
        } else {
          alert('创意ID格式错误，请重新选择');
        }
        return;
      }

      let chat = await pm.storageManager.getChat(normalizedIdeaId);

      if (!chat) {
        chat = await pm.storageManager.getChat(ideaId);
      }

      if (!chat && ideaId.startsWith('idea-')) {
        const rawId = ideaId.replace('idea-', '');
        chat = await pm.storageManager.getChat(rawId);
      }

      let projectName = '新项目';
      if (chat) {
        if (chat.title && chat.title.trim()) {
          projectName = `${chat.title.trim()} - 项目`;
        } else {
          const idParts = ideaId.split('-');
          const shortId = idParts[idParts.length - 1];
          projectName = `创意${shortId} - 项目`;
        }
      } else {
        ideaFlowLogger.warn('未找到创意对话，使用默认项目名称', { ideaId, normalizedIdeaId });
      }

      if (window.modalManager) {
        window.modalManager.close('createProjectDialog');
      }

      await pm.createProjectFromIdea(normalizedIdeaId, projectName);
    } catch (error) {
      ideaFlowLogger.error('创建项目失败:', error);
      if (window.modalManager) {
        window.modalManager.alert('创建项目失败: ' + error.message, 'error');
      } else {
        alert('创建项目失败: ' + error.message);
      }
    }
  },

  async createProjectWithWorkflow(pm, ideaId, name, selectedStages) {
    const project = await pm.createProject(ideaId, name);
    const workflowCategory = project.workflowCategory || 'product-development';

    if (selectedStages && selectedStages.length > 0 && project.workflow) {
      project.workflow.stages = project.workflow.stages.filter(stage =>
        selectedStages.includes(stage.id)
      );
      await pm.storageManager.saveProject(project);
    }

    await pm.updateProject(project.id, { workflowCategory });
    await pm.applyWorkflowCategory(project.id, workflowCategory);

    await pm.loadProjects();
    pm.renderProjectList('projectListContainer');

    if (window.modalManager) {
      window.modalManager.alert(
        `项目创建成功！<br><br>名称：${pm.escapeHtml(name)}<br>阶段数：${selectedStages.length}`,
        'success'
      );
    } else {
      alert('项目创建成功！');
    }
  },

  async createProjectFromIdea(pm, ideaId, name) {
    const project = await pm.createProject(ideaId, name);
    const workflowCategory = project.workflowCategory || 'product-development';

    await pm.updateProject(project.id, { workflowCategory });
    if (!project.collaborationSuggestion?.stages?.length) {
      await pm.applyWorkflowCategory(project.id, workflowCategory);
    }
    await pm.saveIdeaKnowledge(project.id, ideaId);
    await pm.hydrateProjectStageOutputs(project);

    await pm.loadProjects();
    pm.renderProjectList('projectListContainer');

    if (window.modalManager) {
      window.modalManager.alert(`项目创建成功！<br><br>名称：${pm.escapeHtml(name)}`, 'success');
    } else {
      alert('项目创建成功！');
    }
  }
};
