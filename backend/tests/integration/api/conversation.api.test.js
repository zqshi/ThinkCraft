import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { loadApp, resetApp } from '../helpers/testApp.js';

describe('Conversation API', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    resetApp();
    app = await loadApp();
  });

  it('creates and fetches a conversation', async () => {
    const createRes = await request(app)
      .post('/api/conversations')
      .send({ userId: 'user_001', title: 'My Idea' });

    expect(createRes.status).toBe(200);
    expect(createRes.body.code).toBe(0);

    const conversationId = createRes.body.data.id;

    const getRes = await request(app)
      .get(`/api/conversations/${conversationId}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(conversationId);
  });

  it('updates conversation title', async () => {
    const createRes = await request(app)
      .post('/api/conversations')
      .send({ userId: 'user_002', title: 'Original' });

    const conversationId = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/conversations/${conversationId}/title`)
      .send({ title: 'Updated' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.code).toBe(0);
  });
});
