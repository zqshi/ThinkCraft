/**
 * 工作流执行 API
 * 协同开发模式的阶段任务执行
 */
import express from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import {
  getStageById,
  normalizeStageId,
  ARTIFACT_TYPES,
  AGENT_PROMPT_MAP
} from '../../../../config/workflow-stages.js';
import { projectRepository } from '../../../features/projects/infrastructure/index.js';
import {
  buildArtifactFileUrl,
  ensureProjectWorkspace,
  ensureDevScaffold,
  materializeArtifactFile,
  resolveRepoRoot,
  updateArtifactsIndex
} from '../../../features/projects/infrastructure/project-files.js';

const router = express.Router();

function parseJsonPayload(text) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (inner) {
        return null;
      }
    }
    return null;
  }
}

function buildRoleTemplateMapping() {
  return Object.entries(AGENT_PROMPT_MAP).map(([agentId, profile]) => {
    const deliverables = (profile.deliverables || []).map(type => {
      const def = ARTIFACT_TYPES[type];
      return {
        type,
        name: def?.name || type,
        templates: Array.isArray(def?.promptTemplates) ? def.promptTemplates : []
      };
    });
    return {
      agentId,
      name: profile.name || agentId,
      deliverables
    };
  });
}

function shouldInlinePreview(artifactType) {
  return ['prototype', 'preview', 'ui-preview'].includes(artifactType);
}

function normalizeOutputToTypeId(output) {
  const text = String(output || '').trim();
  if (!text) {
    return null;
  }
  if (ARTIFACT_TYPES[text]) {
    return text;
  }
  const entry = Object.entries(ARTIFACT_TYPES).find(([, def]) => def?.name === text);
  return entry ? entry[0] : null;
}

function collectProjectArtifacts(workflowStages) {
  const byStage = new Map();
  (workflowStages || []).forEach(stage => {
    if (!stage || !stage.id) {
      return;
    }
    const stageArtifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
    byStage.set(stage.id, stageArtifacts);
  });
  return byStage;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceTemplateVariables(content, context = {}) {
  let result = String(content || '');
  Object.entries(context || {}).forEach(([key, value]) => {
    const safeValue = value === null || value === undefined ? '' : String(value);
    result = result.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g'), safeValue);
  });
  return result;
}

async function loadPromptFromTemplates(artifactType, context = {}) {
  const def = ARTIFACT_TYPES[artifactType];
  const templates = Array.isArray(def?.promptTemplates) ? def.promptTemplates : [];
  if (templates.length === 0) {
    const err = new Error(`交付物 ${artifactType} 未配置 promptTemplates`);
    err.status = 400;
    throw err;
  }
  const projectRoot = process.cwd();
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

function trimLog(text, maxChars = 20000) {
  const value = String(text || '');
  if (value.length <= maxChars) {
    return value;
  }
  return value.slice(value.length - maxChars);
}

async function runCommand(command, options = {}) {
  const { cwd, env, timeoutMs = 20 * 60 * 1000, maxLogChars = 20000 } = options;
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...(env || {}) },
      shell: true
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      const durationMs = Date.now() - start;
      resolve({
        ok: false,
        code: null,
        signal: 'SIGKILL',
        stdout: trimLog(stdout, maxLogChars),
        stderr: trimLog(stderr, maxLogChars),
        durationMs
      });
    }, timeoutMs);

    child.stdout?.on('data', chunk => {
      stdout += chunk.toString();
      if (stdout.length > maxLogChars) {
        stdout = trimLog(stdout, maxLogChars);
      }
    });
    child.stderr?.on('data', chunk => {
      stderr += chunk.toString();
      if (stderr.length > maxLogChars) {
        stderr = trimLog(stderr, maxLogChars);
      }
    });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      resolve({
        ok: code === 0,
        code,
        signal: null,
        stdout: trimLog(stdout, maxLogChars),
        stderr: trimLog(stderr, maxLogChars),
        durationMs
      });
    });
  });
}

function buildExecutionArtifact({
  projectId,
  stageId,
  artifactType,
  content,
  agentType,
  meta = {}
}) {
  return {
    id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    stageId,
    type: artifactType,
    name: getArtifactName(artifactType),
    content,
    agentName: getAgentName(agentType),
    source: 'execution',
    createdAt: Date.now(),
    tokens: 0,
    meta
  };
}

function formatCommandSection(label, result) {
  const status = result.ok ? 'SUCCESS' : 'FAILED';
  const duration = `${Math.round(result.durationMs / 1000)}s`;
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  return [
    `## ${label}`,
    `- 状态: ${status}`,
    `- 耗时: ${duration}`,
    '',
    '```',
    trimLog(output, 20000),
    '```'
  ].join('\n');
}

function extractFailureLines(logText, maxLines = 200) {
  const lines = String(logText || '').split('\n');
  const hits = lines.filter(line =>
    /(^|\s)(FAIL|FAILURE|Error:|✕|●)\b/.test(line)
  );
  const unique = Array.from(new Set(hits));
  return unique.slice(0, maxLines);
}

function redactEnvContent(envText) {
  const lines = String(envText || '').split('\n');
  return lines
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        return line;
      }
      const [key] = trimmed.split('=');
      return `${key}=***`;
    })
    .join('\n');
}

function shouldSkipTreeEntry(name) {
  const skip = new Set(['node_modules', '.git', 'dist', 'build', '.DS_Store']);
  return skip.has(name);
}

async function buildFileTree(rootDir, currentDir, depth, maxDepth) {
  const entries = await fsPromises.readdir(currentDir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (shouldSkipTreeEntry(entry.name)) {
      continue;
    }
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);
    if (entry.isDirectory()) {
      const children =
        depth < maxDepth ? await buildFileTree(rootDir, fullPath, depth + 1, maxDepth) : [];
      result.push({
        name: entry.name,
        type: 'directory',
        path: relativePath,
        children
      });
    } else {
      let size = 0;
      try {
        const stat = await fsPromises.stat(fullPath);
        size = stat.size;
      } catch (error) {
        size = 0;
      }
      result.push({
        name: entry.name,
        type: 'file',
        path: relativePath,
        size
      });
    }
  }
  return result;
}

