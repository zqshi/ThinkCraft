import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import { WORKFLOW_GENERATION_CONFIG } from '../../../../config/workflow-generation.js';
import {
  ARTIFACT_DEPENDENCIES,
  ARTIFACT_TYPES,
  normalizeStageId
} from '../../../../config/workflow-stages.js';
import {
  buildArtifactFileUrl,
  deleteArtifactPhysicalFile,
  ensureDevScaffold,
  ensureProjectWorkspace,
  materializeArtifactFile,
  removeArtifactsIndex,
  resolveRepoRoot,
  updateArtifactsIndex
} from '../../projects/infrastructure/project-files.js';
import {
  ensureStageDefinition,
  getArtifactName,
  getAgentName,
  resolveStageOutputsForProject,
  resolveTargetStageIdForArtifact,
  shouldInlinePreview
} from '../interfaces/helpers/workflow-helpers.js';
import { loadPromptFromTemplates } from './workflow-template-loader.js';
import { executeDeploymentStage } from './workflow-stage-actions-deployment.js';
import { executeDevelopmentStageActions } from './workflow-stage-actions-development.js';
import { executeTestingStage } from './workflow-stage-actions-testing.js';
import { loadProject, persistGeneratedArtifact } from './workflow-project-service.js';
import { projectRepository } from '../../projects/infrastructure/index.js';
import { logger } from '../../../../middleware/logger.js';
import {
  createRunRecord,
  recoverStaleRunningRuns,
  updateRunRecord
} from '../infrastructure/workflow-artifact-run.repository.js';
import {
  appendChunkRecord,
  assembleContentFromSession,
  ensureChunkSession,
  getChunkSession,
  listChunkSessions,
  markChunkSessionAssembled,
  markChunkSessionStatus
} from '../infrastructure/workflow-artifact-chunk.repository.js';

const CONTEXT_VALUE_MAX_CHARS = 8000;
const CONTEXT_TOTAL_CHARS_BUDGET = 36000;
const DEPENDENCY_CONTEXT_MAX_CHARS = 4200;
const SUMMARY_MAX_CHARS = 1600;
const KEY_POINTS_MAX = 8;
const REACT_ENABLED = Boolean(WORKFLOW_GENERATION_CONFIG.reactEnabled);
const PROTOTYPE_MAX_TOKENS = Number(WORKFLOW_GENERATION_CONFIG.prototype.maxTokens);
const PROTOTYPE_LOOP_MAX_ROUNDS = Number(WORKFLOW_GENERATION_CONFIG.prototype.loopMaxRounds);
const PROTOTYPE_LOOP_CHUNK_MAX_TOKENS = Number(
  WORKFLOW_GENERATION_CONFIG.prototype.loopChunkMaxTokens
);
const PROTOTYPE_SKIP_REACT = Boolean(WORKFLOW_GENERATION_CONFIG.prototype.skipReact);
const ARTIFACT_LOOP_MAX_ROUNDS = Number(WORKFLOW_GENERATION_CONFIG.artifact.loopMaxRounds);
const ARTIFACT_LOOP_CHUNK_MAX_TOKENS = Number(
  WORKFLOW_GENERATION_CONFIG.artifact.loopChunkMaxTokens
);
const NON_CONTEXT_PLACEHOLDERS = new Set([
  'YYYYMMDDHHMMSS',
  'YYYY_MM_DD_HH_MM_SS',
  'YYYY-MM-DD HH:MM:SS',
  'YYYY-MM-DD',
  'URL',
  '时间',
  '变更说明',
  '用户角色',
  '功能',
  '目标'
]);

function projectHasPrdArtifact(project) {
  const stages = project?.workflow?.stages || [];
  for (const stage of stages) {
    const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
    for (const artifact of artifacts) {
      if (String(artifact?.type || '').trim() === 'prd') {
        return true;
      }
      const name = String(artifact?.name || '').trim();
      if (name === 'PRD' || name === '产品需求文档') {
        return true;
      }
    }
  }
  return false;
}

function getLatestPrdContent(project) {
  const stages = project?.workflow?.stages || [];
  for (const stage of stages) {
    const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
    for (const artifact of artifacts) {
      const type = String(artifact?.type || '').trim();
      const name = String(artifact?.name || '').trim();
      const isPrd = type === 'prd' || name === 'PRD' || name === '产品需求文档';
      if (!isPrd) {
        continue;
      }
      const content = String(artifact?.content || '').trim();
      if (content) {
        return content;
      }
    }
  }
  return '';
}

function getLatestArtifactContentByType(project, artifactType) {
  const targetType = String(artifactType || '').trim();
  if (!targetType) {
    return '';
  }
  const stages = project?.workflow?.stages || [];
  for (let stageIndex = stages.length - 1; stageIndex >= 0; stageIndex -= 1) {
    const stage = stages[stageIndex];
    const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
    for (let idx = artifacts.length - 1; idx >= 0; idx -= 1) {
      const artifact = artifacts[idx];
      if (String(artifact?.type || '').trim() !== targetType) {
        continue;
      }
      const content = String(artifact?.content || '').trim();
      if (content) {
        return content;
      }
    }
  }
  return '';
}

function getLatestArtifactByType(project, artifactType) {
  const targetType = String(artifactType || '').trim();
  if (!targetType) {
    return null;
  }
  const stages = project?.workflow?.stages || [];
  for (let stageIndex = stages.length - 1; stageIndex >= 0; stageIndex -= 1) {
    const stage = stages[stageIndex];
    const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
    for (let idx = artifacts.length - 1; idx >= 0; idx -= 1) {
      const artifact = artifacts[idx];
      if (String(artifact?.type || '').trim() !== targetType) {
        continue;
      }
      const content = String(artifact?.content || '').trim();
      if (content) {
        return artifact;
      }
    }
  }
  return null;
}

