import { describe, it, expect, beforeEach } from '@jest/globals';
import { CollaborationRepository } from '../../../../domains/collaboration/repositories/CollaborationRepository.js';

describe('CollaborationRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new CollaborationRepository();
  });

  it('saves and retrieves a plan', async () => {
    const plan = {
      id: 'collab_repo_001',
      userId: 'user_001',
      title: 'Plan Title',
      goal: 'Launch a new SaaS product',
      agents: [{ id: 'agent_1', type: 'product-manager' }],
      status: 'draft',
      progress: 0
    };

    const saved = await repository.savePlan(plan);
    expect(saved).toBe(true);

    const fetched = await repository.getPlanById('collab_repo_001');
    expect(fetched).toBeDefined();
    expect(fetched.goal).toBe('Launch a new SaaS product');
  });

  it('updates status', async () => {
    await repository.savePlan({
      id: 'collab_repo_002',
      userId: 'user_002',
      title: 'Plan Title',
      goal: 'Improve onboarding experience',
      agents: [{ id: 'agent_1', type: 'designer' }],
      status: 'draft',
      progress: 0
    });

    const updated = await repository.updateStatus('collab_repo_002', 'active');
    expect(updated).toBe(true);

    const fetched = await repository.getPlanById('collab_repo_002');
    expect(fetched.status).toBe('active');
  });

  it('deletes plan by id and user', async () => {
    await repository.savePlan({
      id: 'collab_repo_003',
      userId: 'user_003',
      title: 'Plan Title',
      goal: 'Improve onboarding experience',
      agents: [{ id: 'agent_1', type: 'designer' }],
      status: 'draft',
      progress: 0
    });

    const deleted = await repository.deletePlan('collab_repo_003', 'user_003');
    expect(deleted).toBe(true);
  });
});
