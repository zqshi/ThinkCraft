import { jest } from '@jest/globals';
import { startTestServer, requestJson } from '../../helpers/http.js';

process.env.NODE_ENV = 'test';

const mockUseCase = {
  extractTokenFromHeader: jest.fn(header => header?.split(' ')[1] || null),
  validateAccessToken: jest.fn(async () => {
    throw new Error('invalid token');
  })
};

jest.unstable_mockModule('../../../src/features/auth/application/auth.use-case.js', () => ({
  authUseCase: mockUseCase
}));

const { app } = await import('../../../server.js');

describe('Security baseline - auth middleware', () => {
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

  it('should reject missing token', async () => {
    const res = await requestJson({ port, path: '/api/auth/me' });
    expect(res.status).toBe(401);
    expect(res.json.error).toContain('未提供访问令牌');
  });

  it('should reject invalid token', async () => {
    const res = await requestJson({
      port,
      path: '/api/auth/me',
      headers: { Authorization: 'Bearer invalid' }
    });
    expect(res.status).toBe(401);
  });
});