async function buildZipBundle(projectRoot, bundlePath) {
  const metaDir = path.join(projectRoot, 'meta');
  await fsPromises.mkdir(metaDir, { recursive: true });
  const scriptPath = path.join(metaDir, 'zip_bundle.py');
  const script = [
    'import os, zipfile',
    "root = os.path.abspath(os.path.dirname(__file__))",
    "project = os.path.abspath(os.path.join(root, '..'))",
    `bundle = os.path.abspath(r'''${bundlePath}''')`,
    "excludes = set(['node_modules', '.git', 'dist', 'build', '.DS_Store'])",
    'def should_skip(path_parts):',
    '    return any(part in excludes for part in path_parts)',
    "with zipfile.ZipFile(bundle, 'w', zipfile.ZIP_DEFLATED) as zf:",
    '    for current_root, dirs, files in os.walk(project):',
    '        rel_dir = os.path.relpath(current_root, project)',
    "        if rel_dir == '.':",
    '            rel_dir = ""',
    '        parts = [p for p in rel_dir.split(os.sep) if p]',
    '        if should_skip(parts):',
    '            continue',
    '        dirs[:] = [d for d in dirs if d not in excludes]',
    '        for fname in files:',
    '            if fname in excludes:',
    '                continue',
    '            rel_path = os.path.normpath(os.path.join(rel_dir, fname))',
    "            if rel_path.startswith('meta' + os.sep):",
    '                pass',
    '            full_path = os.path.join(current_root, fname)',
    '            if should_skip(full_path.split(os.sep)):',
    '                continue',
    '            zf.write(full_path, rel_path)',
    'print(bundle)'
  ].join('\\n');
  await fsPromises.writeFile(scriptPath, script, 'utf-8');
  const result = await runCommand(`python3 \"${scriptPath}\"`, {
    cwd: projectRoot,
    timeoutMs: 10 * 60 * 1000
  });
  if (!result.ok) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\\n');
    throw new Error(`zip 生成失败\\n${output}`);
  }
  return bundlePath;
}

async function executeTestingStage({
  projectId,
  stageId,
  effectiveArtifactTypes
}) {
  const repoRoot = resolveRepoRoot();
  const results = [];
  const rootTest = await runCommand('npm test', {
    cwd: repoRoot,
    timeoutMs: 30 * 60 * 1000
  });
  results.push({ label: 'Root npm test', result: rootTest });

  const backendPkg = path.join(repoRoot, 'backend', 'package.json');
  if (fs.existsSync(backendPkg)) {
    const backendTest = await runCommand('npm test', {
      cwd: path.join(repoRoot, 'backend'),
      timeoutMs: 30 * 60 * 1000
    });
    results.push({ label: 'Backend npm test', result: backendTest });
  }

  const failed = results.find(item => !item.result.ok);
  if (failed) {
    const output = [failed.result.stdout, failed.result.stderr].filter(Boolean).join('\n');
    const tail = trimLog(output, 4000);
    const err = new Error(`测试命令失败: ${failed.label}\n\n${tail}`);
    err.status = 500;
    throw err;
  }

  const sections = results.map(item => formatCommandSection(item.label, item.result));
  const totalDurationMs = results.reduce((sum, item) => sum + item.result.durationMs, 0);
  const nowIso = new Date().toISOString();
  const combinedLogs = results
    .map(item => [item.result.stdout, item.result.stderr].filter(Boolean).join('\n'))
    .join('\n');

  const artifacts = [];
  if (effectiveArtifactTypes.includes('test-report')) {
    const content = [
      '# 测试报告（真实执行）',
      '',
      `- 项目: ${projectId}`,
      `- 执行时间: ${nowIso}`,
      `- 总耗时: ${Math.round(totalDurationMs / 1000)}s`,
      '',
      ...sections
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'test-report',
        content,
        agentType: 'qa-engineer',
        meta: { durationMs: totalDurationMs }
      })
    );
  }

  if (effectiveArtifactTypes.includes('bug-list')) {
    const failures = extractFailureLines(combinedLogs);
    const content = [
      '# Bug 清单（基于真实测试日志）',
      '',
      failures.length === 0
        ? '未检测到失败用例或错误日志。'
        : failures.map((line, idx) => `${idx + 1}. ${line}`).join('\n')
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'bug-list',
        content,
        agentType: 'qa-engineer'
      })
    );
  }

  if (effectiveArtifactTypes.includes('performance-report')) {
    const perfScript = path.join(repoRoot, 'scripts', 'performance-test-simple.sh');
    let perfContent = '# 性能测试报告（真实执行）\n\n未执行性能测试。';
    if (fs.existsSync(perfScript)) {
      const perfResult = await runCommand('bash scripts/performance-test-simple.sh', {
        cwd: repoRoot,
        timeoutMs: 15 * 60 * 1000
      });
      perfContent = [
        '# 性能测试报告（真实执行）',
        '',
        formatCommandSection('Performance test (simple)', perfResult)
      ].join('\n');
    }
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'performance-report',
        content: perfContent,
        agentType: 'qa-engineer'
      })
    );
  }

  return artifacts;
}

