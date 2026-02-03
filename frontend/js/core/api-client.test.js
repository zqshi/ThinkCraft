/**
 * api-client.js 单元测试
 * 覆盖 keep-alive 刷新策略
 */
import { jest } from '@jest/globals';

function base64UrlEncode(payload) {
  return Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function buildJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.signature`;
}

describe('APIClient keep-alive', () => {
  let client;

  beforeEach(async () => {
    if (!global.atob) {
      global.atob = b => Buffer.from(b, 'base64').toString('utf8');
    }
    await import('./api-client.js');
    client = new window.APIClient('http://localhost');
    client.setKeepAliveConfig({ thresholdMs: 60 * 1000, cooldownMs: 0 });
  });

  test('ensureFreshToken returns false when no token', async () => {
    const refreshed = await client.ensureFreshToken();
    expect(refreshed).toBe(false);
  });

  test('does not refresh when token not near expiry', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60;
    sessionStorage.setItem('thinkcraft_access_token', buildJwt({ exp }));
    client.refreshAccessToken = jest.fn().mockResolvedValue(true);

    await client.ensureFreshToken();

    expect(client.refreshAccessToken).not.toHaveBeenCalled();
  });

  test('refreshes when near expiry and updates lastRefreshAt', async () => {
    const exp = Math.floor(Date.now() / 1000) + 30;
    sessionStorage.setItem('thinkcraft_access_token', buildJwt({ exp }));
    client.refreshAccessToken = jest.fn().mockResolvedValue(true);
    const before = client.lastRefreshAt;

    const refreshed = await client.ensureFreshToken();

    expect(refreshed).toBe(true);
    expect(client.refreshAccessToken).toHaveBeenCalled();
    expect(client.lastRefreshAt).toBeGreaterThan(before);
  });

  test('respects refresh cooldown window', async () => {
    const exp = Math.floor(Date.now() / 1000) + 30;
    sessionStorage.setItem('thinkcraft_access_token', buildJwt({ exp }));
    client.setKeepAliveConfig({ thresholdMs: 60 * 1000, cooldownMs: 60 * 1000 });
    client.refreshAccessToken = jest.fn().mockResolvedValue(true);
    client.lastRefreshAt = Date.now();

    await client.ensureFreshToken();

    expect(client.refreshAccessToken).not.toHaveBeenCalled();
  });
});
