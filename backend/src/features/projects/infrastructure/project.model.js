/**
 * Project MongoDB模型
 * 项目实体的数据库模型
 */
import mongoose from 'mongoose';

const WorkflowStageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    orderNumber: { type: Number },
    description: { type: String },
    status: { type: String, required: true },
    agents: { type: [String], default: [] },
    agentRoles: { type: [mongoose.Schema.Types.Mixed], default: [] },
    dependencies: { type: [String], default: [] },
    priority: { type: String },
    outputs: { type: [String], default: [] },
    outputsDetailed: { type: [mongoose.Schema.Types.Mixed], default: [] },
    artifacts: [
      {
        id: String,
        stageId: String,
        projectId: String,
        type: String,
        name: String,
        content: mongoose.Schema.Types.Mixed,
        agentName: String,
        source: String,
        tokens: Number,
        createdAt: Date,
        fileName: String,
        relativePath: String,
        fileSize: Number,
        downloadUrl: String,
        previewUrl: String
      }
    ],
    startedAt: Date,
    completedAt: Date
  },
  { _id: false }
);

const WorkflowSchema = new mongoose.Schema(
  {
    stages: {
      type: [WorkflowStageSchema],
      default: [],
      set: value => {
        if (!value) {
          return [];
        }
        return Array.isArray(value) ? value : [value];
      }
    },
    currentStage: String,
    isCustomized: { type: Boolean, default: false }
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    ideaId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    mode: { type: String, required: true, enum: ['development'] },
    workflowCategory: { type: String, default: 'product-development' },
    assignedAgents: { type: [String], default: [] },
    collaborationSuggestion: { type: mongoose.Schema.Types.Mixed, default: null },
    collaborationExecuted: { type: Boolean, default: false },
    missingRecommendedAgents: { type: [String], default: [] },
    artifactRoot: { type: String, default: null },
    status: {
      type: String,
      required: true,
      enum: ['planning', 'in_progress', 'completed', 'archived', 'deleted'],
      default: 'planning'
    },
    workflow: WorkflowSchema,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: 'projects'
  }
);

// 索引
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index(
  { ideaId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'deleted' } } }
);
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ mode: 1 });

// 中间件：更新时自动设置updatedAt
ProjectSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const ProjectModel = mongoose.model('Project', ProjectSchema);
