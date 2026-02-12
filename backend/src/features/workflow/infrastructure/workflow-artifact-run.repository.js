import { WorkflowArtifactRunModel } from './workflow-artifact-run.model.js';

export async function createRunRecord(payload) {
  return WorkflowArtifactRunModel.create(payload);
}

export async function updateRunRecord(runId, patch = {}) {
  if (!runId) {
    return null;
  }
  return WorkflowArtifactRunModel.findOneAndUpdate(
    { runId },
    { $set: patch },
    { new: true }
  );
}

export async function recoverStaleRunningRuns({
  projectId,
  stageId,
  staleMs = 20 * 60 * 1000
}) {
  const now = Date.now();
  const staleAt = new Date(now - staleMs);
  const query = {
    projectId,
    status: 'running',
    startedAt: { $lte: staleAt }
  };
  if (stageId) {
    query.stageId = stageId;
  }
  const result = await WorkflowArtifactRunModel.updateMany(query, {
    $set: {
      status: 'failed',
      completedAt: new Date(now),
      error: {
        code: 'STALE_RUNNING_RECOVERED',
        message: '检测到历史运行记录长时间未完成，已自动恢复为失败状态'
      }
    }
  });
  return Number(result?.modifiedCount || 0);
}

export async function listRunRecords({
  projectId,
  stageId = null,
  limit = 50
}) {
  const query = { projectId };
  if (stageId) {
    query.stageId = stageId;
  }
  return WorkflowArtifactRunModel.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(200, Number(limit) || 50)))
    .lean();
}
