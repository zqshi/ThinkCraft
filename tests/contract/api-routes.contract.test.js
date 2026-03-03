import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('API Route Contract', () => {
  test('backend server should mount verification and agents routes', () => {
    const serverSource = fs.readFileSync(path.join(ROOT_DIR, 'backend/server.js'), 'utf-8');

    expect(serverSource).toContain("app.use('/api/verification', verificationRouter);");
    expect(serverSource).toContain("app.use('/api/agents', agentsRouter);");
  });

  test('verification route module should define send endpoint', () => {
    const verificationRouteSource = fs.readFileSync(
      path.join(ROOT_DIR, 'backend/routes/verification.js'),
      'utf-8'
    );

    expect(verificationRouteSource).toMatch(/router\.post\(\s*['"]\/send['"]/);
  });
});
