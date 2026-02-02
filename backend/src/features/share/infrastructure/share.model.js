/**
 * Share MongoDB 模型
 */
import mongoose from 'mongoose';

const ShareSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    resourceId: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    shareLink: { type: String, required: true, unique: true, index: true },
    permission: { type: String, required: true },
    status: { type: String, required: true },
    expiresAt: { type: Date },
    password: { type: String },
    accessCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
    createdBy: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    collection: 'shares'
  }
);

export const ShareModel = mongoose.model('Share', ShareSchema);
