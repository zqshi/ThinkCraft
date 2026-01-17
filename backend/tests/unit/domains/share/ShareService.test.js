import { describe, it, expect, beforeEach } from '@jest/globals';
import { ShareService } from '../../../../domains/share/services/ShareService.js';
import { ShareRepository } from '../../../../domains/share/repositories/ShareRepository.js';

describe('ShareService', () => {
  let service;

  beforeEach(() => {
    service = new ShareService(new ShareRepository());
  });

  it('creates and accesses share', async () => {
    const share = await service.createShare(
      'user_001',
      'report',
      { reportId: 'report_001' },
      'Report Share'
    );

    expect(share.shareId).toBeDefined();

    const content = await service.getShare(share.shareId, { ip: '127.0.0.1', userAgent: 'jest' });
    expect(content).toBeDefined();
    expect(content.type).toBe('report');
  });

  it('updates share title', async () => {
    const share = await service.createShare(
      'user_002',
      'report',
      { reportId: 'report_002' },
      'Old Title'
    );

    const updated = await service.updateShareTitle(share.shareId, 'New Title');
    expect(updated).toBe(true);
  });
});
