import express from 'express';
import { UserAgentModel } from '../infrastructure/user-agent.model.js';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import {
  AGENT_PROMPT_MAP,
  ARTIFACT_TYPES,
  DEFAULT_WORKFLOW_STAGES,
  getDefaultWorkflowStagesForInit
} from '../../../../config/workflow-stages.js';
import {
  COLLAB_PLAN_STRATEGY_VERSION,
  COLLAB_RECOMMENDATION_RULES
} from '../../../../config/workflow-stages/collaboration-rules.js';
import { buildFullWorkflowStages } from './helpers/agents-roles-mapping.js';

const router = express.Router();
const userAgents = new Map();

function nowIso() {
  return new Date().toISOString();
}

function normalizeType(agentType) {
  return String(agentType || '').trim();
}

function toAgentTypeDto(id) {
  const profile = AGENT_PROMPT_MAP[id] || {};
  return {
    id,
    name: profile.name || id,
    emoji: profile.emoji || '🤖',
    desc: profile.description || profile.role || '智能体',
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    level: profile.level || 'senior',
    promptPath: profile.promptPath || '',
    promptName: profile.promptName || '',
    promptDescription: profile.promptDescription || ''
  };
}

function resolveWorkflowStages(workflowCategory = 'product-development') {
  if (workflowCategory === 'product-development') {
    return getDefaultWorkflowStagesForInit();
  }
  if (Array.isArray(DEFAULT_WORKFLOW_STAGES)) {
    return DEFAULT_WORKFLOW_STAGES;
  }
  return DEFAULT_WORKFLOW_STAGES?.[workflowCategory] || [];
}

function uniqueStable(ids, availableIds = []) {
  const allowSet = new Set(availableIds || []);
  const unique = new Set((ids || []).filter(id => allowSet.has(id)));
  return (availableIds || []).filter(id => unique.has(id));
}

function getCollaborationExcludedAgents() {
  return new Set(COLLAB_RECOMMENDATION_RULES.excludedAgents || []);
}

function buildFallbackRecommendedAgents(stageDefs = [], availableIds = [], agents = []) {
  const fromStages = stageDefs.flatMap(stage => stage.recommendedAgents || []);
  const fromPayload = agents.map(item => item?.id).filter(Boolean);
  const merged = Array.from(new Set([...fromStages, ...fromPayload]));
  return uniqueStable(merged, availableIds);
}

function buildDeterministicStages(recommendedAgents = [], stageDefs = []) {
  const stageHints = recommendedAgents
    .map(id => AGENT_PROMPT_MAP[id]?.stageHint)
    .filter(Boolean);

  const built = buildFullWorkflowStages(recommendedAgents, stageHints);
  if (Array.isArray(built) && built.length > 0) {
    return built;
  }

  return stageDefs.map((stage, index) => ({
    id: stage.id,
    name: stage.name,
    description: stage.description || '',
    agents: (stage.recommendedAgents || []).filter(id => recommendedAgents.includes(id)),
    dependencies: index === 0 ? [] : [stageDefs[index - 1]?.id].filter(Boolean),
    outputs: stage.artifactTypes || stage.outputs || [],
    outputsDetailed: [],
    status: 'pending',
    order: index + 1
  }));
}

