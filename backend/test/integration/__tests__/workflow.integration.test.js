import { jest } from '@jest/globals';
import { startTestServer, requestJson } from '../../helpers/http.js';

process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../../../config/deepseek.js', () => ({
  callDeepSeekAPI: jest.fn(async () => ({
    content: 'Generated artifact content',
    usage: { total_tokens: 123 }
  }))
}));

const { app } = await import('../../../server.js');

describe('Workflow integration', () => {
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

  it('should execute a workflow stage and return artifacts', async () => {
    const res = await requestJson({
      port,
      path: '/api/workflow/project-1/execute-stage',
      method: 'POST',
      body: { stageId: 'requirement', context: { CONVERSATION: 'idea' } }
    });

    expect(res.status).toBe(200);
    expect(res.json.data.artifacts.length).toBeGreaterThan(0);
  });
});
