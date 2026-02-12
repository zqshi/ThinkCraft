export function registerExecutionRoutes(router, deps) {
  const {
    executeStage,
    loadProject,
    normalizeStageId,
    resolveStageOutputsForProject,
    listRunRecords,
    listChunkSessions,
    getChunkSession
  } = deps;

  router.post('/:projectId/execute-stage', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const { stageId, context = {}, selectedArtifactTypes } = req.body;

      if (!stageId) {
        return res.status(400).json({ code: -1, error: '缺少参数: stageId' });
      }

      if (Array.isArray(selectedArtifactTypes) && selectedArtifactTypes.length > 0) {
        context.selectedArtifactTypes = selectedArtifactTypes;
      }
      const generatedArtifacts = await executeStage(projectId, stageId, context);
      const modelArtifacts = generatedArtifacts.filter(
        artifact => String(artifact?.source || '').trim().toLowerCase() === 'model'
      );
      const modelTokenTotal = modelArtifacts.reduce(
        (sum, artifact) => sum + Number(artifact?.tokens || 0),
        0
      );

      res.json({
        code: 0,
        data: {
          stageId: normalizeStageId(stageId),
          artifacts: generatedArtifacts,
          totalTokens: generatedArtifacts.reduce((sum, a) => sum + (a.tokens || 0), 0),
          meta: {
            modelArtifactCount: modelArtifacts.length,
            hasModelArtifacts: modelArtifacts.length > 0,
            modelTokenTotal
          }
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:projectId/execute-batch', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const { stageIds, conversation } = req.body;

      if (!stageIds || !Array.isArray(stageIds) || stageIds.length === 0) {
        return res.status(400).json({ code: -1, error: '缺少或无效的stageIds' });
      }

      const results = [];
      const project = await loadProject(projectId);
      const context = { CONVERSATION: conversation || '' };

      for (const stageId of stageIds) {
        const normalizedStageId = normalizeStageId(stageId);
        const selectedArtifactTypes = resolveStageOutputsForProject(project, normalizedStageId);
        const generatedArtifacts = await executeStage(projectId, stageId, {
          ...context,
          selectedArtifactTypes
        });

        if (generatedArtifacts.length > 0) {
          const mainArtifact = generatedArtifacts[0];
          context[stageId.toUpperCase()] = mainArtifact.content;
          if (stageId === 'requirement') {
            context.PRD = mainArtifact.content;
          } else if (stageId === 'design') {
            context.DESIGN = mainArtifact.content;
          } else if (stageId === 'architecture') {
            context.ARCHITECTURE = mainArtifact.content;
          } else if (stageId === 'development') {
            context.DEVELOPMENT = mainArtifact.content;
          }
        }

        results.push({ stageId, artifacts: generatedArtifacts });
      }

      const totalTokens = results.reduce(
        (sum, r) => sum + r.artifacts.reduce((s, a) => s + (a.tokens || 0), 0),
        0
      );

      res.json({
        code: 0,
        data: {
          results,
          totalTokens,
          completedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/execution-runs', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const { stageId = '', limit = '50' } = req.query || {};
      const stageIdNormalized = stageId ? normalizeStageId(stageId) : null;
      const runs = await listRunRecords({
        projectId,
        stageId: stageIdNormalized || null,
        limit: Number(limit) || 50
      });
      res.json({
        code: 0,
        data: {
          projectId,
          stageId: stageIdNormalized,
          count: Array.isArray(runs) ? runs.length : 0,
          runs: runs || []
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/artifact-chunks', async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const { stageId = '', artifactType = '', limit = '50', includeContent = '0' } = req.query || {};
      const project = await loadProject(projectId);
      const stageIdNormalized = stageId ? normalizeStageId(stageId) : null;
      const sessions = await listChunkSessions({
        project,
        projectId,
        stageId: stageIdNormalized || null,
        artifactType: String(artifactType || '').trim() || null,
        limit: Number(limit) || 50,
        includeChunkContent: String(includeContent || '0') === '1'
      });
      res.json({
        code: 0,
        data: {
          projectId,
          stageId: stageIdNormalized,
          artifactType: String(artifactType || '').trim() || null,
          count: Array.isArray(sessions) ? sessions.length : 0,
          sessions: sessions || []
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:projectId/artifact-chunks/:runId', async (req, res, next) => {
    try {
      const { projectId, runId } = req.params;
      const { includeContent = '1' } = req.query || {};
      const project = await loadProject(projectId);
      const session = await getChunkSession({
        project,
        projectId,
        runId,
        includeChunkContent: String(includeContent || '1') === '1'
      });
      if (!session) {
        return res.status(404).json({
          code: -1,
          error: 'chunk 会话不存在'
        });
      }
      res.json({
        code: 0,
        data: {
          projectId,
          runId,
          session
        }
      });
    } catch (error) {
      next(error);
    }
  });
}