function sanitizeModelStages(modelStages, stageBlueprint = [], recommendedAgents = []) {
  const recommendedSet = new Set(recommendedAgents || []);
  const blueprintMap = new Map((stageBlueprint || []).map(stage => [stage.id, stage]));
  const modelMap = new Map(
    (Array.isArray(modelStages) ? modelStages : [])
      .filter(stage => stage && blueprintMap.has(stage.id))
      .map(stage => [stage.id, stage])
  );
  const validStageIds = new Set((stageBlueprint || []).map(stage => stage.id));

  return (stageBlueprint || []).map((stage, index) => {
    const modelStage = modelMap.get(stage.id) || {};
    const allowedOutputs = new Set(Array.isArray(stage.outputs) ? stage.outputs : []);
    const nextOutputs = (Array.isArray(modelStage.outputs) ? modelStage.outputs : [])
      .filter(type => allowedOutputs.has(type));
    const nextAgents = (Array.isArray(modelStage.agents) ? modelStage.agents : []).filter(id =>
      recommendedSet.has(id)
    );
    const nextDependencies = (Array.isArray(modelStage.dependencies) ? modelStage.dependencies : [])
      .filter(dep => validStageIds.has(dep));

    return {
      ...stage,
      name: modelStage.name || stage.name,
      description: modelStage.description || stage.description || '',
      outputs: nextOutputs.length > 0 ? nextOutputs : stage.outputs || [],
      agents: nextAgents.length > 0 ? nextAgents : stage.agents || [],
      dependencies:
        nextDependencies.length > 0
          ? nextDependencies
          : (index === 0 ? [] : [stageBlueprint[index - 1]?.id].filter(Boolean)),
      order: index + 1
    };
  });
}

function toAgentDisplayName(agentId) {
  return AGENT_PROMPT_MAP?.[agentId]?.name || agentId;
}

function toArtifactTemplateSummary(type) {
  const def = ARTIFACT_TYPES?.[type];
  const templates = Array.isArray(def?.promptTemplates) ? def.promptTemplates : [];
  return {
    type,
    name: def?.name || type,
    templates
  };
}

function buildStageExecutionTemplates(stages = []) {
  return (stages || []).map((stage, index) => {
    const stageAgents = Array.isArray(stage.agents) ? stage.agents : [];
    const stageOutputs = Array.isArray(stage.outputs) ? stage.outputs : [];
    const deliverables = stageOutputs.map(toArtifactTemplateSummary);
    const stageAgentNames = stageAgents.map(toAgentDisplayName);
    const prevStage = index > 0 ? stages[index - 1] : null;

    return {
      stageId: stage.id,
      stageName: stage.name,
      goal: stage.description || `${stage.name}阶段交付`,
      roleOwners: stageAgentNames,
      inputs: [
        '创意说明与上下文对话',
        ...(prevStage ? [`${prevStage.name}阶段交付物`] : [])
      ],
      steps: [
        `明确${stage.name}阶段目标与边界`,
        `按角色分工产出：${stageAgentNames.join('、') || '待分配角色'}`,
        `基于模板生成交付物并做一致性校验`,
        '阶段评审通过后进入下一阶段'
      ],
      qualityChecks: [
        '交付物与阶段目标一致',
        '关键假设可验证、可追溯',
        '输出文件命名与类型规范一致'
      ],
      deliverables
    };
  });
}

function buildFallbackPlan(
  stages = [],
  recommendedAgents = [],
  collaborationMode = 'sequential',
  executionTemplates = []
) {
  const stageBlocks = (executionTemplates || [])
    .map((template, idx) => {
      const deliverableLines = (template.deliverables || [])
        .map(
          item =>
            `  - ${item.name}（${item.type}）\n    模板：${
              item.templates.length > 0 ? item.templates.join('，') : '无'
            }`
        )
        .join('\n');
      return `### 阶段${idx + 1}：${template.stageName}\n- 目标：${template.goal}\n- 负责人：${
        template.roleOwners.join('、') || '待分配'
      }\n- 输入：${template.inputs.join('；')}\n- 执行步骤：\n  1. ${template.steps[0]}\n  2. ${
        template.steps[1]
      }\n  3. ${template.steps[2]}\n  4. ${template.steps[3]}\n- 质量检查：${template.qualityChecks.join('；')}\n- 交付物模板：\n${
        deliverableLines || '  - 无'
      }`;
    })
    .join('\n\n');

  return `## 协同模式\n- 模式：${collaborationMode}\n- 建议雇佣：${recommendedAgents
    .map(toAgentDisplayName)
    .join('、')}\n\n## 阶段执行模板\n${stageBlocks}`;
}

