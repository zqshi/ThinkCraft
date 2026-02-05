/**
 * 工作流执行 API
 * 协同开发模式的阶段任务执行
 */
import express from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import {
  getStageById,
  normalizeStageId,
  ARTIFACT_TYPES,
  AGENT_PROMPT_MAP
} from '../../../../config/workflow-stages.js';
import { projectRepository } from '../../../features/projects/infrastructure/index.js';

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

function normalizeArtifactsForResponse(stageId, artifactsList = []) {
  return (artifactsList || []).map(artifact => ({
    ...artifact,
    stageId: artifact?.stageId || stageId
  }));
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

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    const err = new Error('DEEPSEEK_API_KEY 未配置或无效，请在后端 .env 中设置');
    err.status = 400;
    throw err;
  }

  // 创建交付物
  const generatedArtifacts = [];

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
    generatedArtifacts.push(artifact);
    await persistGeneratedArtifact(project, normalizedStageId, artifact);

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
    'deploy-doc': '部署文档',
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
      allArtifacts.push(...normalizeArtifactsForResponse(stageId, artifactsList));
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
    const stages = workflow.stages || [];
    for (const stage of stages) {
      if (stage?.artifacts?.some(a => a.id === artifactId)) {
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
