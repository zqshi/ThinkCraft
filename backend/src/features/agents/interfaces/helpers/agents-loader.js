import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFrontMatter } from './agents-frontmatter.js';
import { normalizeAgentId } from './agents-fallback.js';
import { walkMarkdownFiles } from './agents-roles-files.js';

export {
  loadPromptIndexByCategory,
  loadWorkflowAgentIds
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../../../../');
const PROMPT_ROOT = path.join(REPO_ROOT, 'prompts', 'scene-2-agent-orchestration');
const WORKFLOW_CATEGORY_DIRS = {
  'product-development': 'product-development'
};

async function loadPromptIndexByCategory(workflowCategory) {
  const folder = WORKFLOW_CATEGORY_DIRS[workflowCategory];
  if (!folder) {
    return null;
  }
  const agentsDir = path.join(PROMPT_ROOT, folder, 'agents');
  let files = [];
  try {
    files = await walkMarkdownFiles(agentsDir);
  } catch (error) {
    return null;
  }

  const index = new Map();
  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const frontMatter = parseFrontMatter(content);
      const rawName = frontMatter.name || path.basename(filePath, '.md');
      const agentId = normalizeAgentId(rawName) || rawName;
      const promptPath = path
        .relative(path.join(__dirname, '../../../../..', 'prompts'), filePath)
        .replace(/\\/g, '/')
        .replace(/\.md$/, '');
      index.set(agentId, {
        promptPath,
        name: rawName,
        description: frontMatter.description
      });
    } catch (error) {
      continue;
    }
  }
  return index;
}

async function loadWorkflowAgentIds(workflowCategory) {
  const folder = WORKFLOW_CATEGORY_DIRS[workflowCategory];
  if (!folder) {
    return [];
  }
  const workflowPath = path.join(PROMPT_ROOT, folder, 'workflow.json');
  try {
    const content = await fs.readFile(workflowPath, 'utf-8');
    const config = JSON.parse(content);
    const ids = [];
    for (const phase of config.phases || []) {
      for (const agent of phase.agents || []) {
        if (agent?.agent_id) {
          ids.push(agent.agent_id);
        }
      }
    }
    return Array.from(new Set(ids));
  } catch (error) {
    return [];
  }
}
