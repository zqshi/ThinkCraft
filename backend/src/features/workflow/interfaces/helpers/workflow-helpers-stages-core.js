import { getStageById } from '../../../../../config/workflow-stages.js';

const STRATEGY_STAGE_ARTIFACTS = new Set(['strategy-doc']);

export {
  resolveStageDefinition,
  ensureStageDefinition,
  resolveProjectStageIds,
  resolveTargetStageIdForArtifact,
  getAgentName
};

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
