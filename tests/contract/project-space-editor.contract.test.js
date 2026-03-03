import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Project Space Editor Contract', () => {
  test('projects routes should keep static routes before dynamic /:id route', () => {
    const source = fs.readFileSync(
      path.join(ROOT_DIR, 'backend/src/features/projects/interfaces/projects-routes.js'),
      'utf-8'
    );

    const dynamicIndex = source.lastIndexOf("router.get('/:id', projectController.getProject);");
    const healthIndex = source.indexOf("router.get('/health'");
    const searchIndex = source.indexOf("router.get('/search'");
    const statisticsIndex = source.indexOf("router.get('/statistics'");
    const workflowConfigIndex = source.indexOf("router.get('/workflow-config/:category'");

    expect(dynamicIndex).toBeGreaterThan(-1);
    expect(healthIndex).toBeGreaterThan(-1);
    expect(searchIndex).toBeGreaterThan(-1);
    expect(statisticsIndex).toBeGreaterThan(-1);
    expect(workflowConfigIndex).toBeGreaterThan(-1);

    expect(dynamicIndex).toBeGreaterThan(searchIndex);
    expect(dynamicIndex).toBeGreaterThan(statisticsIndex);
    expect(dynamicIndex).toBeGreaterThan(healthIndex);
    expect(dynamicIndex).toBeGreaterThan(workflowConfigIndex);
  });

  test('index should load EasyMDE from local node_modules path instead of CDN', () => {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

    expect(indexHtml).toContain('/node_modules/easymde/dist/easymde.min.css');
    expect(indexHtml).toContain('/node_modules/easymde/dist/easymde.min.js');
    expect(indexHtml).not.toContain('cdnjs.cloudflare.com/ajax/libs/easymde');
  });
});