async function executeDevelopmentStageActions({ projectId, projectRoot }) {
  const results = [];
  const frontendDir = path.join(projectRoot, 'frontend');
  const backendDir = path.join(projectRoot, 'backend');

  const frontendPkg = path.join(frontendDir, 'package.json');
  if (fs.existsSync(frontendPkg)) {
    const frontendNodeModules = path.join(frontendDir, 'node_modules');
    if (!fs.existsSync(frontendNodeModules)) {
      const installResult = await runCommand('npm install', {
        cwd: frontendDir,
        timeoutMs: 15 * 60 * 1000
      });
      results.push({ label: 'Frontend npm install', result: installResult });
    }

    try {
      const pkg = JSON.parse(await fsPromises.readFile(frontendPkg, 'utf-8'));
      if (pkg?.scripts?.build) {
        const buildResult = await runCommand('npm run build', {
          cwd: frontendDir,
          timeoutMs: 15 * 60 * 1000
        });
        results.push({ label: 'Frontend npm run build', result: buildResult });
      }
      if (pkg?.scripts?.dev) {
        const devResult = await runCommand('npm run dev', {
          cwd: frontendDir,
          timeoutMs: 30 * 1000
        });
        results.push({
          label: 'Frontend npm run dev (30s)',
          result: devResult
        });
      }
    } catch (error) {
      results.push({
        label: 'Frontend build skipped',
        result: { ok: false, stdout: '', stderr: 'package.json 解析失败', durationMs: 0 }
      });
    }
  }

  const backendPkg = path.join(backendDir, 'package.json');
  if (fs.existsSync(backendPkg)) {
    const backendNodeModules = path.join(backendDir, 'node_modules');
    if (!fs.existsSync(backendNodeModules)) {
      const installResult = await runCommand('npm install', {
        cwd: backendDir,
        timeoutMs: 15 * 60 * 1000
      });
      results.push({ label: 'Backend npm install', result: installResult });
    }
    try {
      const pkg = JSON.parse(await fsPromises.readFile(backendPkg, 'utf-8'));
      if (pkg?.scripts?.dev) {
        const devResult = await runCommand('npm run dev', {
          cwd: backendDir,
          timeoutMs: 30 * 1000
        });
        results.push({
          label: 'Backend npm run dev (30s)',
          result: devResult
        });
      }
    } catch (error) {
      results.push({
        label: 'Backend dev skipped',
        result: { ok: false, stdout: '', stderr: 'package.json 解析失败', durationMs: 0 }
      });
    }
  }

  if (results.length === 0) {
    return [];
  }

  const nowIso = new Date().toISOString();
  const content = [
    '# 开发阶段动作日志（真实执行）',
    '',
    `- 项目: ${projectId}`,
    `- 执行时间: ${nowIso}`,
    '',
    ...results.map(item => formatCommandSection(item.label, item.result))
  ].join('\n');

  const artifact = {
    id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    stageId: 'development',
    type: 'report',
    name: 'Development Actions Log',
    content,
    agentName: 'devops',
    source: 'execution',
    createdAt: Date.now(),
    tokens: 0
  };

  return [artifact];
}

async function executeDeploymentStage({
  projectId,
  stageId,
  effectiveArtifactTypes
}) {
  const repoRoot = resolveRepoRoot();
  const envFile =
    process.env.PROD_ENV_FILE || path.join(repoRoot, 'backend', '.env.production');
  if (!fs.existsSync(envFile)) {
    const err = new Error(`部署环境文件不存在: ${envFile}`);
    err.status = 400;
    throw err;
  }

  const deployResult = await runCommand(`bash scripts/start-prod.sh "${envFile}"`, {
    cwd: repoRoot,
    timeoutMs: 30 * 60 * 1000
  });
  if (!deployResult.ok) {
    const output = [deployResult.stdout, deployResult.stderr].filter(Boolean).join('\n');
    const tail = trimLog(output, 4000);
    const err = new Error(`部署命令失败\n\n${tail}`);
    err.status = 500;
    throw err;
  }

  const statusResult = await runCommand('docker compose ps', {
    cwd: repoRoot,
    timeoutMs: 60 * 1000
  });
  const nowIso = new Date().toISOString();
  const artifacts = [];

  if (effectiveArtifactTypes.includes('deploy-doc')) {
    const content = [
      '# 部署文档（真实执行）',
      '',
      `- 项目: ${projectId}`,
      `- 执行时间: ${nowIso}`,
      '',
      formatCommandSection('Deploy command', deployResult),
      '',
      formatCommandSection('Service status', statusResult)
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'deploy-doc',
        content,
        agentType: 'devops'
      })
    );
  }

  if (effectiveArtifactTypes.includes('env-config')) {
    const envText = await fsPromises.readFile(envFile, 'utf-8');
    const content = [
      '# 环境配置（脱敏）',
      '',
      `来源: ${envFile}`,
      '',
      '```',
      redactEnvContent(envText),
      '```'
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'env-config',
        content,
        agentType: 'devops'
      })
    );
  }

  if (effectiveArtifactTypes.includes('release-notes')) {
    const gitResult = await runCommand('git log -1 --pretty=format:%H', {
      cwd: repoRoot,
      timeoutMs: 30 * 1000
    });
    const commit = gitResult.ok ? gitResult.stdout.trim() : 'unknown';
    const content = [
      '# 发布说明（真实执行）',
      '',
      `- 提交: ${commit || 'unknown'}`,
      `- 时间: ${nowIso}`,
      '',
      '本次发布为自动化部署生成。'
    ].join('\n');
    artifacts.push(
      buildExecutionArtifact({
        projectId,
        stageId,
        artifactType: 'release-notes',
        content,
        agentType: 'devops'
      })
    );
  }

  return artifacts;
}

/**
 * 执行单个阶段任务
 * @param {String} projectId - 项目ID
 * @param {String} stageId - 阶段ID
 * @param {Object} context - 上下文数据
 * @returns {Promise<Array>} 生成的交付物数组
 */
function resolveStageDefinition(stageId) {
  return getStageById(stageId) || null;
}

