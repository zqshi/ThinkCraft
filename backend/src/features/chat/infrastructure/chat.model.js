/**
 * Chat MongoDB模型
 * 聊天会话的数据库模型
 */
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true, enum: ['text', 'image', 'code', 'file', 'system'] },
    content: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    sender: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system'],
      default: 'user'
    },
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ChatSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    titleEdited: { type: Boolean, default: false },
    status: {
      type: String,
      required: true,
      enum: ['active', 'archived', 'deleted'],
      default: 'active'
    },
    messages: [MessageSchema],
    tags: [{ type: String }],
    isPinned: { type: Boolean, default: false },
    analysisCompleted: { type: Boolean, default: false },
    conversationStep: { type: Number, default: 0 },
    reportState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: 'chats'
  }
);

// 索引
ChatSchema.index({ userId: 1, createdAt: -1 });
ChatSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });
ChatSchema.index({ status: 1 });
ChatSchema.index({ tags: 1 });

// 中间件：更新时自动设置updatedAt
ChatSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const ChatModel = mongoose.model('Chat', ChatSchema);
