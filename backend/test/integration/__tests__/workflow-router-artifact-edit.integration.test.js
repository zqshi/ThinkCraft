import express from 'express';
import { jest } from '@jest/globals';
import { startTestServer, requestJson } from '../../helpers/http.js';

const state = {
  project: null
};

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

function createProject(type = 'prd') {
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

jest.unstable_mockModule('../../../config/deepseek.js', () => ({
  callDeepSeekAPI: jest.fn(async () => ({ content: '{}', usage: { total_tokens: 1 } }))
}));

jest.unstable_mockModule('../../../config/workflow-stages.js', () => ({
  ARTIFACT_TYPES: {},
  normalizeStageId: stageId => stageId
}));

const projectSaveMock = jest.fn(async project => project);
jest.unstable_mockModule('../../../src/features/projects/infrastructure/index.js', () => ({
  projectRepository: {
    save: projectSaveMock
  }
}));

const materializeMock = jest.fn(async ({ artifact }) => ({
  ...artifact,
  fileName: 'artifact-1.md',
  relativePath: 'projects/project-1/artifact-1.md',
  fileSize: 128
}));
const updateIndexMock = jest.fn(async () => {});
jest.unstable_mockModule('../../../src/features/projects/infrastructure/project-files.js', () => ({
  buildArtifactFileUrl: jest.fn(
    (projectId, artifactId) => `/api/workflow/${projectId}/artifacts/${artifactId}/file`
  ),
  deleteArtifactPhysicalFile: jest.fn(async () => ({ ok: true, failedPaths: [] })),
  ensureProjectWorkspace: jest.fn(async () => ({
    repoRoot: process.cwd(),
    projectRoot: '/tmp/project-space',
    artifactRoot: 'project-1-root'
  })),
  materializeArtifactFile: materializeMock,
  removeArtifactsIndex: jest.fn(async () => {}),
  resolveRepoRoot: jest.fn(() => process.cwd()),
  updateArtifactsIndex: updateIndexMock
}));

jest.unstable_mockModule(
  '../../../src/features/workflow/interfaces/helpers/workflow-helpers.js',
  () => ({
    buildRoleTemplateMapping: jest.fn(() => ({})),
    collectProjectArtifacts: jest.fn(() => new Map()),
    getStageArtifactsFromProject: jest.fn(() => []),
    normalizeArtifactsForResponse: jest.fn(() => []),
    normalizeOutputToTypeId: jest.fn(value => value),
    parseJsonPayload: jest.fn(() => ({})),
    resolveProjectStageIds: jest.fn((_project, stageId) => [stageId]),
    resolveStageOutputsForProject: jest.fn(() => []),
    shouldInlinePreview: jest.fn(() => false)
  })
);

jest.unstable_mockModule(
  '../../../src/features/workflow/interfaces/routes/workflow-execution-routes.js',
  () => ({
    registerExecutionRoutes: jest.fn(() => {})
  })
);
jest.unstable_mockModule(
  '../../../src/features/workflow/interfaces/routes/workflow-files-routes.js',
  () => ({
    registerFilesRoutes: jest.fn(() => {})
  })
);
jest.unstable_mockModule(
  '../../../src/features/workflow/interfaces/routes/workflow-deploy-routes.js',
  () => ({
    registerDeployRoutes: jest.fn(() => {})
  })
);

jest.unstable_mockModule(
  '../../../src/features/workflow/application/workflow-file-tree.js',
  () => ({
    buildFileTree: jest.fn(async () => [])
  })
);
jest.unstable_mockModule(
  '../../../src/features/workflow/application/workflow-command-runner.js',
  () => ({
    runCommand: jest.fn(async () => ({ ok: true, stdout: '', stderr: '' }))
  })
);
jest.unstable_mockModule(
  '../../../src/features/workflow/application/workflow-stage-executor.js',
  () => ({
    executeStage: jest.fn(async () => [])
  })
);
jest.unstable_mockModule(
  '../../../src/features/workflow/application/workflow-project-service.js',
  () => ({
    loadProject: jest.fn(async () => state.project)
  })
);
jest.unstable_mockModule(
  '../../../src/features/workflow/infrastructure/workflow-bundle-service.js',
  () => ({
    buildZipBundle: jest.fn(async () => {})
  })
);
jest.unstable_mockModule(
  '../../../src/features/workflow/infrastructure/workflow-artifact-run.repository.js',
  () => ({
    listRunRecords: jest.fn(async () => [])
  })
);
jest.unstable_mockModule(
  '../../../src/features/workflow/infrastructure/workflow-artifact-chunk.repository.js',
  () => ({
    getChunkSession: jest.fn(async () => null),
    listChunkSessions: jest.fn(async () => [])
  })
);

const { default: workflowRouter } =
  await import('../../../src/features/workflow/interfaces/workflow-routes.js');

describe('Workflow router artifact edit integration', () => {
  beforeEach(() => {
    state.project = createProject('prd');
    materializeMock.mockClear();
    updateIndexMock.mockClear();
    projectSaveMock.mockClear();
  });

  test('should update artifact content via mounted workflow router', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/workflow', workflowRouter);
    app.use((err, _req, res, _next) => {
      res.status(500).json({ code: -1, error: err?.message || 'error' });
    });

    const { server, port } = await startTestServer(app);
    try {
      const res = await requestJson({
        port,
        path: '/api/workflow/project-1/artifacts/artifact-1',
        method: 'PUT',
        body: { content: 'updated from mounted router' }
      });

      expect(res.status).toBe(200);
      expect(res.json?.code).toBe(0);
      expect(res.json?.data?.artifact?.content).toBe('updated from mounted router');
      expect(materializeMock).toHaveBeenCalledTimes(1);
      expect(updateIndexMock).toHaveBeenCalledTimes(1);
      expect(projectSaveMock).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
