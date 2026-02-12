process.env.NODE_ENV = 'test';

import { startTestServer, requestJson } from '../../helpers/http.js';

const { app } = await import('../../../server.js');

describe('E2E health endpoints', () => {
  let server;
  let port;

  beforeAll(async () => {
    const started = await startTestServer(app);
    server = started.server;
    port = started.port;
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  it('should return OK on /health', async () => {
    const res = await requestJson({ port, path: '/health' });
    expect(res.status).toBe(200);
    expect(res.body).toBe('OK');
  });

  it('should return service info on /api/health', async () => {
    const res = await requestJson({ port, path: '/api/health' });
    expect(res.status).toBe(200);
    expect(res.json.status).toBe('ok');
  });

  it('should enforce auth on unknown api route', async () => {
    const res = await requestJson({ port, path: '/api/unknown' });
    expect(res.status).toBe(401);
    expect(res.json.error).toContain('令牌');
  });
});