function getLatestGeneratedArtifactContent(generatedArtifacts = [], artifactType) {
  const targetType = String(artifactType || '').trim();
  if (!targetType) {
    return '';
  }
  for (let idx = generatedArtifacts.length - 1; idx >= 0; idx -= 1) {
    const artifact = generatedArtifacts[idx];
    if (String(artifact?.type || '').trim() !== targetType) {
      continue;
    }
    const content = String(artifact?.content || '').trim();
    if (content) {
      return content;
    }
  }
  return '';
}

function getLatestGeneratedArtifact(generatedArtifacts = [], artifactType) {
  const targetType = String(artifactType || '').trim();
  if (!targetType) {
    return null;
  }
  for (let idx = generatedArtifacts.length - 1; idx >= 0; idx -= 1) {
    const artifact = generatedArtifacts[idx];
    if (String(artifact?.type || '').trim() !== targetType) {
      continue;
    }
    const content = String(artifact?.content || '').trim();
    if (content) {
      return artifact;
    }
  }
  return null;
}

function getDependenciesForArtifactType(artifactType) {
  return Array.isArray(ARTIFACT_DEPENDENCIES?.[artifactType])
    ? ARTIFACT_DEPENDENCIES[artifactType]
    : [];
}

function truncateText(text, maxChars = 12000) {
  const value = String(text || '');
  if (value.length <= maxChars) {
    return value;
  }
  return value.slice(0, maxChars);
}

function buildRunId(projectId, stageId, artifactType) {
  const random = Math.random().toString(36).slice(2, 8);
  return `wfr-${projectId}-${stageId}-${artifactType}-${Date.now()}-${random}`;
}

function hashValue(value) {
  return crypto
    .createHash('sha256')
    .update(String(value || ''))
    .digest('hex')
    .slice(0, 24);
}

async function persistCompletedArtifactAsChunkSession({ project, projectId, stageId, artifact }) {
  const artifactType = String(artifact?.type || '').trim();
  if (!artifactType) {
    return;
  }
  const runId = buildRunId(projectId, stageId, artifactType);
  await ensureChunkSession({
    project,
    projectId,
    runId,
    stageId,
    artifactType,
    totalRounds: 1,
    status: 'running'
  }).catch(() => {});
  await appendChunkRecord({
    project,
    projectId,
    runId,
    stageId,
    artifactType,
    round: 1,
    content: artifact?.content || '',
    finishReason: 'single_artifact',
    totalRounds: 1
  }).catch(() => {});
  await markChunkSessionAssembled({
    project,
    projectId,
    runId,
    content: artifact?.content || '',
    artifact,
    isComplete: true
  }).catch(() => {});
  await markChunkSessionStatus({
    project,
    projectId,
    runId,
    status: 'succeeded'
  }).catch(() => {});
}

function parseJsonPayload(text) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (_error) {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch (__error) {
      return null;
    }
  }
}

