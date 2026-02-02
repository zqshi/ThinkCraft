/**
 * 聊天应用服务
 * 实现聊天相关的业务用例
 */
import { Chat, ChatFactory, MessageFactory, MessageContent, MessageType } from '../domain/index.js';
import { localStorageService } from '../../../shared/infrastructure/storage.service.js';
import { eventBus } from '../../../shared/infrastructure/event-bus.js';

export class ChatService {
  constructor() {
    this.currentChat = null;
    this.chats = new Map();
    this.storageKey = 'thinkcraft_chats';
    this.loadChatsFromStorage();
  }

  /**
   * 创建新聊天
   */
  async createChat(title = '新聊天', initialMessage = null) {
    const chat = ChatFactory.createNew(title, initialMessage);

    // 保存聊天
    this.chats.set(chat.id.value, chat);
    this.setCurrentChat(chat);

    // 保存到本地存储
    this.saveChatsToStorage();

    // 发布事件
    eventBus.emit('chat:created', { chat });

    return chat;
  }

  /**
   * 从JSON创建聊天
   */
  createChatFromJSON(chatData) {
    const chat = ChatFactory.createFromJSON(chatData);
    this.chats.set(chat.id.value, chat);
    return chat;
  }

  /**
   * 获取当前聊天
   */
  getCurrentChat() {
    return this.currentChat;
  }

  /**
   * 设置当前聊天
   */
  setCurrentChat(chat) {
    this.currentChat = chat;
    eventBus.emit('chat:currentChanged', { chat });
  }

  /**
   * 发送消息
   */
  async sendMessage(content, type = MessageType.TEXT, senderId = null) {
    if (!this.currentChat) {
      // 如果没有当前聊天，创建一个新的
      await this.createChat();
    }

    // 创建用户消息
    const message = MessageFactory.createText(this.currentChat.id, content, senderId);

    // 添加消息到聊天
    this.currentChat.addMessage(content, type, senderId);

    // 保存到本地存储
    this.saveChatsToStorage();

    // 发布事件
    eventBus.emit('message:sent', {
      chat: this.currentChat,
      message: message
    });

    return message;
  }

  /**
   * 接收消息
   */
  async receiveMessage(content, type = MessageType.TEXT, senderId = null, metadata = {}) {
    if (!this.currentChat) {
      // 如果没有当前聊天，创建一个新的
      await this.createChat();
    }

    // 获取或生成消息ID
    const messageId = metadata.id || MessageId.generate().value;

    // 创建接收消息
    const message = MessageFactory.createFromResponse(
      this.currentChat.id,
      {
        id: messageId,
        content: content,
        type: type instanceof MessageType ? type.value : type,
        metadata: metadata
      },
      senderId
    );

    // 添加消息到聊天
    this.currentChat.addMessage(content, type, senderId);

    // 保存到本地存储
    this.saveChatsToStorage();

    // 发布事件
    eventBus.emit('message:received', {
      chat: this.currentChat,
      message: message
    });

    return message;
  }

  /**
   * 更新消息状态
   */
  async updateMessageStatus(messageId, status) {
    if (!this.currentChat) {
      return;
    }

    const message = this.currentChat.messages.find(m => m.id.value === messageId);
    if (message) {
      message.updateStatus(status);
      this.saveChatsToStorage();

      eventBus.emit('message:statusChanged', {
        chat: this.currentChat,
        message,
        status
      });
    }
  }

  /**
   * 获取聊天历史
   */
  getChatHistory(chatId) {
    const chat = this.chats.get(chatId);
    return chat ? chat.messages : [];
  }

  /**
   * 获取所有聊天
   */
  getAllChats() {
    return Array.from(this.chats.values());
  }

  /**
   * 获取聊天记录
   */
  getChatList() {
    return this.getAllChats()
      .filter(chat => !chat.isDeleted)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * 删除聊天
   */
  async deleteChat(chatId) {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.delete();

      // 如果删除的是当前聊天，清空当前聊天
      if (this.currentChat && this.currentChat.id.value === chatId) {
        this.currentChat = null;
      }

      this.saveChatsToStorage();

      eventBus.emit('chat:deleted', { chatId });
      return true;
    }
    return false;
  }

