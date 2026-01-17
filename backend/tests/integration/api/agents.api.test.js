import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { loadApp, resetApp } from '../helpers/testApp.js';

describe('Agents API', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    resetApp();
    app = await loadApp();
  });

  it('returns agent types', async () => {
    const response = await request(app).get('/api/agents/types');

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data.types.length).toBeGreaterThan(0);
  });

  it('hires an agent', async () => {
    const response = await request(app)
      .post('/api/agents/hire')
      .send({ userId: 'user_001', agentType: 'backend-dev', nickname: 'Dev' });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data.userId).toBe('user_001');
  });
});
