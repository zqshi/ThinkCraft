import { describe, it, expect, beforeEach } from '@jest/globals';
import { BusinessPlanRepository } from '../../../../domains/businessPlan/repositories/BusinessPlanRepository.js';

describe('BusinessPlanRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new BusinessPlanRepository();
  });

  it('saves and retrieves a plan', async () => {
    const saved = await repository.savePlan({
      id: 'bp_001',
      userId: 'user_001',
      title: 'Plan Title',
      content: '# Plan content',
      status: 'draft'
    });

    expect(saved).toBe(true);

    const plan = await repository.getPlanById('bp_001');
    expect(plan).toBeDefined();
    expect(plan.title).toBe('Plan Title');
  });

  it('updates status', async () => {
    await repository.savePlan({
      id: 'bp_002',
      userId: 'user_002',
      title: 'Plan Title',
      content: '# Plan content',
      status: 'draft'
    });

    const updated = await repository.updateStatus('bp_002', 'final');
    expect(updated).toBe(true);

    const plan = await repository.getPlanById('bp_002');
    expect(plan.status).toBe('final');
  });

  it('gets latest plan', async () => {
    await repository.savePlan({
      id: 'bp_003',
      userId: 'user_003',
      title: 'Plan A',
      content: '# Plan content',
      status: 'draft'
    });

    const latest = await repository.getLatestPlan('user_003');
    expect(latest).toBeDefined();
  });
});
