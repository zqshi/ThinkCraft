import { jest } from '@jest/globals';
import { startTestServer, requestJson } from '../../helpers/http.js';

process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../../../config/deepseek.js', () => ({
  callDeepSeekAPI: jest.fn(async () => ({
    content: '{"projectType":"web-app","confidence":0.9,"reasoning":"test","suggestedStages":["requirement","design"],"estimatedDuration":10,"complexity":"low","recommendations":["r1"]}'
  }))
}));

const { app } = await import('../../../server.js');

describe('Workflow recommendation integration', () => {
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

  it('should analyze workflow recommendation', async () => {
    const res = await requestJson({
      port,
      path: '/api/workflow-recommendation/analyze',
      method: 'POST',
      body: { projectName: 'Test Project', projectDescription: 'desc' }
    });

    expect(res.status).toBe(200);
    expect(res.json.data.projectType).toBe('web-app');
  });
});
