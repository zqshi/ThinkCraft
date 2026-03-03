import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('System Page Contract', () => {
  test('index system page should keep core layout anchors', () => {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

    expect(indexHtml).toContain('id="sidebar"');
    expect(indexHtml).toContain('id="chatHistory"');
    expect(indexHtml).toContain('id="mainTitle"');
    expect(indexHtml).toContain('ThinkCraft AI');
    expect(indexHtml).toContain('id="chatContainer"');
    expect(indexHtml).toContain('id="emptyState"');
    expect(indexHtml).toContain('id="mainInput"');
    expect(indexHtml).toContain('id="sendBtn"');
  });

  test('index system page should keep the default empty-state copy', () => {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

    expect(indexHtml).toContain('苏格拉底式思维引导');
  });
});