function ensureStageDefinition(stageId) {
  const stage = resolveStageDefinition(stageId);
  if (!stage) {
    return null;
  }
  const recommendedAgents = Array.isArray(stage.recommendedAgents) ? stage.recommendedAgents : [];
  const artifactTypes = Array.isArray(stage.artifactTypes) ? stage.artifactTypes : [];
  return {
    ...stage,
    recommendedAgents,
    artifactTypes
  };
}

async function loadProject(projectId) {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('项目不存在');
    err.status = 404;
    throw err;
  }
  return project;
}

function getStageArtifactsFromProject(project, stageId) {
  const workflow = project.workflow;
  if (!workflow) {
    return [];
  }
  const stage = workflow.getStage(stageId);
  if (!stage) {
    return [];
  }
  return Array.isArray(stage.artifacts) ? stage.artifacts : [];
}

function normalizeArtifactsForResponse(projectId, stageId, artifactsList = []) {
  return (artifactsList || []).map(artifact => {
    const downloadUrl =
      artifact?.downloadUrl ||
      (artifact?.relativePath ? buildArtifactFileUrl(projectId, artifact.id) : undefined);
    const previewUrl =
      artifact?.previewUrl ||
      (shouldInlinePreview(artifact?.type) && artifact?.relativePath
        ? buildArtifactFileUrl(projectId, artifact.id, { inline: true })
        : undefined);
    return {
      ...artifact,
      stageId: artifact?.stageId || stageId,
      downloadUrl,
      previewUrl
    };
  });
}

function resolveProjectStageIds(project, stageId) {
  if (stageId !== 'strategy-requirement') {
    return [stageId];
  }
  const workflow = project.workflow;
  if (!workflow) {
    return [];
  }
  const candidates = ['strategy', 'requirement'];
  const matched = candidates.filter(id => workflow.getStage(id));
  if (matched.length > 0) {
    return matched;
  }
  const fallback = workflow.stages?.[0]?.id;
  return fallback ? [fallback] : [];
}

const STRATEGY_STAGE_ARTIFACTS = new Set(['strategy-doc']);

function resolveTargetStageIdForArtifact(project, normalizedStageId, artifactType) {
  if (!project?.workflow) {
    return normalizedStageId;
  }
  let targetStageId = normalizedStageId;
  if (normalizedStageId === 'strategy-requirement') {
    const hasStrategy = project.workflow.getStage('strategy');
    const hasRequirement = project.workflow.getStage('requirement');
    const fallbackStage = project.workflow.stages?.[0]?.id;
    if (STRATEGY_STAGE_ARTIFACTS.has(artifactType)) {
      targetStageId = hasStrategy
        ? 'strategy'
        : hasRequirement
          ? 'requirement'
          : fallbackStage || normalizedStageId;
    } else {
      targetStageId = hasRequirement
        ? 'requirement'
        : hasStrategy
          ? 'strategy'
          : fallbackStage || normalizedStageId;
    }
  }
  return targetStageId;
}

function removeExistingArtifactsByType(project, stageId, artifactType) {
  if (!project?.workflow || !artifactType) {
    return;
  }
  const stage = project.workflow.getStage(stageId);
  if (!stage) {
    return;
  }
  const existing = Array.isArray(stage.artifacts) ? stage.artifacts : [];
  existing
    .filter(artifact => artifact?.type === artifactType)
    .forEach(artifact => {
      if (artifact?.id) {
        project.workflow.removeArtifact(stageId, artifact.id);
      }
    });
}

function resolveStageOutputsForProject(project, normalizedStageId) {
  if (!project?.workflow) {
    const err = new Error('项目未初始化工作流');
    err.status = 400;
    throw err;
  }
  if (normalizedStageId === 'strategy-requirement') {
    const strategy = project.workflow.getStage('strategy');
    const requirement = project.workflow.getStage('requirement');
    let outputs = Array.from(
      new Set([
        ...(Array.isArray(strategy?.outputs) ? strategy.outputs : []),
        ...(Array.isArray(requirement?.outputs) ? requirement.outputs : [])
      ])
    ).filter(Boolean);
    if (outputs.length === 0) {
      const strategyFallback = getStageById('strategy')?.artifactTypes || [];
      const requirementFallback = getStageById('requirement')?.artifactTypes || [];
      outputs = Array.from(new Set([...strategyFallback, ...requirementFallback])).filter(Boolean);
    }
    if (outputs.length === 0) {
      const err = new Error('strategy/requirement 阶段未配置交付物');
      err.status = 400;
      throw err;
    }
    return outputs;
  }
  const stage = project.workflow.getStage(normalizedStageId);
  if (!stage) {
    const err = new Error(`项目工作流未包含阶段: ${normalizedStageId}`);
    err.status = 400;
    throw err;
  }
  let outputs = Array.isArray(stage.outputs) ? stage.outputs : [];
  if (outputs.length === 0) {
    outputs = getStageById(normalizedStageId)?.artifactTypes || [];
  }
  if (outputs.length === 0) {
    const err = new Error(`阶段 ${normalizedStageId} 未配置交付物`);
    err.status = 400;
    throw err;
  }
  return outputs;
}

async function persistGeneratedArtifact(project, normalizedStageId, artifact) {
  if (!project?.workflow || !artifact) {
    return;
  }
  const targetStageId = resolveTargetStageIdForArtifact(project, normalizedStageId, artifact.type);
  project.workflow.addArtifact(targetStageId, artifact);
  await projectRepository.save(project);
}

