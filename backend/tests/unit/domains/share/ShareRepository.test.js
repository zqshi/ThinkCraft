import { describe, it, expect, beforeEach } from '@jest/globals';
import { ShareRepository } from '../../../../domains/share/repositories/ShareRepository.js';

describe('ShareRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new ShareRepository();
  });

  it('creates and retrieves share', async () => {
    const created = await repository.createShare({
      id: 'share_001',
      userId: 'user_001',
      type: 'report',
      data: { reportId: 'report_001' },
      title: 'Report Share',
      views: 0,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60)
    });

    expect(created.id).toBe('share_001');

    const fetched = await repository.getShareById('share_001');
    expect(fetched).toBeDefined();
    expect(fetched.title).toBe('Report Share');
  });

  it('increments views and logs access', async () => {
    await repository.createShare({
      id: 'share_002',
      userId: 'user_002',
      type: 'report',
      data: { reportId: 'report_002' },
      title: 'Report Share',
      views: 0,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60)
    });

    const views = await repository.incrementViews('share_002');
    expect(views).toBe(1);

    const log = await repository.logAccess({
      shareId: 'share_002',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      accessedAt: new Date()
    });

    expect(log.shareLinkId).toBe('share_002');
  });
});
