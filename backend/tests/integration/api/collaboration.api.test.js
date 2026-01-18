import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { loadApp, resetApp } from '../helpers/testApp.js';

describe('Collaboration API', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    resetApp();
    app = await loadApp();
  });

  it('creates collaboration plan', async () => {
    const response = await request(app)
      .post('/api/collaboration/create')
      .send({ userId: 'user_001', goal: 'Launch a new SaaS product' });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data.planId).toBeDefined();
  });
});
