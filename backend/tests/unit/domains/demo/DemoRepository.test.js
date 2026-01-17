import { describe, it, expect, beforeEach } from '@jest/globals';
import { DemoRepository } from '../../../../domains/demo/repositories/DemoRepository.js';

describe('DemoRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new DemoRepository();
  });

  it('saves and retrieves demo', async () => {
    const saved = await repository.saveDemo({
      id: 'demo_001',
      userId: 'user_001',
      title: 'Demo Title',
      type: 'web',
      status: 'draft'
    });

    expect(saved).toBe(true);

    const demo = await repository.getDemoById('demo_001');
    expect(demo).toBeDefined();
    expect(demo.title).toBe('Demo Title');
  });

  it('updates demo status', async () => {
    await repository.saveDemo({
      id: 'demo_002',
      userId: 'user_002',
      title: 'Demo Title',
      type: 'web',
      status: 'draft'
    });

    const updated = await repository.updateStatus('demo_002', 'published');
    expect(updated).toBe(true);
  });
});
