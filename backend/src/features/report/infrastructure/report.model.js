/**
 * Report MongoDB 模型
 */
import mongoose from 'mongoose';

const ReportSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    order: { type: Number, required: true },
    type: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    projectId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    status: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    sections: { type: [ReportSectionSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    completedAt: { type: Date },
    version: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    collection: 'reports'
  }
);

export const ReportModel = mongoose.model('Report', ReportSchema);