  /**
   * 归档聊天
   */
  async archiveChat(chatId) {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.archive();
      this.saveChatsToStorage();

      eventBus.emit('chat:archived', { chat });
      return true;
    }
    return false;
  }

  /**
   * 清空聊天
   */
  async clearChat(chatId) {
    const chat = this.chats.get(chatId);
    if (chat) {
      // 创建新聊天替换旧聊天
      const newChat = ChatFactory.createNew(
        chat.title.value,
        MessageFactory.createSystem(chat.id, '聊天已清空')
      );

      this.chats.set(chatId, newChat);

      if (this.currentChat && this.currentChat.id.value === chatId) {
        this.setCurrentChat(newChat);
      }

      this.saveChatsToStorage();

      eventBus.emit('chat:cleared', { chatId });
      return true;
    }
    return false;
  }

  /**
   * 重命名聊天
   */
  async renameChat(chatId, newTitle) {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.updateTitle(newTitle);
      this.saveChatsToStorage();

      eventBus.emit('chat:renamed', { chat, newTitle });
      return true;
    }
    return false;
  }

  /**
   * 生成聊天标题
   */
  generateChatTitle(messages) {
    if (!messages || messages.length === 0) {
      return '新聊天';
    }

    // 使用第一条用户消息的前50个字符作为标题
    const firstUserMessage = messages.find(m => m.isUser);
    if (firstUserMessage) {
      const content = firstUserMessage.content.value;
      return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }

    // 如果没有用户消息，使用第一条消息
    const firstMessage = messages[0];
    const content = firstMessage.content.value;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }

  /**
   * 自动更新聊天标题
   */
  async autoUpdateChatTitle(chatId) {
    const chat = this.chats.get(chatId);
    if (chat && chat.messages.length > 1) {
      const newTitle = this.generateChatTitle(chat.messages);
      if (newTitle !== chat.title.value) {
        await this.renameChat(chatId, newTitle);
      }
    }
  }

  /**
   * 保存聊天到本地存储
   */
  saveChatsToStorage() {
    const chatsData = Array.from(this.chats.values()).map(chat => chat.toJSON());
    localStorageService.set('chats', chatsData);
  }

  /**
   * 从本地存储加载聊天
   */
  loadChatsFromStorage() {
    const chatsData = localStorageService.get('chats', []);
    chatsData.forEach(chatData => {
      try {
        const chat = ChatFactory.createFromJSON(chatData);
        this.chats.set(chat.id.value, chat);
      } catch (error) {
        console.error('加载聊天数据失败:', error);
      }
    });
  }

  /**
   * 导出聊天数据
   */
  exportChatData(chatId) {
    const chat = this.chats.get(chatId);
    if (!chat) {
      return null;
    }

    return {
      chat: chat.toJSON(),
      exportTime: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * 导入聊天数据
   */
  importChatData(data) {
    if (!data || !data.chat) {
      return false;
    }

    try {
      const chat = ChatFactory.createFromJSON(data.chat);
      this.chats.set(chat.id.value, chat);

      // 如果当前没有活跃的聊天，设置为当前聊天
      if (!this.currentChat) {
        this.setCurrentChat(chat);
      }

      this.saveChatsToStorage();

      eventBus.emit('chat:imported', { chat });
      return true;
    } catch (error) {
      console.error('导入聊天数据失败:', error);
      return false;
    }
  }

  /**
   * 搜索聊天
   */
  searchChats(query) {
    const lowerQuery = query.toLowerCase();
    return this.getAllChats().filter(chat => {
      // 搜索标题
      if (chat.title.value.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // 搜索消息内容
      return chat.messages.some(message =>
        message.content.value.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 获取未读消息数量
   */
  getUnreadCount(chatId) {
    const chat = this.chats.get(chatId);
    if (!chat) {
      return 0;
    }

    return chat.messages.filter(m => !m.isUser && !m.status.isRead()).length;
  }

  /**
   * 获取总未读消息数量
   */
  getTotalUnreadCount() {
    return this.getAllChats().reduce(
      (total, chat) => total + this.getUnreadCount(chat.id.value),
      0
    );
  }

  /**
   * 标记所有消息为已读
   */
  markAllAsRead(chatId) {
    const chat = this.chats.get(chatId);
    if (!chat) {
      return;
    }

    chat.messages.forEach(message => {
      if (!message.isUser) {
        message.markAsRead();
      }
    });

    this.saveChatsToStorage();
    eventBus.emit('chat:allMarkedRead', { chatId });
  }
}

// 创建聊天服务实例
export const chatService = new ChatService();

// 导入缺失的依赖
import { MessageId } from '../domain/value-objects/message-id.vo.js';
