import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DeepSeekMockServer } from '../../../helpers/DeepSeekMockServer.js';
import { ReportRepository } from '../../../../domains/report/repositories/ReportRepository.js';

let ReportGenerationService;

describe('ReportGenerationService', () => {
  let mockServer;
  let service;

  beforeAll(async () => {
    mockServer = new DeepSeekMockServer();
    await mockServer.start();
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.DEEPSEEK_API_URL = mockServer.getUrl();

    const module = await import('../../../../domains/report/services/ReportGenerationService.js');
    ReportGenerationService = module.ReportGenerationService;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    service = new ReportGenerationService(new ReportRepository());
  });

  it('generates and stores report', async () => {
    mockServer.enqueueResponse(JSON.stringify({
      initialIdea: 'Idea',
      coreDefinition: 'Definition',
      targetUser: 'Users',
      problem: 'Problem',
      solution: 'Solution',
      validation: 'Validation',
      chapters: {}
    }));

    const result = await service.generateReport(
      'conv_001',
      'user_001',
      [{ role: 'user', content: 'My idea' }]
    );

    expect(result.report).toBeDefined();
    expect(result.report.conversationId).toBe('conv_001');
    expect(result.tokens.total).toBeGreaterThan(0);
  });
});
