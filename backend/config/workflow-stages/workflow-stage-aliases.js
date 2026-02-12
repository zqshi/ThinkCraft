import { DEFAULT_WORKFLOW_STAGES } from './workflow-stages-default.js';

export const STAGE_ID_ALIASES = {
  'strategy_requirement': 'strategy-requirement',
  'strategy+requirement': 'strategy-requirement',
  'strategy-validation': 'strategy',
  'strategy-review': 'strategy',
  'strategy-plan': 'strategy',
  'product-definition': 'requirement',
  'product-requirement': 'requirement',
  requirements: 'requirement',
  'ux-design': 'design',
  'ui-design': 'design',
  'product-design': 'design',
  'architecture-design': 'architecture',
  'tech-architecture': 'architecture',
  'system-architecture': 'architecture',
  implementation: 'development',
  dev: 'development',
  qa: 'testing',
  test: 'testing',
  launch: 'deployment',
  release: 'deployment',
  operation: 'operation',
  ops: 'operation'
};

export const COMPOSITE_STAGE_DEFS = {
  'strategy-requirement': {
    name: '战略与需求',
    description: '需求分析（含PRD）与战略设计',
    parts: ['requirement', 'strategy'],
    icon: '🎯',
    color: '#6366f1'
  }
};

export function normalizeStageId(stageId) {
  if (!stageId) {
    return stageId;
  }
  const normalized = String(stageId).trim();
  return STAGE_ID_ALIASES[normalized] || normalized;
}

export function buildCompositeStage(stageId) {
  const config = COMPOSITE_STAGE_DEFS[stageId];
  if (!config) {
    return null;
  }

  const parts = (config.parts || [])
    .map(id => DEFAULT_WORKFLOW_STAGES.find(stage => stage.id === id))
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const recommendedAgents = Array.from(
    new Set(parts.flatMap(stage => stage.recommendedAgents || []).filter(Boolean))
  );
  const artifactTypes = Array.from(
    new Set(parts.flatMap(stage => stage.artifactTypes || []).filter(Boolean))
  );
  const estimatedDuration = parts.reduce(
    (sum, stage) => sum + (Number(stage.estimatedDuration) || 0),
    0
  );

  return {
    id: stageId,
    name: config.name || stageId,
    description:
      config.description ||
      parts
        .map(stage => stage.description)
        .filter(Boolean)
        .join(' / '),
    recommendedAgents,
    artifactTypes,
    estimatedDuration,
    icon: config.icon || parts[0]?.icon,
    color: config.color || parts[0]?.color
  };
}
