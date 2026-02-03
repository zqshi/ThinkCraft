/**
 * 迁移聊天消息结构（type/sender/status/updatedAt）
 * 使用方法：node scripts/migrate-chat-message-schema.js
 */
import { mongoManager } from '../config/database.js';
import { ChatModel } from '../src/features/chat/infrastructure/chat.model.js';

const validTypes = ['text', 'image', 'code', 'file', 'system'];
const validSenders = ['user', 'assistant', 'system'];
const validStatuses = ['pending', 'sent', 'delivered', 'read', 'failed'];

function normalizeMessage(msg) {
  const normalized = { ...msg };
  const now = new Date();

  const hasLegacySenderType = validSenders.includes(normalized.type) && !normalized.sender;

  if (!normalized.sender) {
    normalized.sender = hasLegacySenderType ? normalized.type : 'user';
  } else if (!validSenders.includes(normalized.sender)) {
    normalized.sender = 'user';
  }

  if (!normalized.type || !validTypes.includes(normalized.type)) {
    normalized.type = 'text';
  }

  if (!normalized.status || !validStatuses.includes(normalized.status)) {
    normalized.status = 'sent';
  }

  if (!normalized.createdAt) {
    normalized.createdAt = normalized.updatedAt || now;
  }

  if (!normalized.updatedAt) {
    normalized.updatedAt = normalized.createdAt || now;
  }

  if (!normalized.id) {
    normalized.id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  return normalized;
}

function isMessageChanged(original, normalized) {
  const keys = ['id', 'type', 'status', 'sender', 'content', 'createdAt', 'updatedAt'];
  for (const key of keys) {
    if (String(original?.[key] ?? '') !== String(normalized?.[key] ?? '')) {
      return true;
    }
  }
  if ((original?.metadata || null) !== (normalized?.metadata || null)) {
    return true;
  }
  return false;
}

async function main() {
  console.log('========================================');
  console.log('  ThinkCraft 聊天消息结构迁移');
  console.log('========================================\n');

  try {
    console.log('[Migrate] 连接MongoDB...');
    await mongoManager.connect();
    console.log('[Migrate] MongoDB连接成功\n');

    const chats = await ChatModel.find({}).lean();
    console.log(`[Migrate] 找到 ${chats.length} 个聊天会话`);

    const operations = [];
    let updatedChats = 0;
    let updatedMessages = 0;

    for (const chat of chats) {
      if (!Array.isArray(chat.messages) || chat.messages.length === 0) {
        continue;
      }

      let changed = false;
      const migratedMessages = chat.messages.map(msg => {
        const normalized = normalizeMessage(msg);
        if (!changed && isMessageChanged(msg, normalized)) {
          changed = true;
        } else if (changed && isMessageChanged(msg, normalized)) {
          // keep changed flag true
        }
        if (isMessageChanged(msg, normalized)) {
          updatedMessages += 1;
        }
        return normalized;
      });

      if (changed) {
        updatedChats += 1;
        operations.push({
          updateOne: {
            filter: { _id: chat._id },
            update: { $set: { messages: migratedMessages, updatedAt: new Date() } }
          }
        });
      }
    }

    if (operations.length > 0) {
      const result = await ChatModel.bulkWrite(operations);
      console.log('[Migrate] 写入完成:', {
        matched: result.matchedCount,
        modified: result.modifiedCount
      });
    } else {
      console.log('[Migrate] 无需更新，数据已是最新结构');
    }

    console.log(`\n[Migrate] 更新聊天数: ${updatedChats}`);
    console.log(`[Migrate] 更新消息数: ${updatedMessages}`);
    console.log('[Migrate] 迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('\n[Migrate] 迁移失败:', error);
    process.exit(1);
  } finally {
    try {
      await mongoManager.disconnect();
    } catch (error) {
      console.error('[Migrate] 断开连接失败:', error);
    }
  }
}

main();
