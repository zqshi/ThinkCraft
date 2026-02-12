/**
 * 分析报告MongoDB模型
 * 用于持久化存储分析报告
 */
import mongoose from 'mongoose';

const AnalysisReportSchema = new mongoose.Schema(
  {
    reportKey: { type: String, required: true, unique: true, index: true },
    chatId: { type: String, index: true, default: null },
    report: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: 'analysis_reports'
  }
);

AnalysisReportSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const AnalysisReportModel = mongoose.model('AnalysisReport', AnalysisReportSchema);
