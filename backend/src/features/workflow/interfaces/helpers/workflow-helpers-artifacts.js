import { getStageById } from '../../../../../config/workflow-stages.js';
import { buildArtifactFileUrl } from '../../../projects/infrastructure/project-files.js';

export {
  collectProjectArtifacts,
  getStageArtifactsFromProject,
  normalizeArtifactsForResponse,
  removeExistingArtifactsByType,
  resolveStageOutputsForProject,
  getArtifactName,
  shouldInlinePreview,
  shouldSkipTreeEntry
};

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

function shouldInlinePreview(artifactType) {
  return ['prototype', 'preview', 'ui-preview'].includes(artifactType);
}

function shouldSkipTreeEntry(name) {
  const skip = new Set(['node_modules', '.git', 'dist', 'build', '.DS_Store']);
  return skip.has(name);
}
