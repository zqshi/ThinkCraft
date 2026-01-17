import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentPostgresRepository } from '../../../../domains/agent/repositories/AgentPostgresRepository.js';

describe('AgentPostgresRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new AgentPostgresRepository();
  });

  it('saves and retrieves an agent', async () => {
    const agentData = {
      id: 'agent_repo_001',
      name: 'Backend Hero',
      role: 'backend-dev',
      skills: ['Node.js', 'PostgreSQL'],
      personality: 'Reliable',
      hiredAt: new Date(),
      status: 'idle'
    };

    const saved = await repository.saveAgent('user_001', agentData);
    expect(saved).toBe(true);

    const agents = await repository.getUserAgents('user_001');
    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe('agent_repo_001');
  });

  it('fires an agent and excludes it from active list', async () => {
    await repository.saveAgent('user_002', {
      id: 'agent_repo_002',
      name: 'Designer One',
      role: 'designer',
      skills: ['UI'],
      personality: 'Creative',
      hiredAt: new Date(),
      status: 'idle'
    });

    const fired = await repository.fireAgent('user_002', 'agent_repo_002');
    expect(fired).toBe(true);

    const activeAgents = await repository.getUserAgents('user_002');
    expect(activeAgents).toHaveLength(0);

    const allAgents = await repository.getAllUserAgents('user_002');
    expect(allAgents).toHaveLength(1);
  });

  it('returns stats for agents', async () => {
    await repository.saveAgent('user_003', {
      id: 'agent_repo_003',
      name: 'PM',
      role: 'product-manager',
      skills: ['Planning'],
      personality: 'Organized',
      hiredAt: new Date(),
      status: 'idle'
    });

    const stats = await repository.getStats();
    expect(stats.totalAgents).toBeGreaterThan(0);
    expect(stats.totalUsers).toBeGreaterThan(0);
  });
});
