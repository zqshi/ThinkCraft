/**
 * Prompt完整性校验脚本（已升级）
 * 目标：
 * 1) 校验 ARTIFACT_TYPES 的模板路径存在且非空
 * 2) 校验 AGENT_PROMPT_MAP 的 persona 路径存在且非空
 * 3) 校验 workflow.json 的 phase/依赖/outputs 基本完整性
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AGENT_PROMPT_MAP, ARTIFACT_TYPES } from '../config/workflow-stages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function resolveFromRepo(relativePath) {
  return path.resolve(repoRoot, relativePath);
}

function existsNonEmpty(filePath) {
  if (!fs.existsSync(filePath)) return { ok: false, reason: 'missing' };
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.trim()) return { ok: false, reason: 'empty' };
  return { ok: true, reason: '' };
}

function validateArtifactTemplates(issues) {
  const artifactTypes = Object.entries(ARTIFACT_TYPES || {});
  for (const [artifactType, def] of artifactTypes) {
    const templates = Array.isArray(def?.promptTemplates) ? def.promptTemplates : [];
    if (templates.length === 0) {
      issues.push(`[artifact] ${artifactType} 未配置 promptTemplates`);
      continue;
    }
    for (const relative of templates) {
      if (!relative.startsWith('prompts/agents/')) {
        issues.push(`[artifact] ${artifactType} 模板路径非法: ${relative}`);
        continue;
      }
      const abs = resolveFromRepo(relative);
      const state = existsNonEmpty(abs);
      if (!state.ok) {
        issues.push(
          `[artifact] ${artifactType} 模板${state.reason === 'missing' ? '不存在' : '为空'}: ${relative}`
        );
      }
    }
  }
}

function validateAgentPersonaTemplates(issues) {
  const agents = Object.entries(AGENT_PROMPT_MAP || {});
  for (const [agentType, profile] of agents) {
    const persona = Array.isArray(profile?.persona) ? profile.persona : [];
    for (const relative of persona) {
      const abs = resolveFromRepo(relative);
      const state = existsNonEmpty(abs);
      if (!state.ok) {
        issues.push(
          `[persona] ${agentType} persona ${state.reason === 'missing' ? '不存在' : '为空'}: ${relative}`
        );
      }
    }
  }
}

function validateWorkflowJson(issues) {
  const workflowPath = resolveFromRepo(
    'prompts/scene-2-agent-orchestration/product-development/workflow.json'
  );
  if (!fs.existsSync(workflowPath)) {
    issues.push('[workflow] workflow.json 不存在');
    return;
  }

  let workflow = null;
  try {
    workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
  } catch (error) {
    issues.push(`[workflow] workflow.json 解析失败: ${error.message}`);
    return;
  }

  const phases = Array.isArray(workflow?.phases) ? workflow.phases : [];
  if (phases.length === 0) {
    issues.push('[workflow] phases 为空');
    return;
  }

  const phaseIds = new Set(phases.map(phase => phase.phase_id).filter(Boolean));
  for (const phase of phases) {
    if (!phase.phase_id) {
      issues.push('[workflow] phase 缺少 phase_id');
      continue;
    }
    if (!Array.isArray(phase.agents) || phase.agents.length === 0) {
      issues.push(`[workflow] ${phase.phase_id} 缺少 agents`);
    }
    if (!Array.isArray(phase.outputs) || phase.outputs.length === 0) {
      issues.push(`[workflow] ${phase.phase_id} 缺少 outputs`);
    } else {
      for (const output of phase.outputs) {
        if (!ARTIFACT_TYPES[output]) {
          issues.push(`[workflow] ${phase.phase_id} 引用了未定义交付物: ${output}`);
        }
      }
    }
    for (const dep of phase.dependencies || []) {
      if (!phaseIds.has(dep)) {
        issues.push(`[workflow] ${phase.phase_id} 依赖不存在: ${dep}`);
      }
    }
  }
}

function main() {
  log('========================================', 'blue');
  log('  Prompt完整性验证（升级版）', 'blue');
  log('========================================', 'blue');

  const issues = [];
  validateArtifactTemplates(issues);
  validateAgentPersonaTemplates(issues);
  validateWorkflowJson(issues);

  if (issues.length === 0) {
    log('✓ 模板完整性校验通过', 'green');
    process.exit(0);
  }

  log(`✗ 发现 ${issues.length} 个问题:`, 'red');
  for (const issue of issues) {
    log(`- ${issue}`, 'yellow');
  }
  process.exit(1);
}

main();
