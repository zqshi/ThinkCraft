import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DeepSeekMockServer } from '../../../helpers/DeepSeekMockServer.js';

let BusinessPlanGenerationService;

describe('BusinessPlanGenerationService', () => {
  let mockServer;
  let service;

  beforeAll(async () => {
    mockServer = new DeepSeekMockServer();
    await mockServer.start();
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.DEEPSEEK_API_URL = mockServer.getUrl();

    const module = await import('../../../../domains/businessPlan/services/BusinessPlanGenerationService.js');
    BusinessPlanGenerationService = module.BusinessPlanGenerationService;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    service = new BusinessPlanGenerationService();
  });

  it('formats conversation history', () => {
    const formatted = service.formatConversation([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' }
    ]);

    expect(formatted).toContain('用户: Hello');
    expect(formatted).toContain('AI助手: Hi');
  });

  it('generates a chapter with valid inputs', async () => {
    mockServer.enqueueResponse('Chapter content');

    const result = await service.generateChapter('executive_summary', [
      { role: 'user', content: 'Idea' }
    ]);

    expect(result.chapterId).toBe('executive_summary');
    expect(result.content).toContain('Chapter content');
    expect(result.tokens).toBeGreaterThan(0);
  });

  it('generates batch chapters', async () => {
    mockServer.enqueueResponse('Chapter A');
    mockServer.enqueueResponse('Chapter B');

    const batch = await service.generateBatchChapters(
      ['executive_summary', 'market_analysis'],
      [{ role: 'user', content: 'Idea' }]
    );

    expect(batch.chapters).toHaveLength(2);
    expect(batch.totalTokens).toBeGreaterThan(0);
  });
});
