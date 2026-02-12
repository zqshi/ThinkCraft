import {
  AGENT_PROMPT_MAP,
  ARTIFACT_TYPES,
  DEFAULT_WORKFLOW_STAGES
} from '../../../../../config/workflow-stages.js';
import { buildOutputsDetailed } from './agents-outputs.js';

export {
  buildRoleTemplateMapping,
  buildFullWorkflowStages
};

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

function buildFullWorkflowStages(recommendedAgents = [], stageHints = []) {
  const recommendedSet = new Set(recommendedAgents || []);
  recommendedSet.add('strategy-design');

  const stageHintMap = new Map();
  (stageHints || []).forEach(stage => {
    if (stage?.id) {
      stageHintMap.set(stage.id, stage);
    }
  });

  const stageList = Array.isArray(DEFAULT_WORKFLOW_STAGES)
    ? DEFAULT_WORKFLOW_STAGES
    : (DEFAULT_WORKFLOW_STAGES['product-development'] || []);
  const stageDefaults = stageList.reduce((acc, stage) => {
    acc[stage.id] = stage;
    return acc;
  }, {});

  const mergedStageOutputs = Array.from(
    new Set(
      [
        ...(stageDefaults.strategy?.artifactTypes || []),
        ...(stageDefaults.requirement?.artifactTypes || [])
      ].filter(Boolean)
    )
  );

  const stageTemplates = [
    {
      id: 'strategy-requirement',
      name: '战略与需求',
      description: '战略建模与需求分析',
      defaultAgents: Array.from(
        new Set(
          [
            ...(stageDefaults.strategy?.recommendedAgents || []),
            ...(stageDefaults.requirement?.recommendedAgents || [])
          ].filter(Boolean)
        )
      ),
      outputs: mergedStageOutputs
    },
    {
      id: 'design',
      name: stageDefaults.design?.name || '产品设计',
      description: stageDefaults.design?.description || '',
      defaultAgents: stageDefaults.design?.recommendedAgents || [],
      outputs: stageDefaults.design?.artifactTypes || []
    },
    {
      id: 'architecture',
      name: stageDefaults.architecture?.name || '架构设计',
      description: stageDefaults.architecture?.description || '',
      defaultAgents: stageDefaults.architecture?.recommendedAgents || [],
      outputs: stageDefaults.architecture?.artifactTypes || []
    },
    {
      id: 'development',
      name: stageDefaults.development?.name || '开发实现',
      description: stageDefaults.development?.description || '',
      defaultAgents: stageDefaults.development?.recommendedAgents || [],
      outputs: stageDefaults.development?.artifactTypes || []
    },
    {
      id: 'testing',
      name: stageDefaults.testing?.name || '测试验证',
      description: stageDefaults.testing?.description || '',
      defaultAgents: stageDefaults.testing?.recommendedAgents || [],
      outputs: stageDefaults.testing?.artifactTypes || []
    },
    {
      id: 'deployment',
      name: stageDefaults.deployment?.name || '部署上线',
      description: stageDefaults.deployment?.description || '',
      defaultAgents: stageDefaults.deployment?.recommendedAgents || [],
      outputs: stageDefaults.deployment?.artifactTypes || []
    }
  ];

  const stages = stageTemplates.map((template, index) => {
    const hint =
      stageHintMap.get(template.id) ||
      (template.id === 'strategy-requirement'
        ? stageHintMap.get('strategy') || stageHintMap.get('requirement')
        : null);

    const agents = (hint?.agents || template.defaultAgents || []).filter(agentId =>
      recommendedSet.has(agentId)
    );
    const fallbackAgents =
      agents.length > 0
        ? agents
        : (template.defaultAgents || []).filter(agentId => recommendedSet.has(agentId));

    return {
      id: template.id,
      name: hint?.name || template.name,
      description: hint?.description || template.description,
      agents: fallbackAgents.length > 0 ? fallbackAgents : template.defaultAgents || [],
      dependencies: index === 0 ? [] : [stageTemplates[index - 1].id],
      outputs: template.outputs,
      outputsDetailed: buildOutputsDetailed(template.outputs),
      status: 'pending',
      order: index + 1
    };
  });

  return stages;
}
