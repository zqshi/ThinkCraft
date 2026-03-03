import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Build Pipeline Contract', () => {
  test('build should run css sync in one-shot mode before vite build', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));

    expect(packageJson.scripts.build).toContain('node scripts/sync-css.js --once');
    expect(packageJson.scripts.build).toContain('vite build');
  });
});
