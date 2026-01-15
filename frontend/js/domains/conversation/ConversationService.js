/**
 * ConversationService - 前端对话管理服务
 *
 * 职责：
 * 1. 与后端/api/conversations接口通信
 * 2. 管理对话状态
 * 3. 处理消息发送和接收
 * 4. 与StateManager和StorageManager集成
 */

import { apiClient } from '../core/api-client.js';

export class ConversationService {
  constructor() {
    this.stateManager = null;
    this.storageManager = null;
  }

  /**
   * 初始化Service
   * @param {Object} stateManager - 状态管理器
   * @param {Object} storageManager - 存储管理器
   */
  async init(stateManager, storageManager) {
    this.stateManager = stateManager;
    this.storageManager = storageManager;

    console.log('[ConversationService] 初始化完成');
  }

  /**
   * 创建新对话
   * @param {string} title - 对话标题
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 创建的对话
   */
  async createConversation(title, userData = {}) {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.post('/api/conversations', {
        userId,
        title,
        userData
      });

      if (response.code === 0) {
        const conversation = response.data;

        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.addChat(conversation);
          this.stateManager.conversation.setCurrentChat(conversation.id);
        }

        // 更新本地缓存
        if (this.storageManager) {
          await this.storageManager.chatRepo.save(conversation);
        }

        console.log('[ConversationService] 创建对话成功', conversation.id);
        return conversation;
      } else {
        throw new Error(response.error || '创建对话失败');
      }
    } catch (error) {
      console.error('[ConversationService] 创建对话失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的对话列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 对话列表
   */
  async getUserConversations(options = {}) {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.get(`/api/conversations/user/${userId}`, {
        params: options
      });

      if (response.code === 0) {
        const conversations = response.data;

        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.setChats(conversations);
        }

        // 更新本地缓存
        if (this.storageManager) {
          for (const conv of conversations) {
            await this.storageManager.chatRepo.save(conv);
          }
        }

        console.log('[ConversationService] 获取对话列表成功', conversations.length);
        return conversations;
      } else {
        throw new Error(response.error || '获取对话列表失败');
      }
    } catch (error) {
      console.error('[ConversationService] 获取对话列表失败:', error);

      // 降级到本地缓存
      if (this.storageManager) {
        console.log('[ConversationService] 降级使用本地缓存');
        return await this.storageManager.chatRepo.getAll();
      }

      throw error;
    }
  }

  /**
   * 获取对话详情
   * @param {string} conversationId - 对话ID
   * @param {boolean} includeMessages - 是否包含消息
   * @returns {Promise<Object>} 对话详情
   */
  async getConversation(conversationId, includeMessages = false) {
    try {
      const response = await apiClient.get(`/api/conversations/${conversationId}`, {
        params: { includeMessages: includeMessages.toString() }
      });

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.error || '获取对话详情失败');
      }
    } catch (error) {
      console.error('[ConversationService] 获取对话详情失败:', error);

      // 降级到本地缓存
      if (this.storageManager) {
        return await this.storageManager.chatRepo.get(conversationId);
      }

      throw error;
    }
  }

  /**
   * 更新对话标题
   * @param {string} conversationId - 对话ID
   * @param {string} title - 新标题
   * @returns {Promise<boolean>} 是否成功
   */
  async updateTitle(conversationId, title) {
    try {
      const response = await apiClient.put(`/api/conversations/${conversationId}/title`, {
        title
      });

      if (response.code === 0) {
        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.updateChatTitle(conversationId, title);
        }

        // 更新本地缓存
        if (this.storageManager) {
          const chat = await this.storageManager.chatRepo.get(conversationId);
          if (chat) {
            chat.title = title;
            await this.storageManager.chatRepo.save(chat);
          }
        }

        console.log('[ConversationService] 更新标题成功');
        return true;
      } else {
        throw new Error(response.error || '更新标题失败');
      }
    } catch (error) {
      console.error('[ConversationService] 更新标题失败:', error);
      throw error;
    }
  }

  /**
   * 置顶/取消置顶对话
   * @param {string} conversationId - 对话ID
   * @param {boolean} isPinned - 是否置顶
   * @returns {Promise<boolean>} 是否成功
   */
  async pinConversation(conversationId, isPinned) {
    try {
      const response = await apiClient.put(`/api/conversations/${conversationId}/pin`, {
        isPinned
      });

      if (response.code === 0) {
        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.updateChatPin(conversationId, isPinned);
        }

        // 更新本地缓存
        if (this.storageManager) {
          const chat = await this.storageManager.chatRepo.get(conversationId);
          if (chat) {
            chat.isPinned = isPinned;
            await this.storageManager.chatRepo.save(chat);
          }
        }

        console.log('[ConversationService] 置顶状态更新成功');
        return true;
      } else {
        throw new Error(response.error || '置顶失败');
      }
    } catch (error) {
      console.error('[ConversationService] 置顶失败:', error);
      throw error;
    }
  }

  /**
   * 删除对话
   * @param {string} conversationId - 对话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteConversation(conversationId) {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.delete(`/api/conversations/${conversationId}`, {
        data: { userId }
      });

      if (response.code === 0) {
        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.removeChat(conversationId);
        }

        // 删除本地缓存
        if (this.storageManager) {
          await this.storageManager.chatRepo.delete(conversationId);
        }

        console.log('[ConversationService] 删除对话成功');
        return true;
      } else {
        throw new Error(response.error || '删除对话失败');
      }
    } catch (error) {
      console.error('[ConversationService] 删除对话失败:', error);
      throw error;
    }
  }

  /**
   * 发送消息并获取AI回复
   * @param {string} conversationId - 对话ID
   * @param {string} message - 用户消息
   * @param {Object} options - 选项
   * @returns {Promise<Object>} {userMsg, assistantMsg}
   */
  async sendMessage(conversationId, message, options = {}) {
    try {
      const response = await apiClient.post(`/api/conversations/${conversationId}/send`, {
        message,
        options
      });

      if (response.code === 0) {
        const { userMsg, assistantMsg } = response.data;

        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.addMessage(conversationId, userMsg);
          this.stateManager.conversation.addMessage(conversationId, assistantMsg);
        }

        // 更新本地缓存
        if (this.storageManager) {
          await this.storageManager.messageRepo.save(conversationId, userMsg);
          await this.storageManager.messageRepo.save(conversationId, assistantMsg);
        }

        console.log('[ConversationService] 发送消息成功');
        return { userMsg, assistantMsg };
      } else {
        throw new Error(response.error || '发送消息失败');
      }
    } catch (error) {
      console.error('[ConversationService] 发送消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取对话的消息历史
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Array>} 消息列表
   */
  async getMessages(conversationId) {
    try {
      const response = await apiClient.get(`/api/conversations/${conversationId}/messages`);

      if (response.code === 0) {
        const messages = response.data;

        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.setMessages(conversationId, messages);
        }

        // 更新本地缓存
        if (this.storageManager) {
          for (const msg of messages) {
            await this.storageManager.messageRepo.save(conversationId, msg);
          }
        }

        console.log('[ConversationService] 获取消息历史成功', messages.length);
        return messages;
      } else {
        throw new Error(response.error || '获取消息历史失败');
      }
    } catch (error) {
      console.error('[ConversationService] 获取消息历史失败:', error);

      // 降级到本地缓存
      if (this.storageManager) {
        return await this.storageManager.messageRepo.getAll(conversationId);
      }

      throw error;
    }
  }

  /**
   * 添加消息到对话
   * @param {string} conversationId - 对话ID
   * @param {string} role - 消息角色
   * @param {string} content - 消息内容
   * @returns {Promise<Object>} 创建的消息
   */
  async addMessage(conversationId, role, content) {
    try {
      const response = await apiClient.post(`/api/conversations/${conversationId}/messages`, {
        role,
        content
      });

      if (response.code === 0) {
        const message = response.data;

        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.addMessage(conversationId, message);
        }

        // 更新本地缓存
        if (this.storageManager) {
          await this.storageManager.messageRepo.save(conversationId, message);
        }

        return message;
      } else {
        throw new Error(response.error || '添加消息失败');
      }
    } catch (error) {
      console.error('[ConversationService] 添加消息失败:', error);
      throw error;
    }
  }

  /**
   * 推进对话步骤
   * @param {string} conversationId - 对话ID
   * @returns {Promise<number>} 新的步骤数
   */
  async advanceStep(conversationId) {
    try {
      const response = await apiClient.put(`/api/conversations/${conversationId}/step`);

      if (response.code === 0) {
        const { step } = response.data;

        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.setConversationStep(step);
        }

        return step;
      } else {
        throw new Error(response.error || '推进步骤失败');
      }
    } catch (error) {
      console.error('[ConversationService] 推进步骤失败:', error);
      throw error;
    }
  }

  /**
   * 标记分析完成
   * @param {string} conversationId - 对话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async markAnalysisCompleted(conversationId) {
    try {
      const response = await apiClient.put(`/api/conversations/${conversationId}/analysis-complete`);

      if (response.code === 0) {
        // 更新本地状态
        if (this.stateManager) {
          this.stateManager.conversation.setAnalysisCompleted(true);
        }

        return true;
      } else {
        throw new Error(response.error || '标记分析完成失败');
      }
    } catch (error) {
      console.error('[ConversationService] 标记分析完成失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前用户ID
   * @private
   * @returns {string} 用户ID
   */
  _getCurrentUserId() {
    // 从localStorage获取用户ID
    const username = localStorage.getItem('thinkcraft_username') || 'default_user';
    return `user_${username}`;
  }
}

// 创建单例实例
export const conversationService = new ConversationService();

export default ConversationService;
