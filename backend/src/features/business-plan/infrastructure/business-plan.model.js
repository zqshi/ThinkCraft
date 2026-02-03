/**
 * BusinessPlan MongoDB模型
 * 商业计划书的数据库模型
 */
import mongoose from 'mongoose';

const ChapterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    content: { type: String, required: true },
    tokens: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const BusinessPlanSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'completed', 'archived', 'deleted'],
      default: 'draft'
    },
    chapters: [ChapterSchema],
    generatedBy: { type: String, required: true },
    totalTokens: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  {
    timestamps: true,
    collection: 'business_plans'
  }
);

// 索引
BusinessPlanSchema.index({ userId: 1, createdAt: -1 });
BusinessPlanSchema.index({ status: 1 });

// 中间件：更新时自动设置updatedAt
BusinessPlanSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const BusinessPlanModel = mongoose.model('BusinessPlan', BusinessPlanSchema);
