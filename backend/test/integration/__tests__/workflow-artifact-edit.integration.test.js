import express from 'express';
import path from 'node:path';
import { jest } from '@jest/globals';
import { startTestServer, requestJson } from '../../helpers/http.js';
import { registerArtifactsRoutes } from '../../../src/features/workflow/interfaces/routes/workflow-artifacts-routes.js';

function createWorkflow(stages = []) {
  return {
    stages,
    getStage(stageId) {
      return this.stages.find(stage => stage.id === stageId) || null;
    },
    addArtifact(stageId, artifact) {
      const stage = this.getStage(stageId);
      if (!stage) {
        return;
      }
      if (!Array.isArray(stage.artifacts)) {
        stage.artifacts = [];
      }
      stage.artifacts.push(artifact);
    },
    removeArtifact(stageId, artifactId) {
      const stage = this.getStage(stageId);
      if (!stage || !Array.isArray(stage.artifacts)) {
        return false;
      }
      const before = stage.artifacts.length;
      stage.artifacts = stage.artifacts.filter(item => item.id !== artifactId);
      return stage.artifacts.length !== before;
    }
  };
}

function createProjectWithArtifact(type = 'prd') {
  const workflow = createWorkflow([
    {
      id: 'requirement',
      name: '需求分析',
      outputs: ['prd'],
      artifacts: [
        {
          id: 'artifact-1',
          projectId: 'project-1',
          stageId: 'requirement',
          type,
          name: '示例交付物',
          content: 'old content',
          createdAt: Date.now()
        }
      ],
      status: 'completed'
    }
  ]);

  return {
    id: 'project-1',
    workflow
  };
}

function createDeps(project) {
  return {
    fs: { existsSync: () => false },
    path,
    loadProject: jest.fn(async () => project),
    buildFileTree: jest.fn(async () => []),
    buildZipBundle: jest.fn(async () => {}),
    runCommand: jest.fn(async () => ({ ok: true })),
    projectRepository: {
      save: jest.fn(async p => p)
    },
    ensureProjectWorkspace: jest.fn(async () => ({ projectRoot: '/tmp/project-space' })),
    materializeArtifactFile: jest.fn(async ({ artifact }) => ({
      ...artifact,
      fileName: 'artifact-1.md',
      relativePath: 'projects/project-1/artifact-1.md',
      fileSize: 100
    })),
    updateArtifactsIndex: jest.fn(async () => {}),
    buildArtifactFileUrl: jest.fn(
      (projectId, artifactId) => `/api/workflow/${projectId}/artifacts/${artifactId}/file`
    ),
    deleteArtifactPhysicalFile: jest.fn(async () => ({ ok: true, failedPaths: [] })),
    removeArtifactsIndex: jest.fn(async () => {}),
    resolveRepoRoot: jest.fn(() => process.cwd()),
    shouldInlinePreview: jest.fn(() => false),
    normalizeStageId: stageId => stageId,
    resolveProjectStageIds: (_project, stageId) => [stageId],
    getStageArtifactsFromProject: () => [],
    normalizeArtifactsForResponse: () => [],
    collectProjectArtifacts: () => new Map()
  };
}

describe('Workflow artifact edit integration', () => {
  test('PUT /:projectId/artifacts/:artifactId should update text artifact content', async () => {
    const project = createProjectWithArtifact('prd');
    const deps = createDeps(project);

    const app = express();
    app.use(express.json());
    const router = express.Router();
    registerArtifactsRoutes(router, deps);
    app.use('/api/workflow', router);
    app.use((err, _req, res, _next) => {
      res.status(500).json({ code: -1, error: err?.message || 'error' });
    });

    const { server, port } = await startTestServer(app);
    try {
      const res = await requestJson({
        port,
        path: '/api/workflow/project-1/artifacts/artifact-1',
        method: 'PUT',
        body: { content: 'new content' }
      });

      expect(res.status).toBe(200);
      expect(res.json?.code).toBe(0);
      expect(res.json?.data?.artifact?.content).toBe('new content');

      const stage = project.workflow.getStage('requirement');
      const edited = (stage?.artifacts || []).find(item => item.id === 'artifact-1');
      expect(edited?.content).toBe('new content');
      expect(deps.projectRepository.save).toHaveBeenCalledTimes(1);
      expect(deps.updateArtifactsIndex).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });

  test('PUT /:projectId/artifacts/:artifactId should reject non-text artifact types', async () => {
    const project = createProjectWithArtifact('prototype');
    const deps = createDeps(project);

    const app = express();
    app.use(express.json());
    const router = express.Router();
    registerArtifactsRoutes(router, deps);
    app.use('/api/workflow', router);
    app.use((err, _req, res, _next) => {
      res.status(500).json({ code: -1, error: err?.message || 'error' });
    });

    const { server, port } = await startTestServer(app);
    try {
      const res = await requestJson({
        port,
        path: '/api/workflow/project-1/artifacts/artifact-1',
        method: 'PUT',
        body: { content: 'new content' }
      });

      expect(res.status).toBe(400);
      expect(res.json?.code).toBe(-1);
      expect(String(res.json?.error || '')).toContain('不支持文本编辑');
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
