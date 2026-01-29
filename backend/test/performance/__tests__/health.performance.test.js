process.env.NODE_ENV = 'test';

import { startTestServer, requestJson } from '../../helpers/http.js';

const { app } = await import('../../../server.js');

describe('Performance baseline - health', () => {
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

  it('should keep average response time under 1000ms', async () => {
    const runs = 10;
    let total = 0;
    for (let i = 0; i < runs; i += 1) {
      const start = Date.now();
      const res = await requestJson({ port, path: '/health' });
      const duration = Date.now() - start;
      total += duration;
      expect(res.status).toBe(200);
    }

    const avg = total / runs;
    expect(avg).toBeLessThan(1000);
  });
});
