import http from 'node:http';

export function startTestServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

export function requestJson({ port, path, method = 'GET', body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => {
          raw += chunk;
        });
        res.on('end', () => {
          const contentType = res.headers['content-type'] || '';
          let json = null;
          if (contentType.includes('application/json')) {
            try {
              json = JSON.parse(raw);
            } catch {
              json = null;
            }
          }
          resolve({ status: res.statusCode, body: raw, json });
        });
      }
    );

    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
}