function stripCodeFence(text = '') {
  const raw = String(text || '').trim();
  if (!raw) {
    return '';
  }
  if (/^```/i.test(raw)) {
    return raw
      .replace(/^```[a-zA-Z0-9_-]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
  return raw;
}

function mergeWithOverlap(existing = '', incoming = '') {
  const base = String(existing || '');
  const next = String(incoming || '');
  if (!base) {
    return next;
  }
  if (!next) {
    return base;
  }
  const maxOverlap = Math.min(1200, base.length, next.length);
  for (let size = maxOverlap; size >= 80; size -= 1) {
    if (base.slice(-size) === next.slice(0, size)) {
      return base + next.slice(size);
    }
  }
  return base + next;
}

function isLikelyCompleteHtml(content) {
  const text = String(content || '').trim();
  if (!text) {
    return false;
  }
  return /<html[\s>]/i.test(text) && /<body[\s>]/i.test(text) && /<\/html>/i.test(text);
}

async function repairTruncatedPrototypeHtml(content, projectId, stageId) {
  const source = String(content || '').trim();
  if (!source) {
    return source;
  }
  const repairPrompt = `你是前端修复助手。下面是一段疑似被截断的 HTML 原型代码。
请你输出“完整、可运行”的单文件 HTML（从 <!doctype html> 开始，到 </html> 结束）。

要求：
1) 保持原有设计风格和结构意图，不要删减主要模块；
2) 若末尾被截断，请补全缺失的标签、样式和必要脚本；
3) 仅输出 HTML，不要解释。

待修复内容：
${truncateText(source, 20000)}`;

  const repaired = await callDeepSeekAPI([{ role: 'user', content: repairPrompt }], null, {
    max_tokens: PROTOTYPE_MAX_TOKENS,
    temperature: 0.3
  });
  const repairedContent = String(repaired?.content || '').trim();
  logger.warn('[Workflow] prototype html repaired', {
    projectId,
    stageId,
    sourceChars: source.length,
    repairedChars: repairedContent.length,
    finishReason: repaired?.finish_reason || null
  });
  return repairedContent || source;
}

function buildArtifactLoopInstruction(artifactType, endMarker) {
  if (artifactType === 'prototype' || artifactType === 'preview' || artifactType === 'ui-preview') {
    return `请输出“完整可运行”的单文件 HTML 原型代码。
要求：
1) 只输出 HTML 代码，不要解释；
2) 若本轮未输出完，请在下一轮继续，不要重复已输出内容；
3) 全部输出完成时，在最后追加一行 ${endMarker}
4) 最终内容必须包含 <!doctype html>、<html>、<body>、</html>。`;
  }
  return `请输出该交付物的完整最终内容。
要求：
1) 仅输出交付物正文，不要解释；
2) 若本轮未输出完，请下一轮继续，不要重复；
3) 全部输出完成时，在最后追加一行 ${endMarker}。`;
}

async function generateArtifactWithLoop({
  prompt,
  artifactType,
  projectId: _projectId,
  stageId: _stageId,
  onChunk = null,
  resumeContent = '',
  resumedRounds = 0
}) {
  let assembled = String(resumeContent || '');
  let tokens = 0;
  const finishReasons = [];
  const markerToken = toContextToken(artifactType) || 'ARTIFACT';
  const isHtmlArtifact = ['prototype', 'preview', 'ui-preview'].includes(
    String(artifactType || '')
  );
  const endMarker = isHtmlArtifact
    ? WORKFLOW_GENERATION_CONFIG.prototype.endMarker
    : `<<END_OF_${markerToken}>>`;
  const roundPrompt = buildArtifactLoopInstruction(artifactType, endMarker);
  const maxRounds =
    artifactType === 'prototype' ? PROTOTYPE_LOOP_MAX_ROUNDS : ARTIFACT_LOOP_MAX_ROUNDS;
  const chunkMaxTokens =
    artifactType === 'prototype' ? PROTOTYPE_LOOP_CHUNK_MAX_TOKENS : ARTIFACT_LOOP_CHUNK_MAX_TOKENS;

  let nextPrompt = assembled
    ? `继续输出同一个交付物的后续内容，不要重复已经输出过的片段。
已输出末尾片段如下：
${assembled.slice(-5000)}

请仅输出后续新增内容；完成时追加 ${endMarker}`
    : `${prompt}\n\n${roundPrompt}`;
  const startRound = Math.max(1, Number(resumedRounds || 0) + 1);
  for (let round = startRound; round <= maxRounds; round += 1) {
    const result = await callDeepSeekAPI([{ role: 'user', content: nextPrompt }], null, {
      max_tokens: chunkMaxTokens,
      temperature: round === 1 ? 0.6 : 0.4
    });
    const piece = stripCodeFence(result?.content || '');
    assembled = mergeWithOverlap(assembled, piece);
    tokens += Number(result?.usage?.total_tokens || 0);
    finishReasons.push(result?.finish_reason || null);
    if (typeof onChunk === 'function' && piece) {
      await onChunk({
        round,
        piece,
        finishReason: result?.finish_reason || null,
        totalRounds: maxRounds
      });
    }

    const normalized = assembled.replaceAll(endMarker, '').trim();
    if (assembled.includes(endMarker) || isLikelyCompleteHtml(normalized)) {
      assembled = normalized;
      return {
        content: assembled,
        tokens,
        rounds: round,
        finishReasons,
        isComplete: true
      };
    }

    const tail = assembled.slice(-5000);
    nextPrompt = `继续输出同一个交付物的后续内容，不要重复已经输出过的片段。
已输出末尾片段如下：
${tail}

请仅输出后续新增内容；完成时追加 ${endMarker}`;
  }

  const noMarker = assembled.replaceAll(endMarker, '').trim();
  return {
    content: noMarker,
    tokens,
    rounds: maxRounds,
    finishReasons,
    isComplete: false
  };
}

function splitContentToUnits(content = '') {
  return String(content || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
}

function buildCompressedContext(content = '', options = {}) {
  const maxChars = Number(options.maxChars || DEPENDENCY_CONTEXT_MAX_CHARS);
  const maxKeyPoints = Number(options.maxKeyPoints || KEY_POINTS_MAX);
  const units = splitContentToUnits(content);
  if (units.length === 0) {
    return {
      summary: '',
      keyPoints: [],
      compressed: '',
      sourceChars: 0,
      compressedChars: 0
    };
  }

  const headingLines = [];
  const bulletLines = [];
  const constraintLines = [];
  const otherLines = [];

  units.forEach(unit => {
    if (/^#{1,6}\s+/.test(unit)) {
      headingLines.push(unit);
      return;
    }
    if (/^[-*•]\s+/.test(unit) || /^\d+\.\s+/.test(unit)) {
      bulletLines.push(unit);
      return;
    }
    if (/必须|不得|约束|依赖|验收|风险|边界|输入|输出|要求/i.test(unit)) {
      constraintLines.push(unit);
      return;
    }
    otherLines.push(unit);
  });

  const ranked = [...headingLines, ...constraintLines, ...bulletLines, ...otherLines];
  const keyPoints = [];
  const seen = new Set();
  for (const line of ranked) {
    if (!line || seen.has(line)) {
      continue;
    }
    keyPoints.push(truncateText(line, 220));
    seen.add(line);
    if (keyPoints.length >= maxKeyPoints) {
      break;
    }
  }

  const summary = truncateText(keyPoints.join('\n'), Math.min(maxChars, SUMMARY_MAX_CHARS));
  const compressed = truncateText(
    [
      summary ? '【摘要】\n' + summary : '',
      keyPoints.length > 0 ? '【关键要点】\n' + keyPoints.map(item => `- ${item}`).join('\n') : ''
    ]
      .filter(Boolean)
      .join('\n\n'),
    maxChars
  );

  return {
    summary,
    keyPoints,
    compressed,
    sourceChars: String(content || '').length,
    compressedChars: compressed.length
  };
}

function buildArtifactDigest(artifactType, content = '') {
  const compressed = buildCompressedContext(content, {
    maxChars: DEPENDENCY_CONTEXT_MAX_CHARS,
    maxKeyPoints: KEY_POINTS_MAX
  });
  return {
    contextSummary: compressed.summary,
    keyPoints: compressed.keyPoints,
    contextDigest: {
      type: artifactType,
      sourceChars: compressed.sourceChars,
      compressedChars: compressed.compressedChars,
      algorithm: 'extractive-v1',
      generatedAt: new Date().toISOString()
    },
    compressedContext: compressed.compressed
  };
}

async function callModelWithReAct({
  prompt,
  artifactType,
  projectId,
  stageId,
  onChunk = null,
  resumeContent = '',
  resumedRounds = 0
}) {
  const loopResult = await generateArtifactWithLoop({
    prompt,
    artifactType,
    projectId,
    stageId,
    onChunk,
    resumeContent,
    resumedRounds
  });
  let initialContent = String(loopResult?.content || '').trim();
  if (
    ['prototype', 'preview', 'ui-preview'].includes(String(artifactType || '')) &&
    !isLikelyCompleteHtml(initialContent)
  ) {
    initialContent = await repairTruncatedPrototypeHtml(initialContent, projectId, stageId);
  }
  const totalTokens = Number(loopResult?.tokens || 0);
  const loopFinishReason = Array.isArray(loopResult?.finishReasons)
    ? loopResult.finishReasons.filter(Boolean).join(',')
    : null;

  if ((artifactType === 'prototype' && PROTOTYPE_SKIP_REACT) || !REACT_ENABLED) {
    return {
      content: initialContent,
      tokens: totalTokens,
      finishReason: loopFinishReason || null,
      generationMeta: {
        mode: 'loop',
        rounds: Number(loopResult?.rounds || 1),
        finishReasons: loopResult?.finishReasons || [],
        isComplete: Boolean(loopResult?.isComplete)
      },
      reactTrace: {
        enabled: Boolean(REACT_ENABLED),
        skippedForPrototype: Boolean(artifactType === 'prototype' && PROTOTYPE_SKIP_REACT)
      }
    };
  }

  const critiquePrompt = `你是文档质量审查器。请审查下述${artifactType}草稿是否满足“结构完整、依赖输入一致、无明显自相矛盾”。

请严格输出 JSON:
{"pass": true/false, "issues": ["问题1", "问题2"], "advice": "一句话修复建议"}

草稿如下：
${truncateText(initialContent || '', 12000)}`;

  const critique = await callDeepSeekAPI([{ role: 'user', content: critiquePrompt }], null, {
    max_tokens: 600,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });
  const critiqueTokens = Number(critique?.usage?.total_tokens || 0);
  const critiqueJson = parseJsonPayload(critique?.content || '');
  const pass = Boolean(critiqueJson?.pass);
  const issues = Array.isArray(critiqueJson?.issues)
    ? critiqueJson.issues.map(item => String(item || '').trim()).filter(Boolean)
    : [];

  if (pass || issues.length === 0) {
    return {
      content: initialContent || '',
      tokens: totalTokens + critiqueTokens,
      finishReason: loopFinishReason || null,
      generationMeta: {
        mode: 'loop',
        rounds: Number(loopResult?.rounds || 1),
        finishReasons: loopResult?.finishReasons || [],
        isComplete: Boolean(loopResult?.isComplete)
      },
      reactTrace: {
        enabled: true,
        revised: false,
        issues
      }
    };
  }

  const revisePrompt = `请基于以下审查问题修订文档，仅输出修订后的最终内容，不要解释。

审查问题：
${issues.map((item, index) => `${index + 1}. ${item}`).join('\n')}

原文：
${truncateText(initialContent || '', 14000)}`;

  const generationMaxTokens = artifactType === 'prototype' ? PROTOTYPE_MAX_TOKENS : 4000;
  const revised = await callDeepSeekAPI([{ role: 'user', content: revisePrompt }], null, {
    max_tokens: generationMaxTokens,
    temperature: 0.5
  });
  const revisedTokens = Number(revised?.usage?.total_tokens || 0);
  logger.info('[Workflow] execute-stage react revised', {
    projectId,
    stageId,
    artifactType,
    issueCount: issues.length
  });
  return {
    content: revised?.content || initialContent || '',
    tokens: totalTokens + critiqueTokens + revisedTokens,
    finishReason: revised?.finish_reason || loopFinishReason || null,
    generationMeta: {
      mode: 'loop',
      rounds: Number(loopResult?.rounds || 1),
      finishReasons: loopResult?.finishReasons || [],
      isComplete: Boolean(loopResult?.isComplete)
    },
    reactTrace: {
      enabled: true,
      revised: true,
      issues
    }
  };
}

function toContextToken(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function isContextPlaceholderToken(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return false;
  }
  // Only treat explicit context tokens as placeholders.
  // This avoids capturing CSS/JSON blocks such as "{ margin: 0; ... }".
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(raw)) {
    return false;
  }
  if (NON_CONTEXT_PLACEHOLDERS.has(raw)) {
    return false;
  }
  if (/^YYYY/.test(raw)) {
    return false;
  }
  return true;
}

function extractPlaceholders(content = '') {
  const text = String(content || '');
  const placeholders = new Set();
  const pattern = /\{([^{}]+)\}/g;
  let match = pattern.exec(text);
  while (match) {
    const raw = String(match[1] || '').trim();
    if (raw) {
      placeholders.add(raw);
    }
    match = pattern.exec(text);
  }
  return placeholders;
}

async function collectRequiredContextKeysForArtifacts(artifactTypes = []) {
  const repoRoot = resolveRepoRoot();
  const required = new Set();

  for (const artifactType of artifactTypes) {
    const def = ARTIFACT_TYPES[artifactType];
    const promptTemplates = Array.isArray(def?.promptTemplates) ? def.promptTemplates : [];
    for (const templatePath of promptTemplates) {
      const absPath = path.resolve(repoRoot, templatePath);
      if (!fs.existsSync(absPath)) {
        continue;
      }
      try {
        const content = await fsPromises.readFile(absPath, 'utf-8');
        const placeholders = extractPlaceholders(content);
        placeholders.forEach(placeholder => {
          if (isContextPlaceholderToken(placeholder)) {
            required.add(toContextToken(placeholder));
          }
        });
      } catch (error) {
        logger.warn('[Workflow] read prompt template failed while collect context keys', {
          artifactType,
          templatePath,
          error: error?.message || String(error)
        });
      }
    }

    if (artifactType === 'strategy-doc') {
      required.add('PRD');
    }
  }

  return required;
}

function calcContextChars(context = {}) {
  return Object.values(context).reduce((sum, value) => sum + String(value || '').length, 0);
}

function enrichExecutionContextFromUpstreamArtifacts(
  project,
  normalizedStageId,
  context = {},
  requiredContextTokens = new Set()
) {
  const nextContext = { ...(context || {}) };
  const requiredTokens = new Set(
    Array.from(requiredContextTokens || [])
      .map(token => toContextToken(token))
      .filter(Boolean)
  );
  if (requiredTokens.size === 0) {
    return nextContext;
  }

  const existingTokens = new Set(
    Object.entries(nextContext)
      .filter(([, value]) => String(value || '').trim())
      .map(([key]) => toContextToken(key))
      .filter(Boolean)
  );
  const existingRequiredChars = Object.entries(nextContext).reduce((sum, [key, value]) => {
    const token = toContextToken(key);
    if (!requiredTokens.has(token)) {
      return sum;
    }
    return sum + String(value || '').length;
  }, 0);
  let remainingBudget = Math.max(0, CONTEXT_TOTAL_CHARS_BUDGET - existingRequiredChars);

  const stages = Array.isArray(project?.workflow?.stages) ? project.workflow.stages : [];
  if (stages.length === 0) {
    return nextContext;
  }

  const currentIndex = stages.findIndex(stage => normalizeStageId(stage?.id) === normalizedStageId);
  const upstreamStages = currentIndex >= 0 ? stages.slice(0, currentIndex) : stages;

  const writeIfMissing = (key, value) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) {
      return;
    }
    const keyToken = toContextToken(normalizedKey);
    if (!requiredTokens.has(keyToken)) {
      return;
    }
    if (existingTokens.has(keyToken)) {
      return;
    }
    if (remainingBudget <= 0) {
      return;
    }
    let safeValue = truncateText(String(value || '').trim(), CONTEXT_VALUE_MAX_CHARS);
    if (safeValue.length > remainingBudget) {
      safeValue = safeValue.slice(0, remainingBudget);
    }
    if (!safeValue) {
      return;
    }
    nextContext[normalizedKey] = safeValue;
    existingTokens.add(keyToken);
    remainingBudget -= safeValue.length;
  };

  for (const stage of upstreamStages) {
    const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
    if (artifacts.length === 0) {
      continue;
    }

    const stageToken = toContextToken(stage.id);
    const stageNameToken = toContextToken(stage.name);
    for (let idx = artifacts.length - 1; idx >= 0; idx -= 1) {
      const artifact = artifacts[idx];
      const content = String(artifact?.content || '').trim();
      if (!content) {
        continue;
      }
      const typeToken = toContextToken(artifact?.type);
      const nameToken = toContextToken(artifact?.name);
      if (typeToken) {
        writeIfMissing(typeToken, content);
      }
      if (nameToken) {
        writeIfMissing(nameToken, content);
      }
      if (stageToken) {
        writeIfMissing(`STAGE_${stageToken}`, content);
      }
      if (stageNameToken) {
        writeIfMissing(`STAGE_NAME_${stageNameToken}`, content);
      }
    }
  }

  return nextContext;
}