async function selectRecommendedAgentsDeterministically({
  idea,
  instruction,
  conversation,
  stageDefs,
  availableIds,
  agents
}) {
  const excluded = getCollaborationExcludedAgents();
  const filteredAvailableIds = (availableIds || []).filter(id => !excluded.has(id));
  const fallback = buildFallbackRecommendedAgents(stageDefs, filteredAvailableIds, agents);
  const corpus = `${idea || ''}\n${instruction || ''}\n${conversation || ''}`.toLowerCase();
  const pick = [];

  const pushIfAvailable = (id) => {
    if (filteredAvailableIds.includes(id) && !pick.includes(id)) {
      pick.push(id);
    }
  };

  // 核心角色固定保留（若存在）
  (COLLAB_RECOMMENDATION_RULES.coreAgents || []).forEach(pushIfAvailable);
  (COLLAB_RECOMMENDATION_RULES.keywordAgentRules || []).forEach(rule => {
    if (rule?.pattern?.test(corpus)) {
      (rule.agents || []).forEach(pushIfAvailable);
    }
  });

  const merged = uniqueStable([...pick, ...fallback], filteredAvailableIds);
  const max = Number(COLLAB_RECOMMENDATION_RULES.maxRecommendedAgents);
  if (Number.isFinite(max) && max > 0) {
    return merged.slice(0, max);
  }
  return merged;
}

function chooseCollaborationModeDeterministically(recommendedAgents = [], stages = []) {
  const set = new Set(recommendedAgents);
  const dualDev = COLLAB_RECOMMENDATION_RULES.modeRules?.parallelWhenHasDualDev || [];
  const hasDualDev = dualDev.every(id => set.has(id));
  const longFlow =
    (stages || []).length >=
    (COLLAB_RECOMMENDATION_RULES.modeRules?.parallelWhenStageCountAtLeast || 5);
  return hasDualDev || longFlow ? 'parallel' : 'sequential';
}

async function loadUserAgents(userId) {
  const key = String(userId);
  const cached = userAgents.get(key);
  if (Array.isArray(cached)) {
    return cached;
  }
  try {
    const docs = await UserAgentModel.find({ userId: key }).lean();
    const list = docs.map(doc => ({ ...doc, id: doc._id || doc.id }));
    userAgents.set(key, list);
    return list;
  } catch (error) {
    return [];
  }
}

