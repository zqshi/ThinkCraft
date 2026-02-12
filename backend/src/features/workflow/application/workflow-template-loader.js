import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { ARTIFACT_TYPES } from '../../../../config/workflow-stages.js';
import { replaceTemplateVariables } from '../interfaces/helpers/workflow-helpers.js';
import { resolveRepoRoot } from '../../projects/infrastructure/project-files.js';

export async function loadPromptFromTemplates(artifactType, context = {}) {
  const def = ARTIFACT_TYPES[artifactType];
  const templates = Array.isArray(def?.promptTemplates) ? def.promptTemplates : [];
  if (templates.length === 0) {
    const err = new Error(`交付物 ${artifactType} 未配置 promptTemplates`);
    err.status = 400;
    throw err;
  }

  const projectRoot = resolveRepoRoot();
  const contents = [];
  for (const tpl of templates) {
    const abs = path.resolve(projectRoot, tpl);
    if (!fs.existsSync(abs)) {
      const err = new Error(`交付物模板不存在: ${tpl}`);
      err.status = 400;
      throw err;
    }

    const text = await fsPromises.readFile(abs, 'utf-8');
    if (!text || !text.trim()) {
      const err = new Error(`交付物模板为空: ${tpl}`);
      err.status = 400;
      throw err;
    }
    contents.push(replaceTemplateVariables(text, context));
  }

  return contents.join('\n\n');
}