function reorderArtifactsForDependency(effectiveArtifactTypes = []) {
  const selected = Array.isArray(effectiveArtifactTypes) ? [...effectiveArtifactTypes] : [];
  if (selected.length <= 1) {
    return selected;
  }
  const selectedSet = new Set(selected);
  const visiting = new Set();
  const visited = new Set();
  const ordered = [];
  const append = type => {
    if (visited.has(type)) {
      return;
    }
    if (visiting.has(type)) {
      return;
    }
    visiting.add(type);
    const dependencies = getDependenciesForArtifactType(type);
    for (const dependencyType of dependencies) {
      if (selectedSet.has(dependencyType)) {
        append(dependencyType);
      }
    }
    visiting.delete(type);
    visited.add(type);
    ordered.push(type);
  };
  selected.forEach(append);
  return ordered;
}

function getDependencyContentsForArtifact({ artifactType, project, generatedArtifacts = [] }) {
  const dependencies = getDependenciesForArtifactType(artifactType);
  if (!dependencies.length) {
    return { missingDependencies: [], dependencyContents: [] };
  }
  const dependencyContents = [];
  const missingDependencies = [];
  for (const dependencyType of dependencies) {
    const artifact =
      getLatestGeneratedArtifact(generatedArtifacts, dependencyType) ||
      getLatestArtifactByType(project, dependencyType);
    const rawContent = String(artifact?.content || '').trim();
    if (!rawContent) {
      missingDependencies.push(dependencyType);
      continue;
    }
    const fallbackDigest = buildCompressedContext(rawContent, {
      maxChars: DEPENDENCY_CONTEXT_MAX_CHARS,
      maxKeyPoints: KEY_POINTS_MAX
    });
    const compressedContent = String(
      artifact?.contextSummary || artifact?.compressedContext || fallbackDigest.compressed || ''
    ).trim();
    dependencyContents.push({
      type: dependencyType,
      content: compressedContent || truncateText(rawContent, DEPENDENCY_CONTEXT_MAX_CHARS),
      sourceChars: rawContent.length,
      compressedChars: (compressedContent || '').length || fallbackDigest.compressedChars
    });
  }
  return { missingDependencies, dependencyContents };
}

