import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'fs';
import { DeepSeekMockServer } from '../../../helpers/DeepSeekMockServer.js';

let DemoGenerationService;

describe('DemoGenerationService', () => {
  let mockServer;
  let service;

  beforeAll(async () => {
    mockServer = new DeepSeekMockServer();
    await mockServer.start();
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.DEEPSEEK_API_URL = mockServer.getUrl();

    const module = await import('../../../../domains/demo/services/DemoGenerationService.js');
    DemoGenerationService = module.DemoGenerationService;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    service = new DemoGenerationService();
  });

  it('generates demo code', async () => {
    mockServer.enqueueResponse('<html>demo</html>');

    const result = await service.generateDemoCode('web', [
      { role: 'user', content: 'Demo idea' }
    ]);

    expect(result.demoType).toBe('web');
    expect(result.code).toContain('demo');
  });

  it('saves demo files and metadata', () => {
    const htmlPath = service.saveDemoFile('demo_001', '<html>demo</html>');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const metaPath = service.saveDemoMetadata('demo_001', { title: 'Demo' });
    expect(fs.existsSync(metaPath)).toBe(true);
  });
});
