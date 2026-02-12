import { projectRepository } from '../../../features/projects/infrastructure/index.js';
import {
  buildArtifactFileUrl,
  deleteArtifactPhysicalFile,
  materializeArtifactFile,
  removeArtifactsIndex,
  updateArtifactsIndex
} from '../../../features/projects/infrastructure/project-files.js';
import {
  getArtifactName,
  resolveTargetStageIdForArtifact,
  shouldInlinePreview
} from '../interfaces/helpers/workflow-helpers.js';

export async function loadProject(projectId) {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    const err = new Error('项目不存在');
    err.status = 404;
    throw err;
  }
  return project;
}

export async function persistGeneratedArtifact(project, normalizedStageId, artifact) {
  if (!project?.workflow || !artifact) {
    return;
  }
  const targetStageId = resolveTargetStageIdForArtifact(project, normalizedStageId, artifact.type);
  project.workflow.addArtifact(targetStageId, artifact);
  await projectRepository.save(project);
}

export async function materializeAndStoreArtifact({ project, projectId, stageId, artifact }) {
  const withFile = await materializeArtifactFile({
    project,
    stageId,
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

  const targetStageId = resolveTargetStageIdForArtifact(project, stageId, withUrls.type);
  const stage = project?.workflow?.getStage?.(targetStageId);
  const targetName = String(withUrls?.name || getArtifactName(withUrls?.type) || '').trim();
  const existing = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
  const matched = existing.filter(item => String(item?.name || '').trim() === targetName);
  for (const oldArtifact of matched) {
    const artifactId = String(oldArtifact?.id || '').trim();
    if (!artifactId) {
      continue;
    }
    const physicalDelete = await deleteArtifactPhysicalFile(project, {
      artifactId,
      relativePath: oldArtifact?.relativePath
    });
    if (!physicalDelete?.ok) {
      continue;
    }
    project.workflow.removeArtifact(targetStageId, artifactId);
    await removeArtifactsIndex(project, artifactId).catch(() => {});
  }
  await persistGeneratedArtifact(project, stageId, withUrls);
  return withUrls;
}