function appendDependencyInputsToPrompt(prompt, dependencyContents = []) {
  if (!Array.isArray(dependencyContents) || dependencyContents.length === 0) {
    return prompt;
  }
  const sections = dependencyContents.map(item => {
    const typeLabel = getArtifactName(item.type) || item.type;
    const snippet = truncateText(item.content, 8000);
    return `[${typeLabel} | ${item.type}]\n${snippet}`;
  });
  return `${prompt}\n\n【依赖输入（必须作为当前交付物生成依据）】\n\n${sections.join('\n\n')}\n\n【强约束】\n- 输出内容必须显式对齐依赖输入\n- 若依赖输入存在冲突，需先说明取舍原则再输出最终结果`;
}

async function removeExistingArtifactsByNameAndCleanup({ project, stageId, artifactName }) {
  if (!project?.workflow || !stageId || !artifactName) {
    return;
  }
  const stage = project.workflow.getStage(stageId);
  const existing = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
  const targetName = String(artifactName || '').trim();
  const matched = existing.filter(item => String(item?.name || '').trim() === targetName);
  if (matched.length === 0) {
    return;
  }
  for (const artifact of matched) {
    const artifactId = String(artifact?.id || '').trim();
    const physicalDelete = await deleteArtifactPhysicalFile(project, {
      artifactId,
      relativePath: artifact?.relativePath
    });
    if (!physicalDelete?.ok) {
      logger.warn('[Workflow] cleanup artifact physical file failed', {
        stageId,
        artifactName: targetName,
        artifactId,
        failedPaths: physicalDelete?.failedPaths || []
      });
      continue;
    }
    if (artifact?.id) {
      project.workflow.removeArtifact(stageId, artifact.id);
    }
    if (artifact?.id) {
      await removeArtifactsIndex(project, artifact.id).catch(() => {});
    }
  }
}