async function executeStage(projectId, stageId, context = {}) {
  const normalizedStageId = normalizeStageId(stageId);
  const project = await loadProject(projectId);
  const workspace = await ensureProjectWorkspace(project);
  if (!project.artifactRoot && workspace.artifactRoot) {
    project.update({ artifactRoot: workspace.artifactRoot });
    await projectRepository.save(project);
  }
  const preGeneratedArtifacts = [];
  let stage = ensureStageDefinition(normalizedStageId);
  if (!stage) {
    const projectStage =
      project.workflow?.getStage?.(normalizedStageId) ||
      (project.workflow?.stages || []).find(s => s.id === normalizedStageId);
    if (projectStage) {
      const agents = Array.isArray(projectStage.agents)
        ? projectStage.agents
        : (projectStage.agentRoles || []).map(role => role.id).filter(Boolean);
      stage = {
        id: normalizedStageId,
        name: projectStage.name || normalizedStageId,
        description: projectStage.description || '',
        recommendedAgents: agents,
        artifactTypes: Array.isArray(projectStage.outputs) ? projectStage.outputs : []
      };
    }
  }
  if (!stage) {
    const err = new Error(`无效的阶段ID: ${stageId}`);
    err.status = 400;
    throw err;
  }

  const selectedArtifactTypes = Array.isArray(context?.selectedArtifactTypes)
    ? context.selectedArtifactTypes
    : [];
  if (selectedArtifactTypes.length === 0) {
    const err = new Error('未指定交付物类型');
    err.status = 400;
    throw err;
  }

  const stageOutputs = resolveStageOutputsForProject(project, normalizedStageId);
  const effectiveArtifactTypes = stageOutputs.filter(type => selectedArtifactTypes.includes(type));
  if (effectiveArtifactTypes.length === 0) {
    const err = new Error('未选择有效的交付物类型');
    err.status = 400;
    throw err;
  }

  if (normalizedStageId === 'testing') {
    const generatedArtifacts = await executeTestingStage({
      projectId,
      stageId: normalizedStageId,
      effectiveArtifactTypes
    });
    const materialized = [];
    for (const artifact of generatedArtifacts) {
      const withFile = await materializeArtifactFile({
        project,
        stageId: normalizedStageId,
        artifact
      });
      const withUrls = {
        ...withFile,
        downloadUrl: buildArtifactFileUrl(projectId, withFile.id),
        previewUrl: shouldInlinePreview(withFile.type)
          ? buildArtifactFileUrl(projectId, withFile.id, { inline: true })
          : withFile.previewUrl
      };
      await updateArtifactsIndex(project, withUrls);
      const targetStageId = resolveTargetStageIdForArtifact(
        project,
        normalizedStageId,
        withUrls.type
      );
      removeExistingArtifactsByType(project, targetStageId, withUrls.type);
      await persistGeneratedArtifact(project, normalizedStageId, withUrls);
      materialized.push(withUrls);
    }
    return materialized;
  }

  if (normalizedStageId === 'deployment') {
    const generatedArtifacts = await executeDeploymentStage({
      projectId,
      stageId: normalizedStageId,
      effectiveArtifactTypes
    });
    const materialized = [];
    for (const artifact of generatedArtifacts) {
      const withFile = await materializeArtifactFile({
        project,
        stageId: normalizedStageId,
        artifact
      });
      const withUrls = {
        ...withFile,
        downloadUrl: buildArtifactFileUrl(projectId, withFile.id),
        previewUrl: shouldInlinePreview(withFile.type)
          ? buildArtifactFileUrl(projectId, withFile.id, { inline: true })
          : withFile.previewUrl
      };
      await updateArtifactsIndex(project, withUrls);
      const targetStageId = resolveTargetStageIdForArtifact(
        project,
        normalizedStageId,
        withUrls.type
      );
      removeExistingArtifactsByType(project, targetStageId, withUrls.type);
      await persistGeneratedArtifact(project, normalizedStageId, withUrls);
      materialized.push(withUrls);
    }
    return materialized;
  }

  if (normalizedStageId === 'development') {
    try {
      await ensureDevScaffold(workspace.projectRoot);
    } catch (error) {
      console.warn('[Workflow] 初始化开发脚手架失败:', error);
    }
    try {
      const actionArtifacts = await executeDevelopmentStageActions({
        projectId,
        projectRoot: workspace.projectRoot
      });
      for (const artifact of actionArtifacts) {
        const withFile = await materializeArtifactFile({
          project,
          stageId: normalizedStageId,
          artifact
        });
        const withUrls = {
          ...withFile,
          downloadUrl: buildArtifactFileUrl(projectId, withFile.id),
          previewUrl: buildArtifactFileUrl(projectId, withFile.id, { inline: true })
        };
        await updateArtifactsIndex(project, withUrls);
        await persistGeneratedArtifact(project, normalizedStageId, withUrls);
        preGeneratedArtifacts.push(withUrls);
      }
    } catch (error) {
      console.warn('[Workflow] 开发阶段动作执行失败:', error);
    }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    const err = new Error('DEEPSEEK_API_KEY 未配置或无效，请在后端 .env 中设置');
    err.status = 400;
    throw err;
  }

  // 创建交付物
  const generatedArtifacts = [...preGeneratedArtifacts];

  for (const artifactType of effectiveArtifactTypes) {
    const prompt = await loadPromptFromTemplates(artifactType, context);
    console.info('[Workflow] execute-stage call model', {
      projectId,
      stageId: normalizedStageId,
      artifactType,
      promptChars: prompt.length
    });
    const result = await callDeepSeekAPI([{ role: 'user', content: prompt }], null, {
      max_tokens: 4000,
      temperature: 0.7
    });

    const usage = result?.usage || { total_tokens: 0 };
    console.info('[Workflow] execute-stage model response', {
      projectId,
      stageId: normalizedStageId,
      artifactType,
      tokens: usage.total_tokens || 0
    });
    const artifact = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      stageId: normalizedStageId,
      type: artifactType,
      name: getArtifactName(artifactType),
      content: result.content,
      agentName: getAgentName(stage.recommendedAgents[0]),
      source: 'model',
      createdAt: Date.now(),
      tokens: usage.total_tokens || 0
    };
    const targetStageId = resolveTargetStageIdForArtifact(
      project,
      normalizedStageId,
      artifactType
    );
    removeExistingArtifactsByType(project, targetStageId, artifactType);
    const withFile = await materializeArtifactFile({
      project,
      stageId: normalizedStageId,
      artifact
    });
    const withUrls = {
      ...withFile,
      downloadUrl: buildArtifactFileUrl(projectId, withFile.id),
      previewUrl: shouldInlinePreview(withFile.type)
        ? buildArtifactFileUrl(projectId, withFile.id, { inline: true })
        : withFile.previewUrl
    };
    await updateArtifactsIndex(project, withUrls);
    generatedArtifacts.push(withUrls);
    await persistGeneratedArtifact(project, normalizedStageId, withUrls);

    if (effectiveArtifactTypes.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return generatedArtifacts;
}

/**
 * 获取交付物名称
 */
function getArtifactName(artifactType) {
  const typeMap = {
    prd: '产品需求文档',
    'user-story': '用户故事',
    'feature-list': '功能清单',
    'ui-design': 'UI设计方案',
    'design-spec': '设计规范',
    prototype: '交互原型',
    'architecture-doc': '系统架构设计',
    'frontend-code': '前端源代码',
    'backend-code': '后端源代码',
    'strategy-doc': '战略设计文档',
    'core-prompt-design': '核心引导逻辑Prompt设计',
    'test-report': '测试报告',
    'bug-list': 'Bug清单',
    'performance-report': '性能测试报告',
    'deploy-doc': '部署文档',
    'env-config': '环境配置',
    'release-notes': '发布说明',
    'marketing-plan': '运营推广方案'
  };
  return typeMap[artifactType] || artifactType;
}

/**
 * 获取Agent名称
 */
function getAgentName(agentType) {
  const nameMap = {
    'strategy-design': '战略设计师',
    'product-manager': '产品经理',
    'ui-ux-designer': 'UI/UX设计师',
    'tech-lead': '技术负责人',
    'backend-developer': '后端开发',
    'frontend-developer': '前端开发',
    'qa-engineer': '测试工程师',
    devops: '运维工程师',
    marketing: '营销专家',
    operations: '运营专家'
  };
  return nameMap[agentType] || agentType;
}

/**
 * POST /api/workflow/:projectId/execute-stage
 * 执行单个阶段
 */
router.post('/:projectId/execute-stage', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { stageId, context = {}, selectedArtifactTypes } = req.body;

    if (!stageId) {
      return res.status(400).json({
        code: -1,
        error: '缺少参数: stageId'
      });
    }

    if (Array.isArray(selectedArtifactTypes) && selectedArtifactTypes.length > 0) {
      context.selectedArtifactTypes = selectedArtifactTypes;
    }
    const generatedArtifacts = await executeStage(projectId, stageId, context);

    res.json({
      code: 0,
      data: {
        stageId: normalizeStageId(stageId),
        artifacts: generatedArtifacts,
        totalTokens: generatedArtifacts.reduce((sum, a) => sum + (a.tokens || 0), 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workflow/:projectId/execute-batch
 * 批量执行阶段任务
 */
router.post('/:projectId/execute-batch', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { stageIds, conversation } = req.body;

    if (!stageIds || !Array.isArray(stageIds) || stageIds.length === 0) {
      return res.status(400).json({
        code: -1,
        error: '缺少或无效的stageIds'
      });
    }

    const results = [];
    const project = await loadProject(projectId);
    const context = {
      CONVERSATION: conversation || ''
    };

    // 依次执行每个阶段，后续阶段可以访问前面阶段的产物
    for (const stageId of stageIds) {
      const normalizedStageId = normalizeStageId(stageId);
      const selectedArtifactTypes = resolveStageOutputsForProject(project, normalizedStageId);
      const generatedArtifacts = await executeStage(projectId, stageId, {
        ...context,
        selectedArtifactTypes
      });

      // 将当前阶段的产物添加到上下文中，供后续阶段使用
      if (generatedArtifacts.length > 0) {
        const mainArtifact = generatedArtifacts[0];
        context[stageId.toUpperCase()] = mainArtifact.content;

        // 特殊处理：PRD、DESIGN、ARCHITECTURE等作为常用上下文
        if (stageId === 'requirement') {
          context.PRD = mainArtifact.content;
        } else if (stageId === 'design') {
          context.DESIGN = mainArtifact.content;
        } else if (stageId === 'architecture') {
          context.ARCHITECTURE = mainArtifact.content;
        } else if (stageId === 'development') {
          context.DEVELOPMENT = mainArtifact.content;
        }
      }

      results.push({
        stageId,
        artifacts: generatedArtifacts
      });
    }

    const totalTokens = results.reduce(
      (sum, r) => sum + r.artifacts.reduce((s, a) => s + (a.tokens || 0), 0),
      0
    );

    res.json({
      code: 0,
      data: {
        results,
        totalTokens,
        completedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflow/:projectId/stages/:stageId/artifacts
 * 获取阶段交付物
 */
router.get('/:projectId/stages/:stageId/artifacts', async (req, res, next) => {
  try {
    const { projectId, stageId } = req.params;
    const normalizedStageId = normalizeStageId(stageId);
    const project = await loadProject(projectId);
    const stageIdsForProject = resolveProjectStageIds(project, normalizedStageId);
    const stageArtifacts = normalizeArtifactsForResponse(
      projectId,
      normalizedStageId,
      stageIdsForProject.flatMap(id => getStageArtifactsFromProject(project, id))
    );

    res.json({
      code: 0,
      data: {
        stageId: normalizedStageId,
        artifacts: stageArtifacts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflow/:projectId/artifacts
 * 获取项目所有交付物
 */
router.get('/:projectId/artifacts', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await loadProject(projectId);
    const workflow = project.workflow?.toJSON ? project.workflow.toJSON() : project.workflow;
    const workflowStages = Array.isArray(workflow?.stages) ? workflow.stages : [];
    const stageArtifacts = collectProjectArtifacts(workflowStages);

    const allArtifacts = [];
    for (const [stageId, artifactsList] of stageArtifacts.entries()) {
      allArtifacts.push(...normalizeArtifactsForResponse(projectId, stageId, artifactsList));
    }

    res.json({
      code: 0,
      data: {
        total: allArtifacts.length,
        artifacts: allArtifacts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflow/:projectId/artifacts/tree
 * 获取项目产物文件树
 */
router.get('/:projectId/artifacts/tree', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const maxDepth = Number(req.query.depth || 4);
    const project = await loadProject(projectId);
    const workspace = await ensureProjectWorkspace(project);
    const tree = await buildFileTree(
      workspace.projectRoot,
      workspace.projectRoot,
      0,
      Number.isFinite(maxDepth) ? Math.max(1, maxDepth) : 4
    );

    res.json({
      code: 0,
      data: {
        root: path.relative(resolveRepoRoot(), workspace.projectRoot),
        tree
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflow/:projectId/artifacts/bundle
 * 下载产物打包文件
 */
router.get('/:projectId/artifacts/bundle', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const fresh = req.query.fresh === '1';
    const format = String(req.query.format || 'zip').toLowerCase();
    const project = await loadProject(projectId);
    const workspace = await ensureProjectWorkspace(project);
    const bundleExt = format === 'zip' ? 'zip' : 'tar.gz';
    const bundlePath = path.join(workspace.projectRoot, 'meta', `artifacts.${bundleExt}`);
    const bundleExists = fs.existsSync(bundlePath);

    if (!bundleExists || fresh) {
      if (format === 'zip') {
        try {
          await buildZipBundle(workspace.projectRoot, bundlePath);
        } catch (error) {
          console.warn('[Workflow] zip 打包失败，尝试 tar 兜底:', error);
          const fallbackPath = path.join(workspace.projectRoot, 'meta', 'artifacts.tar.gz');
          const result = await runCommand(
            'tar --exclude=node_modules --exclude=.git --exclude=dist --exclude=build -czf meta/artifacts.tar.gz .',
            {
              cwd: workspace.projectRoot,
              timeoutMs: 10 * 60 * 1000
            }
          );
          if (!result.ok) {
            const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
            return res.status(500).json({
              code: -1,
              error: `产物打包失败\\n${error.message}\\n${output}`
            });
          }
          res.setHeader(
            'Content-Disposition',
            `attachment; filename=\"${projectId}-artifacts.tar.gz\"`
          );
          return res.sendFile(fallbackPath);
        }
      } else {
        const cmd =
          'tar --exclude=node_modules --exclude=.git --exclude=dist --exclude=build -czf meta/artifacts.tar.gz .';
        const result = await runCommand(cmd, {
          cwd: workspace.projectRoot,
          timeoutMs: 10 * 60 * 1000
        });
        if (!result.ok) {
          const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
          return res.status(500).json({
            code: -1,
            error: `产物打包失败\\n${output}`
          });
        }
      }
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=\"${projectId}-artifacts.${bundleExt}\"`
    );
    res.sendFile(bundlePath);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflow/:projectId/artifacts/:artifactId/file
 * 下载/预览交付物文件
 */
router.get('/:projectId/artifacts/:artifactId/file', async (req, res, next) => {
  try {
    const { projectId, artifactId } = req.params;
    const inline = req.query.inline === '1';
    const project = await loadProject(projectId);
    const workflow = project.workflow;
    if (!workflow) {
      return res.status(404).json({
        code: -1,
        error: '项目不存在'
      });
    }

    let target = null;
    for (const stage of workflow.stages || []) {
      const artifact = stage?.artifacts?.find(a => a.id === artifactId);
      if (artifact) {
        target = artifact;
        break;
      }
    }

    if (!target || !target.relativePath) {
      return res.status(404).json({
        code: -1,
        error: '交付物文件不存在'
      });
    }

    const repoRoot = resolveRepoRoot();
    const filePath = path.resolve(repoRoot, target.relativePath);
    const safeRoot = path.resolve(repoRoot) + path.sep;
    if (!filePath.startsWith(safeRoot)) {
      return res.status(400).json({
        code: -1,
        error: '非法文件路径'
      });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        code: -1,
        error: '文件不存在'
      });
    }

    const fileName = target.fileName || path.basename(filePath);
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename=\"${fileName}\"`
    );
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflow/:projectId/files/download
 * 下载项目内文件
 */
router.get('/:projectId/files/download', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const relativePath = String(req.query.path || '');
    if (!relativePath) {
      return res.status(400).json({
        code: -1,
        error: '缺少文件路径'
      });
    }
    const project = await loadProject(projectId);
    const workspace = await ensureProjectWorkspace(project);
    const filePath = path.resolve(workspace.projectRoot, relativePath);
    const safeRoot = path.resolve(workspace.projectRoot) + path.sep;
    if (!filePath.startsWith(safeRoot)) {
      return res.status(400).json({
        code: -1,
        error: '非法文件路径'
      });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        code: -1,
        error: '文件不存在'
      });
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=\"${path.basename(filePath)}\"`
    );
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workflow/:projectId/artifacts/:artifactId
 * 删除交付物
 */
router.delete('/:projectId/artifacts/:artifactId', async (req, res, next) => {
  try {
    const { projectId, artifactId } = req.params;
    const project = await loadProject(projectId);
    const workflow = project.workflow;
    if (!workflow) {
      return res.status(404).json({
        code: -1,
        error: '项目不存在'
      });
    }

    let deleted = false;
    let removedArtifact = null;
    const stages = workflow.stages || [];
    for (const stage of stages) {
      const found = stage?.artifacts?.find(a => a.id === artifactId);
      if (found) {
        removedArtifact = found;
        deleted = workflow.removeArtifact(stage.id, artifactId);
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({
        code: -1,
        error: '交付物不存在'
      });
    }

    await projectRepository.save(project);

    if (removedArtifact?.relativePath) {
      try {
        const repoRoot = resolveRepoRoot();
        const filePath = path.resolve(repoRoot, removedArtifact.relativePath);
        if (fs.existsSync(filePath)) {
          await fsPromises.unlink(filePath);
        }
      } catch (error) {
        console.warn('[Workflow] 删除交付物文件失败:', error);
      }
    }

    res.json({
      code: 0,
      message: '交付物已删除'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workflow/:projectId/deploy-readiness
 * 基于ReAct Loop评估项目是否满足“可部署交付”的目标
 * body: { goal?: string, idea?: string, conversation?: string }
 */
router.post('/:projectId/deploy-readiness', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { goal, idea, conversation } = req.body || {};

    const project = await projectRepository.findById(projectId);
    if (!project) {
      return res.status(404).json({ code: -1, error: '项目不存在' });
    }

    const workflow = project.workflow?.toJSON ? project.workflow.toJSON() : project.workflow;
    const workflowStages = Array.isArray(workflow?.stages) ? workflow.stages : [];
    const stageArtifacts = collectProjectArtifacts(workflowStages);

    const stageBrief = workflowStages.map(stage => ({
      id: stage.id,
      name: stage.name,
      description: stage.description || '',
      agents: Array.isArray(stage.agents) ? stage.agents : [],
      outputs: Array.isArray(stage.outputs) ? stage.outputs : [],
      outputsDetailed: Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : []
    }));

    const deliverablesCatalog = Object.entries(ARTIFACT_TYPES).map(([id, def]) => ({
      id,
      name: def?.name || id,
      description: def?.description || '',
      templates: Array.isArray(def?.promptTemplates) ? def.promptTemplates : []
    }));

    const roleTemplateMapping = buildRoleTemplateMapping();
    const targetGoal = goal || '输出一个可实际交付部署的完整产品';

    // ReAct Loop Step 1: 规划阶段所需的关键交付物
    const step1Prompt = `你是项目交付物规划专家。目标是：${targetGoal}

【创意】
${idea || '未提供'}

【对话摘要】
${conversation || '未提供'}

【角色与交付物模板映射（仅能从映射中选择）】
${JSON.stringify(roleTemplateMapping, null, 2)}

【阶段列表】
${JSON.stringify(stageBrief, null, 2)}

【交付物类型库（仅能从以下id中选择，必须基于现有模板）】
${JSON.stringify(deliverablesCatalog, null, 2)}

请输出JSON：
{
  "requiredByStage": { "stageId": ["deliverableTypeId", "..."] },
  "criticalDeliverables": ["deliverableTypeId", "..."],
  "notes": "简短说明"
}

要求：
1. 每个阶段至少选择1个交付物类型
2. 必须来自交付物类型库
3. requiredByStage 内的类型必须与阶段输出和角色职责匹配`;

    const step1Result = await callDeepSeekAPI([{ role: 'user', content: step1Prompt }], null, {
      max_tokens: 1200,
      temperature: 0.2,
      timeout: 90000
    });

    const step1Parsed = parseJsonPayload(step1Result?.content) || {};
    const requiredByStage = step1Parsed.requiredByStage || {};
    const criticalDeliverables = Array.isArray(step1Parsed.criticalDeliverables)
      ? step1Parsed.criticalDeliverables
      : [];

    // 计算缺失交付物
    const missingByStage = {};
    const availableByStage = {};
    workflowStages.forEach(stage => {
      const stageId = stage.id;
      const required = Array.isArray(requiredByStage?.[stageId]) ? requiredByStage[stageId] : [];
      const artifactsForStage = Array.isArray(stageArtifacts.get(stageId))
        ? stageArtifacts.get(stageId)
        : [];
      const actualTypes = artifactsForStage
        .map(a => normalizeOutputToTypeId(a?.type || a?.name))
        .filter(Boolean);

      const actualSet = new Set(actualTypes);
      const missing = required.filter(type => !actualSet.has(type));
      if (missing.length > 0) {
        missingByStage[stageId] = missing;
      }
      availableByStage[stageId] = Array.from(new Set(actualTypes));
    });

    const overallMissingCritical = criticalDeliverables.filter(type => {
      return !Object.values(availableByStage).some(list => list.includes(type));
    });

    // ReAct Loop Step 2: 基于缺失情况给出部署可交付性判断
    const step2Prompt = `你是项目交付评估专家。目标是：${targetGoal}

【阶段要求】
${JSON.stringify(requiredByStage, null, 2)}

【阶段已产出交付物】
${JSON.stringify(availableByStage, null, 2)}

【缺失交付物】
${JSON.stringify(missingByStage, null, 2)}

【关键交付物缺失】
${JSON.stringify(overallMissingCritical, null, 2)}

请输出JSON：
{
  "isDeployable": true/false,
  "riskLevel": "low|medium|high",
  "summary": "简短结论",
  "nextActions": ["动作1", "动作2", "..."],
  "stageGaps": [{ "stageId": "阶段", "missing": ["类型"], "impact": "影响说明" }]
}

要求：仅输出JSON，避免额外解释。`;

    const step2Result = await callDeepSeekAPI([{ role: 'user', content: step2Prompt }], null, {
      max_tokens: 1000,
      temperature: 0.2,
      timeout: 90000
    });

    const step2Parsed = parseJsonPayload(step2Result?.content) || {};

    res.json({
      code: 0,
      data: {
        goal: targetGoal,
        requiredByStage,
        criticalDeliverables,
        availableByStage,
        missingByStage,
        missingCritical: overallMissingCritical,
        assessment: step2Parsed,
        method: 'react-loop'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
