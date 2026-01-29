import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../../config/deepseek.js', () => ({
  callDeepSeekAPI: jest.fn(async () => ({
    content: '{"sections":[{"title":"S1","content":"C1","type":"text","order":1}]}'
  }))
}));

const { ReportGenerationService } = await import('../report-generation.service.js');
const { ReportType } = await import('../../domain/value-objects/report-type.vo.js');

describe('ReportGenerationService', () => {
  it('should build prompt and generate sections', async () => {
    const service = new ReportGenerationService();
    const report = {
      title: '报告',
      description: 'desc',
      type: new ReportType(ReportType.BUSINESS_PLAN)
    };

    const sections = await service.generateReport(report, { type: 'conversation', messages: [] }, {});
    expect(sections.length).toBe(1);
    expect(sections[0].title).toBe('S1');
  });

  it('should build conversation context', () => {
    const service = new ReportGenerationService();
    const ctx = service.buildConversationContext([{ role: 'user', content: 'hi' }]);
    expect(ctx).toContain('用户');
  });
});
