import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { loadApp, resetApp } from '../helpers/testApp.js';

describe('Share API', () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    resetApp();
    app = await loadApp();
  });

  it('creates and retrieves share', async () => {
    const createRes = await request(app)
      .post('/api/share/create')
      .send({
        userId: 'user_001',
        type: 'report',
        data: { reportId: 'report_001' },
        title: 'Report Share'
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.code).toBe(0);

    const shareId = createRes.body.data.shareId;

    const getRes = await request(app).get(`/api/share/${shareId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.type).toBe('report');
  });
});
