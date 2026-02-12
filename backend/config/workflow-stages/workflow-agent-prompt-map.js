import { ARTIFACT_TYPES } from './workflow-artifact-types.js';
import {
  buildCompositeStage,
  COMPOSITE_STAGE_DEFS,
  normalizeStageId
} from './workflow-stage-aliases.js';
import { DEFAULT_WORKFLOW_STAGE_ORDER } from './workflow-stage-order.js';
import { DEFAULT_WORKFLOW_STAGES } from './workflow-stages-default.js';

export const AGENT_PROMPT_MAP = {
  'strategy-design': {
    name: '战略设计师',
    persona: [
      'prompts/agents/strategy/strategy-designer/templates/strategy-designer.strategy-doc.md'
    ],
    deliverables: ['strategy-doc'],
    stageHint: { id: 'strategy', name: '战略设计', description: '战略设计与关键假设' }
  },
  // 兼容历史ID，避免旧数据或外部引用失效
  'strategy-designer': {
    name: '战略设计师',
    persona: [
      'prompts/agents/strategy/strategy-designer/templates/strategy-designer.strategy-doc.md'
    ],
    deliverables: ['strategy-doc'],
    stageHint: { id: 'strategy', name: '战略设计', description: '战略设计与关键假设' }
  },
  'product-manager': {
    name: '产品经理',
    persona: [],
    deliverables: [
      'research-analysis-doc',
      'prd',
      'user-story',
      'feature-list',
      'core-prompt-design'
    ],
    stageHint: { id: 'requirement', name: '需求分析', description: '需求分析与产品规划' }
  },
  'ui-ux-designer': {
    name: 'UI/UX设计师',
    persona: [],
    deliverables: ['ui-design', 'prototype', 'design-spec'],
    stageHint: { id: 'design', name: '产品设计', description: 'UI/UX设计与交互规范' }
  },
  prototype: {
    name: '原型设计师',
    persona: [],
    deliverables: ['prototype'],
    stageHint: { id: 'design', name: '产品设计', description: '交互原型设计' }
  },
  'design-spec': {
    name: '设计规范专家',
    persona: [],
    deliverables: ['design-spec'],
    stageHint: { id: 'design', name: '产品设计', description: '设计规范定义与组件约束' }
  },
  'ui-design': {
    name: '视觉UI设计师',
    persona: [],
    deliverables: ['ui-design'],
    stageHint: { id: 'design', name: '产品设计', description: '视觉界面设计与规范' }
  },
  'tech-lead': {
    name: '技术负责人',
    persona: [],
    deliverables: ['architecture-doc', 'api-spec', 'tech-stack'],
    stageHint: { id: 'architecture', name: '架构设计', description: '系统架构与技术选型' }
  },
  'frontend-developer': {
    name: '前端开发',
    persona: [],
    deliverables: ['frontend-code', 'component-lib', 'frontend-doc'],
    stageHint: { id: 'development', name: '开发实现', description: '前后端开发实现' }
  },
  'backend-developer': {
    name: '后端开发',
    persona: [],
    deliverables: ['backend-code', 'api-doc', 'backend-doc'],
    stageHint: { id: 'development', name: '开发实现', description: '前后端开发实现' }
  },
  'qa-engineer': {
    name: '测试工程师',
    persona: [],
    deliverables: ['test-report', 'bug-list', 'performance-report'],
    stageHint: { id: 'testing', name: '测试验证', description: '功能与性能测试' }
  },
  devops: {
    name: '运维工程师',
    persona: [],
    deliverables: ['deploy-doc', 'env-config', 'release-notes'],
    stageHint: { id: 'deployment', name: '部署上线', description: '部署与发布' }
  },
  marketing: {
    name: '市场营销',
    persona: [],
    deliverables: ['marketing-plan', 'growth-strategy'],
    stageHint: { id: 'operation', name: '运营推广', description: '市场推广与增长策略' }
  },
  operations: {
    name: '运营专员',
    persona: [],
    deliverables: ['analytics-report'],
    stageHint: { id: 'operation', name: '运营推广', description: '用户运营与数据分析' }
  }
};

/**
 * 根据阶段ID获取阶段配置
 * @param {String} stageId - 阶段ID
 * @returns {Object|null} 阶段配置
 */
export function getStageById(stageId) {
  const normalized = normalizeStageId(stageId);
  if (COMPOSITE_STAGE_DEFS[normalized]) {
    return buildCompositeStage(normalized);
  }
  return DEFAULT_WORKFLOW_STAGES.find(stage => stage.id === normalized) || null;
}

/**
 * 获取阶段的推荐Agent
 * @param {String} stageId - 阶段ID
 * @returns {Array<String>} Agent类型数组
 */
export function getRecommendedAgents(stageId) {
  const stage = getStageById(stageId);
  return stage ? stage.recommendedAgents : [];
}

/**
 * 获取阶段的交付物类型
 * @param {String} stageId - 阶段ID
 * @returns {Array<String>} 交付物类型数组
 */
export function getArtifactTypes(stageId) {
  const stage = getStageById(stageId);
  return stage ? stage.artifactTypes : [];
}

export function getAgentPromptProfile(agentId) {
  if (!agentId) return null;
  const entry = AGENT_PROMPT_MAP[agentId];
  if (!entry) return null;
  const deliverables = (entry.deliverables || []).map(type => ({
    type,
    name: ARTIFACT_TYPES[type]?.name || type,
    promptTemplates: ARTIFACT_TYPES[type]?.promptTemplates || []
  }));
  return {
    id: agentId,
    name: entry.name || agentId,
    persona: entry.persona || [],
    deliverables
  };
}

export function getAgentPromptProfiles(agentIds = []) {
  return (agentIds || []).map(agentId => getAgentPromptProfile(agentId)).filter(Boolean);
}

/**
 * 初始化默认工作流
 * @returns {Array<Object>} 工作流阶段数组
 */
export function getDefaultWorkflowStagesForInit() {
  return DEFAULT_WORKFLOW_STAGE_ORDER
    .map(stageId => {
      if (stageId === 'strategy-requirement') {
        return buildCompositeStage('strategy-requirement');
      }
      return DEFAULT_WORKFLOW_STAGES.find(stage => stage.id === stageId) || null;
    })
    .filter(Boolean);
}

export function initializeDefaultWorkflow() {
  return getDefaultWorkflowStagesForInit().map(stage => ({
    id: stage.id,
    name: stage.name,
    status: 'pending', // pending | active | completed
    agents: [...stage.recommendedAgents],
    artifacts: [],
    startedAt: null,
    completedAt: null
  }));
}

/**
 * 验证自定义工作流
 * @param {Array<Object>} customStages - 自定义阶段数组
 * @returns {Boolean} 是否有效
 */
export function validateCustomWorkflow(customStages) {
  if (!Array.isArray(customStages) || customStages.length === 0) {
    return false;
  }

  for (const stage of customStages) {
    if (!stage.id || !stage.name) {
      return false;
    }
    if (!stage.agents || !Array.isArray(stage.agents)) {
      return false;
    }
  }

  return true;
}

export default {
  DEFAULT_WORKFLOW_STAGES,
  ARTIFACT_TYPES,
  getStageById,
  getRecommendedAgents,
  getArtifactTypes,
  getDefaultWorkflowStagesForInit,
  initializeDefaultWorkflow,
  validateCustomWorkflow
};
