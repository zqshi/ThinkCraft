/**
 * 聊天用例服务
 * 实现具体的业务用例，协调领域层和基础设施层
 */
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '../domain/chat.service.js';
import { ChatResponseDTO, MessageResponseDTO, ChatListResponseDTO } from './chat.dto.js';
import { getRepository } from '../../../shared/infrastructure/repository.factory.js';

export class ChatUseCase {
  constructor(repository = null) {
    this._repository = repository || getRepository('chat');
    this._chatService = new ChatService();
  }

  /**
   * 创建新的聊天会话
   */
  async createChat(createChatDTO, userId) {
    try {
      // 验证DTO
      createChatDTO.validate();

      const resolvedUserId = userId || createChatDTO.userId;
      if (!resolvedUserId) {
        throw new Error('用户ID不能为空');
      }

      // 生成聊天ID
      const chatId = uuidv4();

      // 创建初始消息（如果有）
      let initialMessage = null;
      if (createChatDTO.initialMessage) {
        initialMessage = {
          content: createChatDTO.initialMessage,
          type: 'text',
          sender: 'user'
        };
      }

      // 使用领域服务创建聊天
      const chat = await this._chatService.createChat(
        chatId,
        resolvedUserId,
        createChatDTO.title,
        initialMessage
      );

      // 添加标签
      for (const tag of createChatDTO.tags) {
        chat.addTag(tag);
      }

      // 保存到仓库
      await this._repository.save(chat);

      // 返回响应DTO
      return new ChatResponseDTO(chat);
    } catch (error) {
      throw new Error(`创建聊天失败: ${error.message}`);
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(addMessageDTO, userId) {
    try {
      // 验证DTO
      addMessageDTO.validate();

      // 查找聊天
      const chat = await this._repository.findById(addMessageDTO.chatId);
      if (!chat) {
        throw new Error('聊天不存在');
      }
      if (userId && chat.userId !== userId) {
        throw new Error('无权访问该聊天');
      }

      // 使用领域服务添加消息
      const message = await this._chatService.addMessageToChat(
        chat,
        addMessageDTO.content,
        addMessageDTO.type,
        addMessageDTO.sender
      );

      // 添加元数据
      if (addMessageDTO.metadata) {
        for (const [key, value] of Object.entries(addMessageDTO.metadata)) {
          message.addMetadata(key, value);
        }
      }

      // 保存更新
      await this._repository.save(chat);

      // 返回响应DTO
      return new MessageResponseDTO(message);
    } catch (error) {
      throw new Error(`发送消息失败: ${error.message}`);
    }
  }

  /**
   * 获取聊天详情
   */
  async getChat(chatId, userId) {
    try {
      const chat = await this._repository.findById(chatId);
      if (!chat) {
        throw new Error('聊天不存在');
      }
      if (userId && chat.userId !== userId) {
        throw new Error('无权访问该聊天');
      }

      return new ChatResponseDTO(chat);
    } catch (error) {
      throw new Error(`获取聊天详情失败: ${error.message}`);
    }
  }

  /**
   * 获取聊天列表
   */
  async getChatList(page = 1, pageSize = 20, filters = {}, userId) {
    try {
      let chats = [];

      // 根据筛选条件获取聊天
      if (filters.status) {
        chats = await this._repository.findByStatus(filters.status, userId);
      } else if (filters.tags && filters.tags.length > 0) {
        chats = await this._repository.findByTags(filters.tags, userId);
      } else if (filters.isPinned) {
        chats = await this._repository.findPinned(userId);
      } else if (userId) {
        chats = await this._repository.findByUserId(userId);
      } else {
        chats = await this._repository.findAll();
      }

      // 排序（按更新时间倒序）
      chats.sort((a, b) => b.updatedAt - a.updatedAt);

      // 分页
      const totalCount = chats.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedChats = chats.slice(startIndex, endIndex);

      return new ChatListResponseDTO(paginatedChats, totalCount, page, pageSize);
    } catch (error) {
      throw new Error(`获取聊天列表失败: ${error.message}`);
    }
  }

  /**
   * 更新聊天
   */
  async updateChat(chatId, updateChatDTO, userId) {
    try {
      // 验证DTO
      updateChatDTO.validate();

      // 查找聊天
      const chat = await this._repository.findById(chatId);
      if (!chat) {
        throw new Error('聊天不存在');
      }
      if (userId && chat.userId !== userId) {
        throw new Error('无权访问该聊天');
      }

      // 更新标题
      if (updateChatDTO.title !== null) {
        chat.updateTitle(updateChatDTO.title);
      }

      // 更新标题手动修改状态
      if (updateChatDTO.titleEdited !== null) {
        chat.setTitleEdited(updateChatDTO.titleEdited);
      }

      // 更新状态
      if (updateChatDTO.status !== null) {
        const { ChatStatus } = await import('../domain/chat-status.vo.js');
        chat.updateStatus(ChatStatus.create(updateChatDTO.status));
      }

      // 更新标签
      if (updateChatDTO.tags !== null) {
        // 清除现有标签
        for (const tag of [...chat.tags]) {
          chat.removeTag(tag);
        }
        // 添加新标签
        for (const tag of updateChatDTO.tags) {
          chat.addTag(tag);
        }
      }

      // 更新置顶状态
      if (updateChatDTO.isPinned !== null) {
        if (updateChatDTO.isPinned !== chat.isPinned) {
          chat.togglePin();
        }
      }

      // 更新报告状态
      if (updateChatDTO.reportState !== null) {
        chat.setReportState(updateChatDTO.reportState);
      }

      // 更新分析报告完成标记
      if (updateChatDTO.analysisCompleted !== null) {
        chat.setAnalysisCompleted(updateChatDTO.analysisCompleted);
      }

      // 更新对话步骤
      if (updateChatDTO.conversationStep !== null) {
        chat.setConversationStep(updateChatDTO.conversationStep);
      }

      // 保存更新
      await this._repository.save(chat);

      return new ChatResponseDTO(chat);
    } catch (error) {
      throw new Error(`更新聊天失败: ${error.message}`);
    }
  }

  /**
   * 删除聊天
   */
  async deleteChat(chatId, userId) {
    try {
      const chat = await this._repository.findById(chatId);
      if (!chat) {
        throw new Error('聊天不存在');
      }
      if (userId && chat.userId !== userId) {
        throw new Error('无权访问该聊天');
      }

      await this._repository.delete(chatId);
      return true;
    } catch (error) {
      throw new Error(`删除聊天失败: ${error.message}`);
    }
  }

  /**
   * 搜索聊天内容
   */
  async searchChats(keyword, userId) {
    try {
      if (!keyword || keyword.trim().length === 0) {
        throw new Error('搜索关键词不能为空');
      }

      // 获取所有聊天
      const chats = userId
        ? await this._repository.findByUserId(userId)
        : await this._repository.findAll();

      // 使用领域服务搜索
      const results = [];
      for (const chat of chats) {
        const searchResults = await this._chatService.searchInChat(chat, keyword);
        if (searchResults.length > 0) {
          results.push({
            chat: chat,
            matches: searchResults
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`搜索聊天失败: ${error.message}`);
    }
  }

  /**
   * 归档聊天
   */
  async archiveChat(chatId, userId) {
    try {
      const chat = await this._repository.findById(chatId);
      if (!chat) {
        throw new Error('聊天不存在');
      }
      if (userId && chat.userId !== userId) {
        throw new Error('无权访问该聊天');
      }

      const archivedChat = await this._chatService.archiveChat(chat);
      await this._repository.save(archivedChat);

      return new ChatResponseDTO(archivedChat);
    } catch (error) {
      throw new Error(`归档聊天失败: ${error.message}`);
    }
  }

  /**
   * 恢复聊天
   */
  async restoreChat(chatId, userId) {
    try {
      const chat = await this._repository.findById(chatId);
      if (!chat) {
        throw new Error('聊天不存在');
      }
      if (userId && chat.userId !== userId) {
        throw new Error('无权访问该聊天');
      }

      const restoredChat = await this._chatService.restoreChat(chat);
      await this._repository.save(restoredChat);

      return new ChatResponseDTO(restoredChat);
    } catch (error) {
      throw new Error(`恢复聊天失败: ${error.message}`);
    }
  }

  /**
   * 合并聊天
   */
  async mergeChats(targetChatId, sourceChatIds, userId) {
    try {
      // 查找目标聊天
      const targetChat = await this._repository.findById(targetChatId);
      if (!targetChat) {
        throw new Error('目标聊天不存在');
      }
      if (userId && targetChat.userId !== userId) {
        throw new Error('无权访问该聊天');
      }

      // 查找源聊天
      const sourceChats = [];
      for (const chatId of sourceChatIds) {
        const chat = await this._repository.findById(chatId);
        if (!chat) {
          throw new Error(`源聊天 ${chatId} 不存在`);
        }
        if (userId && chat.userId !== userId) {
          throw new Error('无权访问该聊天');
        }
        sourceChats.push(chat);
      }

      // 使用领域服务合并聊天
      const mergedChat = await this._chatService.mergeChats(targetChat, sourceChats);

      // 保存合并后的聊天
      await this._repository.save(mergedChat);

      // 删除源聊天
      for (const chatId of sourceChatIds) {
        await this._repository.delete(chatId);
      }

      return new ChatResponseDTO(mergedChat);
    } catch (error) {
      throw new Error(`合并聊天失败: ${error.message}`);
    }
  }

  /**
   * 获取聊天统计信息
   */
  async getChatStats(userId) {
    try {
      const chats = userId
        ? await this._repository.findByUserId(userId)
        : await this._repository.findAll();
      const activeChats = chats.filter(chat => !chat.status.isDeleted);
      const totalCount = activeChats.length;
      const activeCount = chats.filter(chat => chat.status.isActive).length;
      const archivedCount = chats.filter(chat => chat.status.isArchived).length;
      const pinnedCount = chats.filter(chat => chat.isPinned).length;

      let totalMessages = 0;
      for (const chat of chats) {
        totalMessages += chat.getMessageCount();
      }

      return {
        totalChats: totalCount,
        activeChats: activeCount,
        archivedChats: archivedCount,
        pinnedChats: pinnedCount,
        totalMessages: totalMessages,
        averageMessagesPerChat: totalCount > 0 ? Math.round(totalMessages / totalCount) : 0
      };
    } catch (error) {
      throw new Error(`获取聊天统计信息失败: ${error.message}`);
    }
  }
}

// 导出单例实例
export const chatUseCase = new ChatUseCase();
