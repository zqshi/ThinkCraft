import { jest } from '@jest/globals';
import { startTestServer, requestJson } from '../../helpers/http.js';

process.env.NODE_ENV = 'test';

const mockUseCase = {
  login: jest.fn(async () => ({
    accessToken: 'access',
    refreshToken: 'refresh',
    user: { id: 'user-1', phone: '13800138000', status: 'active' }
  })),
  register: jest.fn(async () => ({
    accessToken: 'access',
    refreshToken: 'refresh',
    user: { id: 'user-1', phone: '13800138000', status: 'active' }
  })),
  refreshToken: jest.fn(async () => ({ accessToken: 'access', user: { id: 'user-1' } })),
  getCurrentUser: jest.fn(async () => ({ id: 'user-1', phone: '13800138000' })),
  logout: jest.fn(async () => true),
  extractTokenFromHeader: jest.fn(() => 'token'),
  validateAccessToken: jest.fn(async () => ({ userId: 'user-1', phone: '13800138000' }))
};

jest.unstable_mockModule('../../../src/features/auth/application/auth.use-case.js', () => ({
  authUseCase: mockUseCase
}));

const { app } = await import('../../../server.js');

describe('Auth integration (mocked use case)', () => {
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

  it('should login with phone+code', async () => {
    const res = await requestJson({
      port,
      path: '/api/auth/login',
      method: 'POST',
      body: { phone: '13800138000', code: '123456' }
    });

    expect(res.status).toBe(200);
    expect(res.json.data.accessToken).toBe('access');
  });

  it('should register with phone+code', async () => {
    const res = await requestJson({
      port,
      path: '/api/auth/register',
      method: 'POST',
      body: { phone: '13800138000', code: '123456' }
    });

    expect(res.status).toBe(201);
    expect(res.json.data.user.phone).toBe('13800138000');
  });
});
