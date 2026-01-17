import { describe, it, expect } from '@jest/globals';
import { Agent, AgentStatus } from '../../../../domains/agent/models/Agent.js';

describe('Agent entity', () => {
  it('creates agent through hire factory', () => {
    const agent = Agent.hire('user_001', 'backend-dev', 'Backend Hero');

    expect(agent).toBeDefined();
    expect(agent.userId).toBe('user_001');
    expect(agent.nickname).toBe('Backend Hero');
    expect(agent.status).toBe(AgentStatus.IDLE);
  });

  it('returns null for invalid agent type', () => {
    const agent = Agent.hire('user_001', 'invalid-type');
    expect(agent).toBeNull();
  });

  it('assigns and completes task', () => {
    const agent = Agent.hire('user_001', 'backend-dev');
    agent.assignTask({ description: 'Test task' });

    expect(agent.status).toBe(AgentStatus.WORKING);

    const completed = agent.completeTask({ content: 'done' });

    expect(agent.status).toBe(AgentStatus.IDLE);
    expect(agent.tasksCompleted).toBe(1);
    expect(completed.content).toBe('done');
  });

  it('fails task and resets status', () => {
    const agent = Agent.hire('user_001', 'backend-dev');
    agent.assignTask({ description: 'Test task' });

    agent.failTask('error');

    expect(agent.status).toBe(AgentStatus.IDLE);
    expect(agent.currentTask).toBeNull();
  });

  it('validates performance range', () => {
    const agent = Agent.hire('user_001', 'backend-dev');
    expect(() => agent.setPerformance(200)).toThrow('绩效值必须在 0-100 之间');
  });
});
