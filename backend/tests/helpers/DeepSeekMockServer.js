import http from 'http';

const DEFAULT_USAGE = {
  prompt_tokens: 50,
  completion_tokens: 50,
  total_tokens: 100
};

export class DeepSeekMockServer {
  constructor() {
    this.server = null;
    this.port = null;
    this.responses = [];
    this.calls = [];
  }

  enqueueResponse(content, overrides = {}) {
    this.responses.push({
      model: 'deepseek-chat',
      choices: [{ message: { content } }],
      usage: DEFAULT_USAGE,
      ...overrides
    });
  }

  getCallHistory() {
    return this.calls;
  }

  getUrl() {
    if (!this.port) {
      return null;
    }
    return `http://127.0.0.1:${this.port}/chat/completions`;
  }

  async start(port = 0) {
    if (this.server) {
      return;
    }

    this.server = http.createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/chat/completions') {
        res.writeHead(404);
        res.end();
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        let payload = null;
        try {
          payload = JSON.parse(body);
        } catch (error) {
          payload = null;
        }

        this.calls.push({
          headers: req.headers,
          payload,
          timestamp: new Date().toISOString()
        });

        const response = this.responses.shift() || {
          model: 'deepseek-chat',
          choices: [{ message: { content: 'Mocked DeepSeek response' } }],
          usage: DEFAULT_USAGE
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      });
    });

    await new Promise((resolve) => {
      this.server.listen(port, '127.0.0.1', () => {
        this.port = this.server.address().port;
        resolve();
      });
    });
  }

  async stop() {
    if (!this.server) {
      return;
    }

    await new Promise((resolve) => {
      this.server.close(() => resolve());
    });
    this.server = null;
    this.port = null;
  }
}
