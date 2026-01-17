import { describe, it, expect, beforeEach } from '@jest/globals';
import { ReportRepository } from '../../../../domains/report/repositories/ReportRepository.js';

describe('ReportRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new ReportRepository();
  });

  it('creates and retrieves report', async () => {
    const report = await repository.createReport({
      id: 'report_001',
      conversationId: 'conv_001',
      userId: 'user_001',
      reportData: { summary: 'test' },
      status: 'draft',
      version: 1
    });

    expect(report.id).toBe('report_001');

    const fetched = await repository.getReportById('report_001');
    expect(fetched).toBeDefined();
    expect(fetched.userId).toBe('user_001');
  });

  it('updates report status', async () => {
    await repository.createReport({
      id: 'report_002',
      conversationId: 'conv_002',
      userId: 'user_002',
      reportData: { summary: 'test' },
      status: 'draft',
      version: 1
    });

    const updated = await repository.updateStatus('report_002', 'final');
    expect(updated).toBe(true);
  });
});
