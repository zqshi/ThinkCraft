import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ARTIFACT_TYPES } from '../backend/config/workflow-stages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const errors = [];

// 1) 检查 ARTIFACT_TYPES 的 promptTemplates
for (const [type, def] of Object.entries(ARTIFACT_TYPES)) {
  const templates = Array.isArray(def?.promptTemplates) ? def.promptTemplates : [];
  if (templates.length === 0) {
    errors.push(`交付物 ${type} 未配置 promptTemplates`);
    continue;
  }
  for (const tpl of templates) {
    if (!tpl.startsWith('prompts/agents/')) {
      errors.push(`交付物 ${type} 模板路径必须在 prompts/agents/: ${tpl}`);
      continue;
    }
    const abs = path.resolve(projectRoot, tpl);
    if (!exists(abs)) {
      errors.push(`交付物 ${type} 模板不存在: ${tpl}`);
      continue;
    }
    const content = readText(abs);
    if (!content.trim()) {
      errors.push(`交付物 ${type} 模板为空: ${tpl}`);
    }
  }
}

// 2) 检查 workflow.json outputs 是否在 ARTIFACT_TYPES 内
const workflowPath = path.resolve(
  projectRoot,
  'prompts/scene-2-agent-orchestration/product-development/workflow.json'
);
if (!exists(workflowPath)) {
  errors.push('workflow.json 不存在: prompts/scene-2-agent-orchestration/product-development/workflow.json');
} else {
  const workflow = JSON.parse(readText(workflowPath));
  const outputs = (workflow?.phases || [])
    .flatMap(phase => phase.outputs || [])
    .filter(Boolean);
  outputs.forEach(output => {
    if (!ARTIFACT_TYPES[output]) {
      errors.push(`workflow.json 引用未定义交付物类型: ${output}`);
    }
  });
}

if (errors.length > 0) {
  console.error('模板校验失败:');
  errors.forEach(err => console.error(`- ${err}`));
  process.exit(1);
}

console.log('模板校验通过');
