import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Login Flow Contract', () => {
  test('login success should redirect to system page entry', () => {
    const loginHtml = fs.readFileSync(path.join(ROOT_DIR, 'login.html'), 'utf-8');

    expect(loginHtml).toContain("window.location.href = 'index.html?app=1';");
  });
});
