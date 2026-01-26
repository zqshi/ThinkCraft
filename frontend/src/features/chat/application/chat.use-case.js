/**
 * 聊天用例
 * 实现用户与AI的对话交互
 */
import { chatApiService } from '../infrastructure/chat-api.service.js';
import { chatStorageService } from '../infrastructure/chat-storage.service.js';
import { chatEventHandler } from '../infrastructure/chat-event.handler.js';
import { MessageFactory, MessageType } from '../domain/index.js';
import { eventBus } from '../../../shared/infrastructure/event-bus.js';

export class ChatUseCase {
  constructor() {
    this.isTyping = false;
    this.typingDelay = 50; // 每个字符的打字延迟（毫秒）
    this.currentResponse = null;
    this.eventSource = null;
  }

  /**
   * 获取聊天列表
   */
  async getChats(projectId) {
    try {
      // 先从缓存获取
      const cachedChats = chatStorageService.getCachedMessages('chats');
      if (cachedChats) {
        return cachedChats;
      }

      // 从API获取
      const chats = await chatApiService.getChats(projectId);

      // 缓存结果
      chatStorageService.cacheMessages('chats', chats);

      return chats;
    } catch (error) {
      console.error('[ChatUseCase] 获取聊天列表失败:', error);
      throw new Error('无法获取聊天列表');
    }
  }

  /**
   * 创建新聊天
   */
  async createChat(projectId, title) {
    try {
      const chat = await chatApiService.createChat(projectId, title);

      // 清除缓存
      chatStorageService.clearMessageCache('chats');

      // 触发事件
      chatEventHandler.emit('chat:created', chat);

      return chat;
    } catch (error) {
      console.error('[ChatUseCase] 创建聊天失败:', error);
      throw new Error('无法创建聊天');
    }
  }

  /**
   * 获取聊天详情
   */
  async getChat(chatId) {
    try {
      return await chatApiService.getChat(chatId);
    } catch (error) {
      console.error('[ChatUseCase] 获取聊天详情失败:', error);
      throw new Error('无法获取聊天详情');
    }
  }

