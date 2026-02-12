import path from 'node:path';
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.DEEPSEEK_API_KEY = 'sk-test-key';

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

function createProject() {
  const workflow = createWorkflow([
    {
      id: 'requirement',
      name: '需求分析',
      outputs: ['prd'],
      artifacts: [],
      status: 'pending'
    },
    {
      id: 'design',
      name: '产品设计',
      outputs: ['ui-design', 'design-spec', 'prototype'],
      artifacts: [],
      status: 'pending'
    }
  ]);
  return {
    id: 'project-1',
    artifactRoot: '/tmp/workflow-test',
    workflow,
    update: jest.fn()
  };
}

jest.unstable_mockModule('../../../config/deepseek.js', () => ({
  callDeepSeekAPI: jest.fn(async (messages, _unused, options = {}) => {
    if (options?.response_format?.type === 'json_object') {
      return {
        content: JSON.stringify({ pass: true, issues: [], advice: '' }),
        usage: { total_tokens: 7 }
      };
    }
    return {
      content: 'Generated artifact content',
      usage: { total_tokens: 123 }
    };
  })
}));

jest.unstable_mockModule('../../../src/features/projects/infrastructure/project-files.js', () => ({
  buildArtifactFileUrl: jest.fn((projectId, artifactId) => `/api/workflow/${projectId}/artifacts/${artifactId}`),
  deleteArtifactPhysicalFile: jest.fn(async () => ({ ok: true, failedPaths: [] })),
  ensureDevScaffold: jest.fn(async () => {}),
  ensureProjectWorkspace: jest.fn(async () => ({
    artifactRoot: '/tmp/workflow-test/artifacts',
    projectRoot: '/tmp/workflow-test/project'
  })),
  materializeArtifactFile: jest.fn(async ({ artifact }) => ({
    ...artifact,
    relativePath: `artifacts/${artifact.id}.md`
  })),
  removeArtifactsIndex: jest.fn(async () => {}),
  resolveRepoRoot: jest.fn(() => path.resolve(process.cwd(), '..')),
  updateArtifactsIndex: jest.fn(async () => {})
}));

jest.unstable_mockModule('../../../src/features/workflow/application/workflow-project-service.js', () => ({
  loadProject: jest.fn(async () => state.project),
  persistGeneratedArtifact: jest.fn(async (project, stageId, artifact) => {
    project.workflow.addArtifact(stageId, artifact);
    return artifact;
  })
}));

jest.unstable_mockModule('../../../src/features/projects/infrastructure/index.js', () => ({
  projectRepository: {
    save: jest.fn(async (project) => project)
  }
}));

jest.unstable_mockModule('../../../src/features/workflow/infrastructure/workflow-artifact-run.repository.js', () => ({
  createRunRecord: jest.fn(async () => ({})),
  recoverStaleRunningRuns: jest.fn(async () => 0),
  updateRunRecord: jest.fn(async () => ({}))
}));

jest.unstable_mockModule('../../../src/features/workflow/application/workflow-stage-actions-deployment.js', () => ({
  executeDeploymentStage: jest.fn(async () => [])
}));
jest.unstable_mockModule('../../../src/features/workflow/application/workflow-stage-actions-development.js', () => ({
  executeDevelopmentStageActions: jest.fn(async () => [])
}));
jest.unstable_mockModule('../../../src/features/workflow/application/workflow-stage-actions-testing.js', () => ({
  executeTestingStage: jest.fn(async () => [])
}));

const { executeStage } = await import('../../../src/features/workflow/application/workflow-stage-executor.js');
const { callDeepSeekAPI } = await import('../../../config/deepseek.js');
const { ARTIFACT_DEPENDENCIES } = await import('../../../config/workflow-stages.js');

describe('Workflow integration', () => {
  beforeEach(() => {
    state.project = createProject();
    callDeepSeekAPI.mockClear();
  });

  it('should keep artifact dependency contract aligned with workflow definition', () => {
    const expected = {
      'strategy-doc': ['prd'],
      'core-prompt-design': ['strategy-doc', 'prd'],
      'ui-design': ['prd'],
      'design-spec': ['prd'],
      prototype: ['ui-design', 'design-spec', 'prd'],
      'architecture-doc': ['prd'],
      'tech-stack': ['architecture-doc', 'prd'],
      'api-spec': ['prd', 'prototype', 'architecture-doc', 'tech-stack'],
      'frontend-code': [
        'architecture-doc',
        'tech-stack',
        'frontend-doc',
        'prd',
        'ui-design',
        'design-spec',
        'prototype'
      ],
      'backend-code': ['architecture-doc', 'tech-stack', 'backend-doc', 'prd'],
      'api-doc': ['architecture-doc', 'tech-stack', 'prd'],
      'component-lib': ['architecture-doc', 'tech-stack', 'prd', 'frontend-code'],
      'frontend-doc': ['architecture-doc', 'tech-stack', 'prd'],
      'backend-doc': ['architecture-doc', 'tech-stack', 'prd'],
      'test-report': ['bug-list', 'performance-report'],
      'bug-list': [],
      'performance-report': [],
      'deploy-doc': ['frontend-doc', 'backend-doc'],
      'env-config': ['frontend-doc', 'backend-doc', 'frontend-code', 'backend-code'],
      'release-notes': ['deploy-doc', 'env-config']
    };

    expect(ARTIFACT_DEPENDENCIES).toEqual(expected);
  });

  it('should reject prototype generation when direct dependencies are missing', async () => {
    await expect(
      executeStage('project-1', 'design', {
        CONVERSATION: '我需要一个创意验证产品',
        selectedArtifactTypes: ['prototype']
      })
    ).rejects.toThrow('缺少依赖输入');
  });

  it('should keep each model request independent and avoid cross-run conversation leakage', async () => {
    const conversationA = '创意A：面向大学生的时间管理助手';
    const conversationB = '创意B：面向设计师的灵感采集平台';

    await executeStage('project-1', 'requirement', {
      CONVERSATION: conversationA,
      selectedArtifactTypes: ['prd']
    });
    const promptA = callDeepSeekAPI.mock.calls?.[0]?.[0]?.[0]?.content || '';
    expect(promptA).toContain(conversationA);

    callDeepSeekAPI.mockClear();
    await executeStage('project-1', 'requirement', {
      CONVERSATION: conversationB,
      selectedArtifactTypes: ['prd']
    });
    const promptB = callDeepSeekAPI.mock.calls?.[0]?.[0]?.[0]?.content || '';
    expect(promptB).toContain(conversationB);
    expect(promptB).not.toContain(conversationA);
  });

  it('should build prototype prompt only from PRD, UI design and design spec dependencies', async () => {
    const conversation = '需要一个可验证创意的Web应用';

    await executeStage('project-1', 'requirement', {
      CONVERSATION: conversation,
      selectedArtifactTypes: ['prd']
    });

    await executeStage('project-1', 'design', {
      CONVERSATION: conversation,
      selectedArtifactTypes: ['ui-design', 'design-spec']
    });

    callDeepSeekAPI.mockClear();
    await executeStage('project-1', 'design', {
      CONVERSATION: conversation,
      selectedArtifactTypes: ['prototype']
    });

    const prototypePrompt = callDeepSeekAPI.mock.calls?.[0]?.[0]?.[0]?.content || '';
    expect(prototypePrompt).toContain('[PRD]');
    expect(prototypePrompt).toContain('[UI设计方案]');
    expect(prototypePrompt).toContain('[设计规范]');
    expect(prototypePrompt).not.toContain('[战略设计文档]');
  });
});
