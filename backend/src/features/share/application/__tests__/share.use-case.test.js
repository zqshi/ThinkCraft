import ShareUseCase from '../share.use-case.js';
import { ShareInMemoryRepository } from '../../infrastructure/share-inmemory.repository.js';
import {
  CreateShareRequestDto,
  UpdateShareRequestDto,
  AccessShareRequestDto,
  BatchShareOperationDto
} from '../share.dto.js';

describe('ShareUseCase', () => {
  let repository;
  let useCase;

  beforeEach(() => {
    repository = new ShareInMemoryRepository();
    useCase = new ShareUseCase(repository);
  });

  it('should create and access a share', async () => {
    const share = await useCase.createShare(
      new CreateShareRequestDto({
        resourceId: 'res-1',
        resourceType: 'report',
        title: '共享报告',
        description: 'desc',
        permission: 'read',
        expiresAt: null,
        password: '1234'
      }),
      'user-1'
    );

    const access = await useCase.accessShare(
      share.shareLink,
      new AccessShareRequestDto({ password: '1234' })
    );

    expect(access.hasAccess).toBe(true);
    expect(access.share.id).toBe(share.id);
  });

  it('should update and revoke share with permissions', async () => {
    const created = await useCase.createShare(
      new CreateShareRequestDto({
        resourceId: 'res-2',
        resourceType: 'report',
        title: 'Title',
        description: 'desc',
        permission: 'read',
        expiresAt: null,
        password: null
      }),
      'owner'
    );

    const updated = await useCase.updateShare(
      created.id,
      new UpdateShareRequestDto({ title: 'New', permission: 'edit' }),
      'owner'
    );

    expect(updated.title).toBe('New');
    expect(updated.permission).toBe('edit');

    const revoked = await useCase.revokeShare(created.id, 'owner');
    expect(revoked.status).toBe('revoked');
  });

  it('should return user shares, stats, and resource status', async () => {
    const share1 = await useCase.createShare(
      new CreateShareRequestDto({
        resourceId: 'res-3',
        resourceType: 'report',
        title: 'R1',
        description: '',
        permission: 'read',
        expiresAt: null,
        password: null
      }),
      'user-2'
    );
    await useCase.createShare(
      new CreateShareRequestDto({
        resourceId: 'res-3',
        resourceType: 'report',
        title: 'R2',
        description: '',
        permission: 'read',
        expiresAt: null,
        password: null
      }),
      'user-2'
    );

    const list = await useCase.getUserShares('user-2');
    expect(list.length).toBe(2);

    const status = await useCase.getResourceShareStatus('res-3', 'report');
    expect(status.isShared).toBe(true);

    const stats = await useCase.getShareStats('user-2');
    expect(stats.totalShares).toBe(2);
    expect(stats.totalAccesses).toBeGreaterThanOrEqual(0);

    const detail = await useCase.getShare(share1.id, 'user-2');
    expect(detail.id).toBe(share1.id);
  });

  it('should handle batch operations and cleanup', async () => {
    const share = await useCase.createShare(
      new CreateShareRequestDto({
        resourceId: 'res-4',
        resourceType: 'report',
        title: 'Batch',
        description: '',
        permission: 'read',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        password: null
      }),
      'user-3'
    );

    const batch = await useCase.batchOperation(
      new BatchShareOperationDto({ shareIds: [share.id], operation: 'revoke' }),
      'user-3'
    );
    expect(batch[0].success).toBe(true);

    const cleanup = await useCase.cleanupExpiredShares();
    expect(cleanup.length).toBeGreaterThanOrEqual(0);
  });

  it('should validate share password', async () => {
    const share = await useCase.createShare(
      new CreateShareRequestDto({
        resourceId: 'res-5',
        resourceType: 'report',
        title: 'Pwd',
        description: '',
        permission: 'read',
        expiresAt: null,
        password: '9999'
      }),
      'user-4'
    );

    const ok = await useCase.validatePassword(share.shareLink, '9999');
    expect(ok).toBe(true);
  });
});