export async function executeStage(projectId, stageId, context = {}) {
  const normalizedStageId = normalizeStageId(stageId);
  const project = await loadProject(projectId);
  try {
    const recovered = await recoverStaleRunningRuns({
      projectId,
      stageId: normalizedStageId
    });
    if (recovered > 0) {
      logger.warn('[Workflow] recovered stale running artifact runs', {
        projectId,
        stageId: normalizedStageId,
        recovered
      });
    }
  } catch (error) {
    logger.warn('[Workflow] recover stale runs failed', {
      projectId,
      stageId: normalizedStageId,
      error: error?.message || String(error)
    });
  }
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
  const includeStrategyDoc = effectiveArtifactTypes.includes('strategy-doc');
  const includePrd = effectiveArtifactTypes.includes('prd');
  if (includeStrategyDoc && !includePrd && !projectHasPrdArtifact(project)) {
    const err = new Error('战略设计文档依赖 PRD，请先生成产品需求文档（PRD）');
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
      await removeExistingArtifactsByNameAndCleanup({
        project,
        stageId: targetStageId,
        artifactName: withUrls.name
      });
      await persistGeneratedArtifact(project, normalizedStageId, withUrls);
      await persistCompletedArtifactAsChunkSession({
        project,
        projectId,
        stageId: normalizedStageId,
        artifact: withUrls
      });
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
      await removeExistingArtifactsByNameAndCleanup({
        project,
        stageId: targetStageId,
        artifactName: withUrls.name
      });
      await persistGeneratedArtifact(project, normalizedStageId, withUrls);
      await persistCompletedArtifactAsChunkSession({
        project,
        projectId,
        stageId: normalizedStageId,
        artifact: withUrls
      });
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
        await persistCompletedArtifactAsChunkSession({
          project,
          projectId,
          stageId: normalizedStageId,
          artifact: withUrls
        });
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

  const generatedArtifacts = [...preGeneratedArtifacts];
  const baseContext = { ...(context || {}) };
  const orderedArtifactTypes = reorderArtifactsForDependency(effectiveArtifactTypes);

  for (const artifactType of orderedArtifactTypes) {
    const requiredContextTokens = await collectRequiredContextKeysForArtifacts([artifactType]);
    const artifactContext = enrichExecutionContextFromUpstreamArtifacts(
      project,
      normalizedStageId,
      baseContext,
      requiredContextTokens
    );

    const { missingDependencies, dependencyContents } = getDependencyContentsForArtifact({
      artifactType,
      project,
      generatedArtifacts
    });
    const plannedRounds =
      artifactType === 'prototype' ? PROTOTYPE_LOOP_MAX_ROUNDS : ARTIFACT_LOOP_MAX_ROUNDS;
    const resumeRunIdMap =
      context && typeof context.resumeRunIdMap === 'object' ? context.resumeRunIdMap : null;
    let runId = String(resumeRunIdMap?.[artifactType] || '').trim();
    if (!runId) {
      const history = await listChunkSessions({
        project,
        projectId,
        stageId: normalizedStageId,
        artifactType,
        limit: 20,
        includeChunkContent: false
      }).catch(() => []);
      const resumable = (history || []).find(session => {
        const status = String(session?.status || '').trim();
        const completedRounds = Number(session?.completedRounds || 0);
        const isComplete = Boolean(session?.assembled?.isComplete);
        return (
          ['running', 'failed', 'assembled'].includes(status) &&
          completedRounds > 0 &&
          completedRounds < plannedRounds &&
          !isComplete
        );
      });
      if (resumable?.runId) {
        runId = String(resumable.runId);
      }
    }
    if (!runId) {
      runId = buildRunId(projectId, normalizedStageId, artifactType);
    }
    const dependencySnapshot = {
      types: dependencyContents.map(item => item.type),
      sourceChars: dependencyContents.reduce((sum, item) => sum + Number(item.sourceChars || 0), 0),
      compressedChars: dependencyContents.reduce(
        (sum, item) => sum + Number(item.compressedChars || 0),
        0
      ),
      hash: hashValue(
        JSON.stringify({
          projectId,
          stageId: normalizedStageId,
          artifactType,
          deps: dependencyContents.map(item => ({
            type: item.type,
            digest: hashValue(item.content)
          }))
        })
      )
    };
    try {
      await createRunRecord({
        runId,
        projectId,
        stageId: normalizedStageId,
        artifactType,
        status: 'queued',
        queuedAt: new Date(),
        dependencySnapshot
      });
    } catch (error) {
      logger.warn('[Workflow] create artifact run record failed', {
        projectId,
        stageId: normalizedStageId,
        artifactType,
        runId,
        error: error?.message || String(error)
      });
    }
    await ensureChunkSession({
      project,
      projectId,
      runId,
      stageId: normalizedStageId,
      artifactType,
      totalRounds: plannedRounds,
      status: 'queued'
    }).catch(error => {
      logger.warn('[Workflow] ensure chunk session failed', {
        projectId,
        stageId: normalizedStageId,
        artifactType,
        runId,
        error: error?.message || String(error)
      });
    });
    if (missingDependencies.length > 0) {
      const missingLabels = missingDependencies.map(type => getArtifactName(type) || type);
      await updateRunRecord(runId, {
        status: 'blocked',
        blockedAt: new Date(),
        completedAt: new Date(),
        error: {
          code: 'DEPENDENCY_MISSING',
          message: `缺少依赖输入: ${missingLabels.join('、')}`,
          missingDependencies
        }
      }).catch(() => {});
      await markChunkSessionStatus({
        project,
        projectId,
        runId,
        status: 'blocked',
        error: {
          code: 'DEPENDENCY_MISSING',
          message: `缺少依赖输入: ${missingLabels.join('、')}`,
          missingDependencies
        }
      }).catch(() => {});
      const err = new Error(
        `${getArtifactName(artifactType) || artifactType} 生成失败：缺少依赖输入（${missingLabels.join('、')}）`
      );
      err.status = 400;
      throw err;
    }
    dependencyContents.forEach(item => {
      const token = toContextToken(item.type);
      if (token) {
        artifactContext[token] = truncateText(item.content, CONTEXT_VALUE_MAX_CHARS);
      }
      if (item.type === 'prd') {
        artifactContext.PRD = truncateText(item.content, CONTEXT_VALUE_MAX_CHARS);
      }
    });

    logger.info('[Workflow] execute-stage context prepared', {
      projectId,
      stageId: normalizedStageId,
      artifactType,
      requiredContextKeys: Array.from(requiredContextTokens),
      dependencyTypes: dependencyContents.map(item => item.type),
      dependencySourceChars: dependencyContents.reduce(
        (sum, item) => sum + Number(item.sourceChars || 0),
        0
      ),
      dependencyCompressedChars: dependencyContents.reduce(
        (sum, item) => sum + Number(item.compressedChars || 0),
        0
      ),
      contextChars: calcContextChars(artifactContext),
      contextKeys: Object.keys(artifactContext).slice(0, 20),
      keyCount: Object.keys(artifactContext).length
    });

    let prompt = await loadPromptFromTemplates(artifactType, artifactContext);
    const conversationSource = String(artifactContext.CONVERSATION || '').trim();
    if (conversationSource) {
      prompt = `${prompt}\n\n【创意对话上下文（必须参考）】\n${truncateText(conversationSource, 6000)}\n\n【对齐要求】\n- 输出内容必须与创意对话的目标、约束和关键术语一致\n- 对话中缺失且必须补全的信息需显式标注“【假设】”`;
    }
    if (artifactType === 'strategy-doc') {
      const prdSource = String(
        artifactContext.PRD ||
          getLatestGeneratedArtifactContent(generatedArtifacts, 'prd') ||
          getLatestPrdContent(project)
      ).trim();
      if (!prdSource) {
        const err = new Error('战略设计文档生成失败：缺少 PRD 内容，请先生成并确认 PRD 交付物');
        err.status = 400;
        throw err;
      }
      const prdSnippet = truncateText(prdSource, 12000);
      prompt = `${prompt}\n\n【PRD输入（必须作为战略设计依据）】\n${prdSnippet}\n\n【强约束】\n- 必须显式引用上述PRD的关键信息\n- 不得脱离PRD内容自行臆造核心需求`;
    }
    if (artifactType === 'prototype') {
      const prdSource = String(
        artifactContext.PRD ||
          getLatestGeneratedArtifactContent(generatedArtifacts, 'prd') ||
          getLatestPrdContent(project)
      ).trim();
      const uiDesignSource = String(
        artifactContext.UI_DESIGN ||
          getLatestGeneratedArtifactContent(generatedArtifacts, 'ui-design') ||
          getLatestArtifactContentByType(project, 'ui-design')
      ).trim();
      const designSpecSource = String(
        artifactContext.DESIGN_SPEC ||
          getLatestGeneratedArtifactContent(generatedArtifacts, 'design-spec') ||
          getLatestArtifactContentByType(project, 'design-spec')
      ).trim();

      const missingDependencies = [];
      if (!prdSource) {
        missingDependencies.push('PRD');
      }
      if (!uiDesignSource) {
        missingDependencies.push('UI设计方案');
      }
      if (!designSpecSource) {
        missingDependencies.push('设计规范');
      }
      if (missingDependencies.length > 0) {
        const err = new Error(
          `交互原型生成失败：缺少依赖输入（${missingDependencies.join('、')}）`
        );
        err.status = 400;
        throw err;
      }

      artifactContext.PRD = prdSource;
      artifactContext.UI_DESIGN = uiDesignSource;
      artifactContext.DESIGN_SPEC = designSpecSource;
      prompt = `${prompt}\n\n【依赖输入（必须作为原型实现依据）】\n\n[PRD]\n${truncateText(prdSource, 8000)}\n\n[UI设计方案]\n${truncateText(uiDesignSource, 8000)}\n\n[设计规范]\n${truncateText(designSpecSource, 8000)}\n\n【强约束】\n- 原型页面结构与交互必须与UI设计方案一致\n- 视觉样式与组件规则必须遵循设计规范\n- 关键流程与功能边界必须可追溯到PRD`;
    }
    if (artifactType !== 'strategy-doc' && artifactType !== 'prototype') {
      prompt = appendDependencyInputsToPrompt(prompt, dependencyContents);
    }
    await updateRunRecord(runId, {
      status: 'running',
      startedAt: new Date(),
      contextDigest: {
        contextChars: calcContextChars(artifactContext),
        keyCount: Object.keys(artifactContext).length,
        requiredContextKeys: Array.from(requiredContextTokens),
        dependencySnapshotHash: dependencySnapshot.hash
      },
      modelRequestMeta: {
        model: process.env.DEEPSEEK_MODEL || 'deepseek-reasoner',
        maxTokens:
          artifactType === 'prototype'
            ? PROTOTYPE_LOOP_CHUNK_MAX_TOKENS
            : ARTIFACT_LOOP_CHUNK_MAX_TOKENS,
        loopMaxRounds:
          artifactType === 'prototype' ? PROTOTYPE_LOOP_MAX_ROUNDS : ARTIFACT_LOOP_MAX_ROUNDS,
        temperature: 0.7,
        reactEnabled: REACT_ENABLED
      }
    }).catch(() => {});
    await markChunkSessionStatus({
      project,
      projectId,
      runId,
      status: 'running'
    }).catch(() => {});
    const chunkSession = await getChunkSession({
      project,
      projectId,
      runId
    }).catch(() => null);
    const resumedRounds = Number(chunkSession?.completedRounds || 0);
    const resumeContent = assembleContentFromSession(chunkSession);
    logger.info('[Workflow] execute-stage call model', {
      projectId,
      stageId: normalizedStageId,
      artifactType,
      promptChars: prompt.length
    });
    let modelResult = null;
    try {
      modelResult = await callModelWithReAct({
        prompt,
        artifactType,
        projectId,
        stageId: normalizedStageId,
        onChunk: async chunk => {
          await appendChunkRecord({
            project,
            projectId,
            runId,
            stageId: normalizedStageId,
            artifactType,
            round: chunk?.round,
            content: chunk?.piece || '',
            finishReason: chunk?.finishReason || null,
            totalRounds: chunk?.totalRounds || plannedRounds
          }).catch(error => {
            logger.warn('[Workflow] append chunk record failed', {
              projectId,
              stageId: normalizedStageId,
              artifactType,
              runId,
              round: chunk?.round,
              error: error?.message || String(error)
            });
          });
        },
        resumeContent,
        resumedRounds
      });
    } catch (error) {
      await updateRunRecord(runId, {
        status: 'failed',
        completedAt: new Date(),
        error: {
          code: 'MODEL_CALL_FAILED',
          message: error?.message || '模型调用失败'
        }
      }).catch(() => {});
      await markChunkSessionStatus({
        project,
        projectId,
        runId,
        status: 'failed',
        error: {
          code: 'MODEL_CALL_FAILED',
          message: error?.message || '模型调用失败'
        }
      }).catch(() => {});
      throw error;
    }

    const usage = { total_tokens: Number(modelResult?.tokens || 0) };
    logger.info('[Workflow] execute-stage model response', {
      projectId,
      stageId: normalizedStageId,
      artifactType,
      tokens: usage.total_tokens || 0,
      finishReason: modelResult?.finishReason || modelResult?.finish_reason || null,
      reactEnabled: Boolean(modelResult?.reactTrace?.enabled),
      reactRevised: Boolean(modelResult?.reactTrace?.revised)
    });
    if (['prototype', 'preview', 'ui-preview'].includes(String(artifactType || ''))) {
      const html = String(modelResult?.content || '').trim();
      if (!isLikelyCompleteHtml(html)) {
        logger.warn('[Workflow] prototype html seems truncated, attempting repair', {
          projectId,
          stageId: normalizedStageId,
          artifactType,
          contentChars: html.length
        });
        try {
          modelResult.content = await repairTruncatedPrototypeHtml(
            html,
            projectId,
            normalizedStageId
          );
        } catch (repairError) {
          logger.error('[Workflow] prototype html repair failed', {
            projectId,
            stageId: normalizedStageId,
            error: repairError?.message || String(repairError)
          });
        }
      }
    }
    await markChunkSessionAssembled({
      project,
      projectId,
      runId,
      content: modelResult?.content || '',
      artifact: null,
      isComplete: Boolean(modelResult?.generationMeta?.isComplete)
    }).catch(() => {});
    const digest = buildArtifactDigest(artifactType, modelResult?.content || '');
    const artifact = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      stageId: normalizedStageId,
      type: artifactType,
      name: getArtifactName(artifactType),
      content: modelResult?.content || '',
      agentName: getAgentName(stage.recommendedAgents[0]),
      source: 'model',
      createdAt: Date.now(),
      tokens: usage.total_tokens || 0,
      contextSummary: digest.contextSummary,
      keyPoints: digest.keyPoints,
      contextDigest: digest.contextDigest,
      compressedContext: digest.compressedContext,
      reactTrace: modelResult?.reactTrace || null
    };
    if (modelResult?.generationMeta) {
      artifact.generationMeta = modelResult.generationMeta;
    }
    const targetStageId = resolveTargetStageIdForArtifact(project, normalizedStageId, artifactType);
    await removeExistingArtifactsByNameAndCleanup({
      project,
      stageId: targetStageId,
      artifactName: artifact.name
    });
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
    await markChunkSessionAssembled({
      project,
      projectId,
      runId,
      content: withUrls?.content || '',
      artifact: withUrls,
      isComplete: true
    }).catch(() => {});
    await updateRunRecord(runId, {
      status: 'succeeded',
      completedAt: new Date(),
      reactTrace: modelResult?.reactTrace || null,
      result: {
        artifactId: withUrls?.id || null,
        artifactType,
        tokens: usage.total_tokens || 0,
        contentHash: hashValue(withUrls?.content || ''),
        contentChars: String(withUrls?.content || '').length
      }
    }).catch(() => {});
    await markChunkSessionStatus({
      project,
      projectId,
      runId,
      status: 'succeeded'
    }).catch(() => {});

    if (orderedArtifactTypes.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return generatedArtifacts;
}
