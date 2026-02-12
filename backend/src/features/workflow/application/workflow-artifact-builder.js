import { getArtifactName, getAgentName } from '../interfaces/helpers/workflow-helpers.js';

export function buildExecutionArtifact({
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