  /**
   * 获取消息列表
   */
  async getMessages(chatId, limit = 50, offset = 0) {
    try {
      // 先从缓存获取
      const cachedMessages = chatStorageService.getCachedMessages(chatId);
      if (cachedMessages) {
        return cachedMessages;
      }

      // 从API获取
      const messages = await chatApiService.getMessages(chatId, limit, offset);

      // 缓存结果
      chatStorageService.cacheMessages(chatId, messages);

      return messages;
    } catch (error) {
      console.error('[ChatUseCase] 获取消息失败:', error);
      throw new Error('无法获取消息');
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId, content, type = 'text') {
    try {
      // 创建本地消息
      const localMessage = MessageFactory.create({
        chatId,
        content,
        type,
        sender: 'user',
        status: 'sending'
      });

      // 立即显示消息（乐观更新）
      chatEventHandler.emit('chat:messageAdded', {
        chatId,
        message: localMessage
      });

      // 发送消息到API
      const sentMessage = await chatApiService.sendMessage(chatId, content, type);

      // 清除缓存
      chatStorageService.clearMessageCache(chatId);

      // 触发事件
      chatEventHandler.emit('chat:messageSent', {
        chatId,
        message: sentMessage
      });

      return sentMessage;
    } catch (error) {
      console.error('[ChatUseCase] 发送消息失败:', error);

      // 更新消息状态为失败
      chatEventHandler.emit('chat:messageFailed', {
        chatId,
        message: localMessage
      });

      throw new Error('无法发送消息');
    }
  }

  /**
   * 流式接收消息
   */
  streamMessages(chatId, onMessage, onError) {
    return chatApiService.streamMessages(chatId, onMessage, onError);
  }

  /**
   * 更新聊天状态
   */
  async updateChatStatus(chatId, status) {
    try {
      await chatApiService.updateChatStatus(chatId, status);

      // 触发事件
      chatEventHandler.emit('chat:statusChanged', {
        chatId,
        newStatus: status
      });
    } catch (error) {
      console.error('[ChatUseCase] 更新聊天状态失败:', error);
      throw new Error('无法更新聊天状态');
    }
  }

  /**
   * 删除聊天
   */
  async deleteChat(chatId) {
    try {
      await chatApiService.deleteChat(chatId);

      // 清除缓存
      chatStorageService.clearMessageCache(chatId);
      chatStorageService.clearMessageCache('chats');

      // 触发事件
      chatEventHandler.emit('chat:deleted', { chatId });
    } catch (error) {
      console.error('[ChatUseCase] 删除聊天失败:', error);
      throw new Error('无法删除聊天');
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(chatId, file) {
    try {
      return await chatApiService.uploadFile(chatId, file);
    } catch (error) {
      console.error('[ChatUseCase] 上传文件失败:', error);
      throw new Error('无法上传文件');
    }
  }

  /**
   * 保存草稿
   */
  saveDraft(chatId, content) {
    chatStorageService.saveDraft(chatId, content);
  }

  /**
   * 获取草稿
   */
  getDraft(chatId) {
    return chatStorageService.getDraft(chatId);
  }

  /**
   * 删除草稿
   */
  deleteDraft(chatId) {
    chatStorageService.deleteDraft(chatId);
  }

  /**
   * 保存活跃的聊天ID
   */
  setActiveChat(chatId) {
    chatStorageService.setActiveChatId(chatId);
  }

  /**
   * 获取活跃的聊天ID
   */
  getActiveChat() {
    return chatStorageService.getActiveChatId();
  }

  /**
   * 清除活跃的聊天
   */
  clearActiveChat() {
    chatStorageService.clearActiveChat();
  }

  /**
   * 保存偏好设置
   */
  savePreferences(preferences) {
    chatStorageService.savePreferences(preferences);
  }

  /**
   * 获取偏好设置
   */
  getPreferences() {
    return chatStorageService.getPreferences();
  }

  /**
   * 开始新聊天（带欢迎消息）
   */
  async startNewChat(projectId, title = null) {
    try {
      // 如果没有提供标题，使用默认标题
      if (!title) {
        title = '新聊天';
      }

      // 创建新聊天
      const chat = await this.createChat(projectId, title);

      // 添加欢迎消息
      const welcomeMessage = MessageFactory.create({
        chatId: chat.id,
        content: '欢迎使用ThinkCraft！我是您的AI助手，有什么可以帮助您的吗？',
        type: 'system',
        sender: 'system'
      });

      // 保存欢迎消息
      await this.sendMessage(chat.id, welcomeMessage.content, welcomeMessage.type);

      return chat;
    } catch (error) {
      console.error('[ChatUseCase] 开始新聊天失败:', error);
      throw new Error('无法创建新聊天');
    }
  }

  /**
   * 选择聊天
   */
  async selectChat(chatId) {
    try {
      // 获取聊天详情
      const chat = await this.getChat(chatId);

      // 设置为活跃聊天
      this.setActiveChat(chatId);

      // 标记为已读（清除未读计数）
      if (chat.unreadCount > 0) {
        chat.unreadCount = 0;
      }

      return chat;
    } catch (error) {
      console.error('[ChatUseCase] 选择聊天失败:', error);
      throw error;
    }
  }

  /**
   * 发送消息并获取AI回复（高级方法）
   */
  async sendMessageAndGetReply(content, options = {}) {
    try {
      // 确保有当前聊天
      let chatId = this.getActiveChat();
      if (!chatId) {
        const newChat = await this.startNewChat(options.projectId);
        chatId = newChat.id;
      }

      // 发送用户消息
      await this.sendMessage(chatId, content, options.type || 'text');

      // 显示思考中状态
      chatEventHandler.emit('ai:thinking', { chatId });

      // 模拟AI思考时间
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 生成AI回复（这里应该调用实际的AI服务）
      const aiReply = await this.generateAIReply(content, chatId, options);

      // 发送AI回复
      const aiMessage = await this.sendMessage(chatId, aiReply.content, aiReply.type || 'text');

      // 清除思考状态
      chatEventHandler.emit('ai:replyComplete', { chatId });

      return aiMessage;
    } catch (error) {
      console.error('[ChatUseCase] 发送消息并获取回复失败:', error);

      // 显示错误消息
      chatEventHandler.emit('ai:error', {
        error: error.message || '消息发送失败，请重试'
      });

      throw new Error('无法获取AI回复');
    }
  }

  /**
   * 生成AI回复（模拟实现）
   */
  async generateAIReply(content, chatId, options) {
    // 模拟AI处理时间
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 根据内容生成智能回复
    let reply;

    if (content.toLowerCase().includes('项目')) {
      reply = {
        content: `我理解您想要讨论项目相关的内容。作为AI助手，我可以帮助您：

1. **项目规划** - 制定详细的项目计划和时间表
2. **技术选型** - 根据需求推荐合适的技术栈
3. **架构设计** - 设计系统架构和模块划分
4. **代码生成** - 生成初始代码结构

请告诉我您的具体需求，比如项目类型、主要功能或技术偏好。`,
        type: 'text',
        metadata: {
          suggestions: [
            '我想创建一个Web应用项目',
            '帮我规划一个API服务',
            '生成一个Demo原型',
            '技术选型建议'
          ]
        }
      };
    } else if (content.toLowerCase().includes('代码') || content.toLowerCase().includes('demo')) {
      reply = {
        content: `我可以帮您生成代码示例。以下是一个简单的JavaScript函数：

\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}

// 使用示例
console.log(greet('ThinkCraft'));
\`\`\`

您需要什么样的代码？请告诉我：
- 编程语言（JavaScript、Python、Java等）
- 功能需求
- 使用场景`,
        type: 'text',
        metadata: {
          language: 'javascript',
          isCode: true
        }
      };
    } else {
      reply = {
        content: `感谢您的消息！我已经收到了您的内容："${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"

作为您的AI助手，我可以帮助您：

💡 **创新想法** - 头脑风暴，提出新的创意
📝 **项目规划** - 制定详细的项目计划
🚀 **代码生成** - 创建各种语言的代码示例
🔄 **迭代优化** - 改进和完善您的项目

请告诉我您下一步想要做什么？`,
        type: 'text',
        metadata: {
          suggestions: ['帮我规划一个项目', '生成代码示例', '头脑风暴', '优化我的创意']
        }
      };
    }

    return reply;
  }

  /**
   * 导出聊天记录
   */
  async exportChat(chatId, format = 'json') {
    try {
      const messages = await this.getMessages(chatId);
      const chat = await this.getChat(chatId);

      const exportData = {
        chat,
        messages,
        exportTime: new Date().toISOString()
      };

      let content;
      let mimeType;
      const fileName = `${chat.title || '聊天记录'}_${new Date().toISOString().slice(0, 10)}.${format}`;

      switch (format) {
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        break;
      case 'txt':
        content = this.formatChatAsText(exportData);
        mimeType = 'text/plain';
        break;
      case 'md':
        content = this.formatChatAsMarkdown(exportData);
        mimeType = 'text/markdown';
        break;
      default:
        throw new Error('不支持的导出格式');
      }

      // 创建并下载文件
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      return { success: true, fileName };
    } catch (error) {
      console.error('[ChatUseCase] 导出聊天失败:', error);
      throw new Error('无法导出聊天记录');
    }
  }

  /**
   * 格式化为纯文本
   */
  formatChatAsText(data) {
    let text = `聊天记录：${data.chat.title}\n`;
    text += `导出时间：${data.exportTime}\n`;
    text += '---\n\n';

    data.messages.forEach(msg => {
      const sender = msg.sender === 'user' ? '用户' : msg.sender === 'system' ? '系统' : 'AI';
      const time = new Date(msg.createdAt).toLocaleString();
      text += `[${time}] ${sender}:\n${msg.content}\n\n`;
    });

    return text;
  }

  /**
   * 格式化为Markdown
   */
  formatChatAsMarkdown(data) {
    let md = `# 聊天记录：${data.chat.title}\n\n`;
    md += `**导出时间：** ${data.exportTime}\n\n`;
    md += '---\n\n';

    data.messages.forEach(msg => {
      const sender =
        msg.sender === 'user' ? '**用户**' : msg.sender === 'system' ? '**系统**' : '**AI**';
      const time = new Date(msg.createdAt).toLocaleString();
      md += `### ${sender} - ${time}\n\n`;

      if (msg.type === 'code') {
        md += '```\n' + msg.content + '\n```\n\n';
      } else {
        md += msg.content + '\n\n';
      }
    });

    return md;
  }
}

// 创建用例实例
export const chatUseCase = new ChatUseCase();
