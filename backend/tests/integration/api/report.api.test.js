import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { DeepSeekMockServer } from '../../helpers/DeepSeekMockServer.js';
import { loadApp, resetApp } from '../helpers/testApp.js';

describe('Report API', () => {
  let app;
  let mockServer;

  beforeAll(async () => {
    mockServer = new DeepSeekMockServer();
    await mockServer.start();
    process.env.NODE_ENV = 'test';
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.DEEPSEEK_API_URL = mockServer.getUrl();

    resetApp();
    app = await loadApp();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it('generates report from messages', async () => {
    mockServer.enqueueResponse(JSON.stringify({
      initialIdea: 'Idea',
      coreDefinition: 'Definition',
      targetUser: 'Users',
      problem: 'Problem',
      solution: 'Solution',
      validation: 'Validation',
      chapters: {}
    }));

    const response = await request(app)
      .post('/api/report/generate')
      .send({
        conversationId: 'conv_001',
        userId: 'user_001',
        messages: [{ role: 'user', content: 'My idea' }]
      });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data.report).toBeDefined();
  });
});
