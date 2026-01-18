import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DeepSeekMockServer } from '../../../helpers/DeepSeekMockServer.js';

let TaskAssignmentService;
let AgentHireService;

describe('TaskAssignmentService', () => {
  let mockServer;
  let hireService;
  let taskService;

  beforeAll(async () => {
    mockServer = new DeepSeekMockServer();
    await mockServer.start();
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.DEEPSEEK_API_URL = mockServer.getUrl();

    const taskModule = await import('../../../../domains/agent/services/TaskAssignmentService.js');
    const hireModule = await import('../../../../domains/agent/services/AgentHireService.js');
    TaskAssignmentService = taskModule.TaskAssignmentService;
    AgentHireService = hireModule.AgentHireService;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    hireService = new AgentHireService();
    taskService = new TaskAssignmentService(hireService);
  });

  it('assigns task and returns AI result', async () => {
    mockServer.enqueueResponse('Task completed.');
    const hireResult = hireService.hire('user_001', 'backend-dev');

    const result = await taskService.assignTask(
      'user_001',
      hireResult.agent.id,
      'Design an API schema.'
    );

    expect(result.success).toBe(true);
    expect(result.result.result).toContain('Task completed.');
    expect(hireResult.agent.status).toBe('idle');
    expect(hireResult.agent.tasksCompleted).toBe(1);
  });

  it('rejects invalid task parameters', async () => {
    const result = await taskService.assignTask('', '', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('用户ID不能为空');
  });

  it('tracks task history and stats', async () => {
    mockServer.enqueueResponse('First response');
    mockServer.enqueueResponse('Second response');
    const hireResult = hireService.hire('user_001', 'backend-dev');

    await taskService.assignTask('user_001', hireResult.agent.id, 'Task one');
    await taskService.assignTask('user_001', hireResult.agent.id, 'Task two');

    const history = taskService.getTaskHistory(hireResult.agent.id, 2);
    expect(history).toHaveLength(2);

    const stats = taskService.getTaskStats('user_001');
    expect(stats.totalTasks).toBe(2);
    expect(stats.totalTokens).toBeGreaterThan(0);
  });

  it('recommends available agent for a task', () => {
    const first = hireService.hire('user_001', 'backend-dev').agent;
    const second = hireService.hire('user_001', 'designer').agent;
    first.status = 'working';

    const recommended = taskService.recommendAgent('user_001', 'Need UI/UX design');

    expect(recommended).toBeDefined();
    expect(recommended.id).toBe(second.id);
  });
});
