import mongoose from 'mongoose';

const WorkflowArtifactRunSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    stageId: { type: String, required: true, index: true },
    artifactType: { type: String, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'running', 'succeeded', 'failed', 'blocked']
    },
    dependencySnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    contextDigest: { type: mongoose.Schema.Types.Mixed, default: null },
    modelRequestMeta: { type: mongoose.Schema.Types.Mixed, default: null },
    reactTrace: { type: mongoose.Schema.Types.Mixed, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: mongoose.Schema.Types.Mixed, default: null },
    retryCount: { type: Number, default: 0 },
    queuedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    blockedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    collection: 'workflow_artifact_runs'
  }
);

WorkflowArtifactRunSchema.index({ projectId: 1, stageId: 1, artifactType: 1, createdAt: -1 });

export const WorkflowArtifactRunModel = mongoose.model(
  'WorkflowArtifactRun',
  WorkflowArtifactRunSchema
);
