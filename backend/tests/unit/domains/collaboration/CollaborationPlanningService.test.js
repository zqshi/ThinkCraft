import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DeepSeekMockServer } from '../../../helpers/DeepSeekMockServer.js';
import { AgentHireService } from '../../../../domains/agent/services/AgentHireService.js';
import { CollaborationPlanningService } from '../../../../domains/collaboration/services/CollaborationPlanningService.js';

describe('CollaborationPlanningService', () => {
  let mockServer;
  let planningService;
  let hireService;

  beforeAll(async () => {
    mockServer = new DeepSeekMockServer();
    await mockServer.start();
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.DEEPSEEK_API_URL = mockServer.getUrl();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    hireService = new AgentHireService();
    planningService = new CollaborationPlanningService(hireService);
  });

  it('creates plan and analyzes capability', async () => {
    hireService.hire('user_001', 'product-manager');

    mockServer.enqueueResponse(JSON.stringify({
      requiredSkills: ['需求分析'],
      requiredRoles: [{ typeId: 'product-manager', reason: '需要需求分析', priority: 'high' }],
      skillGaps: [],
      roleGaps: [],
      isSufficient: true,
      confidenceScore: 82,
      hiringAdvice: null,
      warnings: []
    }));

    const plan = planningService.createPlan('user_001', 'Launch a new SaaS product');
    const analysis = await planningService.analyzeCapability(plan.id);

    expect(analysis.analysis.isSufficient).toBe(true);
    expect(analysis.nextStep).toBe('generate_modes');
  });

  it('generates collaboration modes after capability analysis', async () => {
    const agent = hireService.hire('user_001', 'product-manager').agent;

    mockServer.enqueueResponse(JSON.stringify({
      requiredSkills: ['需求分析'],
      requiredRoles: [{ typeId: 'product-manager', reason: '需要需求分析', priority: 'high' }],
      skillGaps: [],
      roleGaps: [],
      isSufficient: true,
      confidenceScore: 82,
      hiringAdvice: null,
      warnings: []
    }));

    mockServer.enqueueResponse(JSON.stringify({
      roleRecommendation: {
        recommended: [
          {
            agentId: agent.id,
            agentName: agent.nickname,
            agentType: 'product-manager',
            reason: '需求梳理',
            importance: 'critical'
          }
        ],
        optional: []
      },
      workflowOrchestration: {
        steps: [
          {
            stepId: 'step_1',
            agentId: agent.id,
            agentName: agent.nickname,
            agentType: 'product-manager',
            task: '梳理需求',
            dependencies: [],
            estimatedDuration: 300,
            priority: 'high'
          }
        ],
        totalEstimatedDuration: 300,
        parallelizable: []
      },
      taskDecomposition: {
        mainTasks: [
          {
            taskId: 'task_1',
            title: '需求分析',
            description: '输出需求文档',
            assignedAgent: {
              agentId: agent.id,
              agentName: agent.nickname,
              agentType: 'product-manager'
            },
            subtasks: ['列出需求'],
            deliverables: ['PRD'],
            estimatedDuration: 300
          }
        ],
        totalTasks: 1,
        criticalPath: ['task_1']
      },
      metadata: {
        complexity: 'low',
        estimatedTotalTime: 300,
        riskFactors: [],
        successMetrics: []
      }
    }));

    const plan = planningService.createPlan('user_001', 'Launch a new SaaS product');
    await planningService.analyzeCapability(plan.id);
    const modes = await planningService.generateCollaborationModes(plan.id);

    expect(modes.modes.workflowOrchestration.steps).toHaveLength(1);
    expect(modes.modes.taskDecomposition.mainTasks).toHaveLength(1);
  });

  it('rejects mode generation before analysis', async () => {
    const plan = planningService.createPlan('user_001', 'Launch a new SaaS product');

    await expect(planningService.generateCollaborationModes(plan.id))
      .rejects
      .toThrow('请先完成能力分析');
  });

  it('rejects mode generation when capability insufficient', async () => {
    mockServer.enqueueResponse(JSON.stringify({
      requiredSkills: ['需求分析'],
      requiredRoles: [{ typeId: 'product-manager', reason: '需要需求分析', priority: 'high' }],
      skillGaps: [{ skill: '需求分析', severity: 'high', suggestion: '雇佣产品经理' }],
      roleGaps: [{ typeId: 'product-manager', role: '产品经理', reason: '缺少角色', cost: 15000, priority: 'high' }],
      isSufficient: false,
      confidenceScore: 70,
      hiringAdvice: {
        summary: '需要雇佣产品经理',
        priorityRoles: ['product-manager'],
        estimatedCost: 15000,
        reasoning: '目标需要需求分析'
      },
      warnings: []
    }));

    const plan = planningService.createPlan('user_001', 'Launch a new SaaS product');
    const analysis = await planningService.analyzeCapability(plan.id);

    expect(analysis.analysis.isSufficient).toBe(false);

    await expect(planningService.generateCollaborationModes(plan.id))
      .rejects
      .toThrow('当前能力不足');
  });
});
