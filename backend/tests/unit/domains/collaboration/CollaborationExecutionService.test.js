import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentHireService } from '../../../../domains/agent/services/AgentHireService.js';
import { CollaborationPlanningService } from '../../../../domains/collaboration/services/CollaborationPlanningService.js';
import { CollaborationExecutionService } from '../../../../domains/collaboration/services/CollaborationExecutionService.js';
import { CapabilityAnalysis } from '../../../../domains/collaboration/models/valueObjects/CapabilityAnalysis.js';

describe('CollaborationExecutionService', () => {
  let hireService;
  let planningService;
  let executionService;
  let taskAssignmentService;

  beforeEach(() => {
    hireService = new AgentHireService();
    planningService = new CollaborationPlanningService(hireService);
    taskAssignmentService = {
      assignTask: async () => ({
        success: true,
        result: { result: 'done', content: 'done' }
      })
    };
    executionService = new CollaborationExecutionService(planningService, taskAssignmentService);
  });

  it('executes workflow mode successfully', async () => {
    const agent = hireService.hire('user_001', 'product-manager').agent;
    const plan = planningService.createPlan('user_001', 'Launch a new SaaS product');

    const analysis = new CapabilityAnalysis({
      requiredSkills: ['需求分析'],
      requiredRoles: [{ typeId: 'product-manager', reason: '需要需求分析', priority: 'high' }],
      currentAgents: [agent],
      skillGaps: [],
      roleGaps: [],
      isSufficient: true,
      confidenceScore: 80,
      warnings: []
    });

    plan.setCapabilityAnalysis(analysis);
    plan.setCollaborationModes(
      { recommended: [], optional: [] },
      {
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
        ]
      },
      { mainTasks: [] }
    );

    const result = await executionService.execute(plan.id, 'workflow');

    expect(result.executionMode).toBe('workflow');
    expect(result.completedSteps).toBe(1);
  });

  it('fails workflow when dependencies are not met', async () => {
    const agent = hireService.hire('user_001', 'product-manager').agent;
    const plan = planningService.createPlan('user_001', 'Launch a new SaaS product');

    const analysis = new CapabilityAnalysis({
      requiredSkills: ['需求分析'],
      requiredRoles: [{ typeId: 'product-manager', reason: '需要需求分析', priority: 'high' }],
      currentAgents: [agent],
      skillGaps: [],
      roleGaps: [],
      isSufficient: true,
      confidenceScore: 80,
      warnings: []
    });

    plan.setCapabilityAnalysis(analysis);
    plan.setCollaborationModes(
      { recommended: [], optional: [] },
      {
        steps: [
          {
            stepId: 'step_2',
            agentId: agent.id,
            agentName: agent.nickname,
            agentType: 'product-manager',
            task: '输出方案',
            dependencies: ['step_1'],
            estimatedDuration: 300,
            priority: 'high'
          }
        ]
      },
      { mainTasks: [] }
    );

    await expect(executionService.execute(plan.id, 'workflow'))
      .rejects
      .toThrow('依赖未满足');
  });

  it('executes task decomposition mode successfully', async () => {
    const agent = hireService.hire('user_001', 'product-manager').agent;
    const plan = planningService.createPlan('user_001', 'Launch a new SaaS product');

    const analysis = new CapabilityAnalysis({
      requiredSkills: ['需求分析'],
      requiredRoles: [{ typeId: 'product-manager', reason: '需要需求分析', priority: 'high' }],
      currentAgents: [agent],
      skillGaps: [],
      roleGaps: [],
      isSufficient: true,
      confidenceScore: 80,
      warnings: []
    });

    plan.setCapabilityAnalysis(analysis);
    plan.setCollaborationModes(
      { recommended: [], optional: [] },
      { steps: [] },
      {
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
        ]
      }
    );

    const result = await executionService.execute(plan.id, 'task_decomposition');

    expect(result.executionMode).toBe('task_decomposition');
    expect(result.completedTasks).toBe(1);
  });
});