async function saveUserAgent(userId, agent) {
  const key = String(userId);
  const list = await loadUserAgents(key);
  const merged = [...list, agent];
  userAgents.set(key, merged);
  try {
    await UserAgentModel.findOneAndUpdate(
      { _id: agent.id },
      { ...agent, _id: agent.id, userId: key },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // Ignore DB cache sync errors and still return in-memory result.
  }
  return agent;
}

async function removeUserAgent(userId, agentId) {
  const key = String(userId);
  const list = await loadUserAgents(key);
  userAgents.set(
    key,
    list.filter(item => item.id !== agentId)
  );
  try {
    await UserAgentModel.deleteOne({ _id: agentId, userId: key });
  } catch (error) {
    // Ignore DB cache sync errors and still return in-memory result.
  }
}

router.get('/types', async (req, res) => {
  const types = Object.keys(AGENT_PROMPT_MAP || {}).map(toAgentTypeDto);
  return res.json({ code: 0, data: { types } });
});

router.get('/types-by-workflow', async (req, res) => {
  const workflowCategory = String(req.query.workflowCategory || 'product-development');
  const stages = resolveWorkflowStages(workflowCategory);
  const ids = Array.from(
    new Set(stages.flatMap(stage => stage.recommendedAgents || []).filter(Boolean))
  );
  const types = ids.length > 0 ? ids.map(toAgentTypeDto) : Object.keys(AGENT_PROMPT_MAP || {}).map(toAgentTypeDto);
  return res.json({ code: 0, data: { workflowCategory, types } });
});

router.get('/my/:userId', async (req, res) => {
  const { userId } = req.params;
  const agents = await loadUserAgents(userId);
  return res.json({ code: 0, data: { userId, agents } });
});

router.post('/hire', async (req, res) => {
  try {
    const userId = String(req.body.userId || '').trim();
    const agentType = normalizeType(req.body.agentType);
    if (!userId || !agentType) {
      return res.status(400).json({ code: -1, error: '缺少 userId 或 agentType' });
    }

    const profile = toAgentTypeDto(agentType);
    const agent = {
      id: `ua_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      type: agentType,
      name: profile.name,
      nickname: profile.name,
      emoji: profile.emoji,
      desc: profile.desc,
      skills: profile.skills,
      salary: 0,
      level: profile.level,
      hiredAt: nowIso(),
      status: 'idle',
      tasksCompleted: 0,
      performance: 100
    };

    await saveUserAgent(userId, agent);
    return res.json({ code: 0, data: agent });
  } catch (error) {
    return res.status(500).json({ code: -1, error: error.message || '雇佣失败' });
  }
});

router.delete('/:userId/:agentId', async (req, res) => {
  const { userId, agentId } = req.params;
  await removeUserAgent(userId, agentId);
  return res.json({ code: 0, data: { success: true } });
});

router.post('/assign-task', async (req, res) => {
  try {
    const { userId, agentId, task, context } = req.body || {};
    if (!userId || !agentId || !task) {
      return res.status(400).json({ code: -1, error: '缺少参数' });
    }

    const agents = await loadUserAgents(userId);
    const agent = agents.find(item => item.id === agentId);
    if (!agent) {
      return res.status(404).json({ code: -1, error: 'Agent不存在' });
    }

    const prompt = `你是${agent.name}。请完成任务：${task}\n\n上下文：${context || '无'}\n\n请输出可执行的结果。`;
    const result = await callDeepSeekAPI([{ role: 'user', content: prompt }], null, {
      temperature: 0.5,
      max_tokens: 1200,
      timeout: 90000
    });

    return res.json({
      code: 0,
      data: {
        agentId,
        task,
        output: result.content,
        usage: result.usage || null,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    return res.status(500).json({ code: -1, error: error.message || '任务执行失败' });
  }
});

router.post('/collaboration-plan', async (req, res) => {
  try {
    const { idea, agents = [], instruction = '', conversation = '', workflowCategory = '' } = req.body || {};
    const normalizedWorkflowCategory = String(workflowCategory || 'product-development');
    const stageDefs = resolveWorkflowStages(normalizedWorkflowCategory);
    const availableIds = Object.keys(AGENT_PROMPT_MAP || {});
    const recommendedAgents = await selectRecommendedAgentsDeterministically({
      idea,
      instruction,
      conversation,
      stageDefs,
      availableIds,
      agents
    });
    const stageBlueprint = buildDeterministicStages(recommendedAgents, stageDefs);
    const collaborationMode = chooseCollaborationModeDeterministically(
      recommendedAgents,
      stageBlueprint
    );
    const stages = sanitizeModelStages(stageBlueprint, stageBlueprint, recommendedAgents);
    const executionTemplates = buildStageExecutionTemplates(stages);
    const plan = buildFallbackPlan(
      stages,
      recommendedAgents,
      collaborationMode,
      executionTemplates
    );

    return res.json({
      code: 0,
      data: {
        plan,
        recommendedAgents,
        collaborationMode,
        stages,
        executionTemplates,
        strategyVersion: COLLAB_PLAN_STRATEGY_VERSION
      }
    });
  } catch (error) {
    return res.status(500).json({ code: -1, error: error.message || '协作建议生成失败' });
  }
});

export default router;
