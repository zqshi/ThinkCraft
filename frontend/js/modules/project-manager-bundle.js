/**
 * ProjectManager 统一读取模型
 * 收口项目面板相关的项目/对话/报告/交付物/知识摘要读取。
 */

window.projectManagerBundle = {
  createEmptyReports() {
    return {
      analysis: null,
      business: null,
      proposal: null
    };
  },

  isCompletedStatus(status) {
    const normalized = String(status || '').toLowerCase();
    return (
      !normalized ||
      normalized === 'completed' ||
      normalized === 'success' ||
      normalized === 'done' ||
      normalized === 'finished'
    );
  },

  hasRenderableReportData(report) {
    const data = report?.data || {};
    const hasDocument = typeof data.document === 'string' && data.document.trim().length > 0;
    const chapters = data.chapters;
    const hasChapters = Array.isArray(chapters)
      ? chapters.length > 0
      : chapters && typeof chapters === 'object'
        ? Object.keys(chapters).length > 0
        : false;
    return hasDocument || hasChapters;
  },

  rankReport(report, pm) {
    if (!report) {
      return -1;
    }
    const type = String(report.type || '').toLowerCase();
    const hasData =
      type === 'analysis' || type === 'analysis-report' || type === 'analysis_report'
        ? Boolean(pm.hasCompletedAnalysisReport?.(report))
        : this.hasRenderableReportData(report);
    const status = String(report.status || '').toLowerCase();
    if (hasData && this.isCompletedStatus(status)) {
      return 4;
    }
    if (hasData) {
      return 3;
    }
    if (status === 'generating') {
      return 2;
    }
    if (status === 'error') {
      return 1;
    }
    return 0;
  },

  selectBestReport(pm, existing, candidate) {
    if (!existing) {
      return candidate;
    }
    const rankDiff = this.rankReport(candidate, pm) - this.rankReport(existing, pm);
    if (rankDiff > 0) {
      return candidate;
    }
    if (rankDiff < 0) {
      return existing;
    }
    const candidateTime = Number(
      candidate?.endTime || candidate?.startTime || candidate?.timestamp || 0
    );
    const existingTime = Number(
      existing?.endTime || existing?.startTime || existing?.timestamp || 0
    );
    return candidateTime >= existingTime ? candidate : existing;
  },

  async resolveIdeaChat(pm, project) {
    const rawIdeaId = project?.ideaId ?? project?.linkedIdeas?.[0];
    if (rawIdeaId === undefined || rawIdeaId === null || rawIdeaId === '') {
      return null;
    }

    const normalizedIdeaId = pm.normalizeIdeaId(rawIdeaId);
    let chat = await pm.storageManager?.getChat?.(normalizedIdeaId).catch(() => null);
    if (!chat && normalizedIdeaId !== rawIdeaId) {
      chat = await pm.storageManager?.getChat?.(rawIdeaId).catch(() => null);
    }
    if (!chat) {
      const chats = await pm.storageManager?.getAllChats?.().catch(() => []);
      const rawKey = pm.normalizeIdeaIdForCompare(rawIdeaId);
      chat = chats.find(item => pm.normalizeIdeaIdForCompare(item.id) === rawKey) || null;
    }
    return chat || null;
  },

  async resolveReports(pm, chatId) {
    if (!chatId || !pm.storageManager?.getAllReports) {
      return this.createEmptyReports();
    }
    const reports = await pm.storageManager.getAllReports().catch(() => []);
    return (Array.isArray(reports) ? reports : [])
      .filter(
        report =>
          pm.normalizeIdeaIdForCompare(report?.chatId) === pm.normalizeIdeaIdForCompare(chatId)
      )
      .reduce((acc, report) => {
        const key = String(report?.type || '').toLowerCase();
        if (!key) {
          return acc;
        }
        acc[key] = this.selectBestReport(pm, acc[key], report);
        return acc;
      }, this.createEmptyReports());
  },

  buildArtifactsByStage(pm, project, storedArtifacts = []) {
    const byStage = {};
    const stages = Array.isArray(project?.workflow?.stages) ? project.workflow.stages : [];
    const stored = Array.isArray(storedArtifacts) ? storedArtifacts : [];

    stages.forEach(stage => {
      const stageArtifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
      const localArtifacts = stored.filter(artifact => artifact?.stageId === stage?.id);
      byStage[stage.id] = pm.mergeArtifacts(stageArtifacts, localArtifacts).map(artifact => ({
        ...artifact,
        type: artifact.type || 'document'
      }));
    });

    return byStage;
  },

  applyArtifactsByStage(pm, project, artifactsByStage) {
    if (!project?.workflow?.stages) {
      return project;
    }
    const nextStages = project.workflow.stages.map(stage => ({
      ...stage,
      artifacts: Array.isArray(artifactsByStage?.[stage.id]) ? artifactsByStage[stage.id] : []
    }));
    return {
      ...project,
      workflow: {
        ...project.workflow,
        stages: nextStages
      }
    };
  },

  async resolveProjectBundle(pm, projectId, options = {}) {
    const normalizedProjectId = String(projectId || '').trim();
    if (!normalizedProjectId) {
      throw new Error('项目不存在');
    }

    if (!options.forceRefresh) {
      const cached = pm.projectBundleCache?.[normalizedProjectId];
      if (cached?.project?.updatedAt) {
        return cached;
      }
    }

    const backendHealthy = await pm.checkBackendHealth().catch(() => false);
    const hasAuthToken = Boolean(pm.getAuthToken());
    const preferRemote =
      backendHealthy && hasAuthToken && pm.isRemoteProjectId(normalizedProjectId);

    const project = await pm.getProject(normalizedProjectId, { requireRemote: preferRemote });
    if (!project) {
      throw new Error('项目不存在');
    }

    await pm.hydrateProjectStageOutputs(project);
    if (preferRemote) {
      await pm.syncWorkflowArtifactsFromServer(project);
    }

    const storedArtifacts = await pm.storageManager
      ?.getArtifactsByProject?.(project.id)
      .catch(() => []);
    const artifactsByStage = this.buildArtifactsByStage(pm, project, storedArtifacts);
    const patchedProject = this.applyArtifactsByStage(pm, project, artifactsByStage);
    const ideaChat = await this.resolveIdeaChat(pm, patchedProject);
    const reports = await this.resolveReports(
      pm,
      ideaChat?.id ?? patchedProject.ideaId ?? patchedProject.linkedIdeas?.[0] ?? null
    );
    const knowledgeItems = await pm.storageManager
      ?.getKnowledgeByProject?.(patchedProject.id)
      .catch(() => []);

    const bundle = {
      projectId: patchedProject.id,
      source: preferRemote ? 'hybrid' : 'local',
      project: patchedProject,
      ideaChat,
      reports,
      artifactsByStage,
      knowledgeItems: Array.isArray(knowledgeItems) ? knowledgeItems : []
    };

    pm.projectArtifactsCache[patchedProject.id] = storedArtifacts;
    pm.projectBundleCache[patchedProject.id] = bundle;
    if (String(pm.currentProjectId || '') === patchedProject.id) {
      pm.currentProjectBundle = bundle;
    }
    return bundle;
  }
};
