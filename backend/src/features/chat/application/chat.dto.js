/**
 * 聊天DTO（数据传输对象）
 * 用于应用层和接口层之间的数据传输
 */

/**
 * 创建聊天DTO
 */
export class CreateChatDTO {
  constructor(data) {
    this.title = data.title || '';
    this.initialMessage = data.initialMessage || null;
    this.tags = data.tags || [];
    this.userId = data.userId || null;
  }

  validate() {
    if (!this.title || typeof this.title !== 'string') {
      throw new Error('聊天标题不能为空且必须是字符串');
    }

    if (this.title.length > 200) {
      throw new Error('聊天标题不能超过200个字符');
    }

    if (this.initialMessage && typeof this.initialMessage !== 'string') {
      throw new Error('初始消息必须是字符串');
    }

    if (!Array.isArray(this.tags)) {
      throw new Error('标签必须是数组');
    }

    if (this.userId && typeof this.userId !== 'string') {
      throw new Error('用户ID必须是字符串');
    }
  }
}

/**
 * 添加消息DTO
 */
export class AddMessageDTO {
  constructor(data) {
    this.chatId = data.chatId;
    this.content = data.content;
    this.type = data.type || 'text';
    this.sender = data.sender || 'user';
    this.metadata = data.metadata || {};
  }

  validate() {
    if (!this.chatId || typeof this.chatId !== 'string') {
      throw new Error('聊天ID不能为空且必须是字符串');
    }

    if (!this.content || typeof this.content !== 'string') {
      throw new Error('消息内容不能为空且必须是字符串');
    }

    if (this.content.length > 10000) {
      throw new Error('消息内容不能超过10000个字符');
    }

    const validTypes = ['text', 'image', 'code', 'file', 'system'];
    if (!validTypes.includes(this.type)) {
      throw new Error(`消息类型必须是以下值之一: ${validTypes.join(', ')}`);
    }

    const validSenders = ['user', 'assistant', 'system'];
    if (!validSenders.includes(this.sender)) {
      throw new Error(`发送者必须是以下值之一: ${validSenders.join(', ')}`);
    }

    if (typeof this.metadata !== 'object' || Array.isArray(this.metadata)) {
      throw new Error('元数据必须是对象');
    }
  }
}

/**
 * 更新聊天DTO
 */
export class UpdateChatDTO {
  constructor(data) {
    this.title = data.title || null;
    this.titleEdited = data.titleEdited !== undefined ? data.titleEdited : null;
    this.status = data.status || null;
    this.tags = data.tags || null;
    this.isPinned = data.isPinned !== undefined ? data.isPinned : null;
    this.reportState = data.reportState !== undefined ? data.reportState : null;
    this.analysisCompleted = data.analysisCompleted !== undefined ? data.analysisCompleted : null;
    this.conversationStep = data.conversationStep !== undefined ? data.conversationStep : null;
  }

  validate() {
    if (this.title !== null) {
      if (typeof this.title !== 'string') {
        throw new Error('聊天标题必须是字符串');
      }
      if (this.title.length > 200) {
        throw new Error('聊天标题不能超过200个字符');
      }
    }

    if (this.titleEdited !== null && typeof this.titleEdited !== 'boolean') {
      throw new Error('titleEdited必须是布尔值');
    }

    if (this.status !== null) {
      const validStatuses = ['active', 'archived', 'deleted'];
      if (!validStatuses.includes(this.status)) {
        throw new Error(`聊天状态必须是以下值之一: ${validStatuses.join(', ')}`);
      }
    }

    if (this.tags !== null && !Array.isArray(this.tags)) {
      throw new Error('标签必须是数组');
    }

    if (this.isPinned !== null && typeof this.isPinned !== 'boolean') {
      throw new Error('置顶状态必须是布尔值');
    }

    if (this.reportState !== null && (typeof this.reportState !== 'object' || Array.isArray(this.reportState))) {
      throw new Error('报告状态必须是对象');
    }

    if (this.analysisCompleted !== null && typeof this.analysisCompleted !== 'boolean') {
      throw new Error('analysisCompleted必须是布尔值');
    }

    if (this.conversationStep !== null && (typeof this.conversationStep !== 'number' || Number.isNaN(this.conversationStep) || this.conversationStep < 0)) {
      throw new Error('conversationStep必须是非负数字');
    }
  }
}

/**
 * 聊天响应DTO
 */
export class ChatResponseDTO {
  constructor(chat) {
    this.id = chat.id;
    this.title = chat.title;
    this.titleEdited = !!chat.titleEdited;
    this.status = chat.status.value;
    this.messages = chat.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.type.value,
      status: msg.status.value,
      sender: msg.sender,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));
    this.tags = chat.tags;
    this.isPinned = chat.isPinned;
    this.reportState = chat.reportState || null;
    this.analysisCompleted = !!chat.analysisCompleted;
    this.conversationStep = Number.isFinite(chat.conversationStep) ? chat.conversationStep : 0;
    this.messageCount = chat.getMessageCount();
    this.lastMessage = chat.getLastMessage()
      ? {
        id: chat.getLastMessage().id,
        content: chat.getLastMessage().content,
        type: chat.getLastMessage().type.value,
        sender: chat.getLastMessage().sender,
        createdAt: chat.getLastMessage().createdAt
      }
      : null;
    this.createdAt = chat.createdAt;
    this.updatedAt = chat.updatedAt;
  }
}

/**
 * 消息响应DTO
 */
export class MessageResponseDTO {
  constructor(message) {
    this.id = message.id;
    this.content = message.content;
    this.type = message.type.value;
    this.status = message.status.value;
    this.sender = message.sender;
    this.metadata = message.metadata;
    this.createdAt = message.createdAt;
    this.updatedAt = message.updatedAt;
    this.isAIMessage = message.isAIMessage;
    this.isUserMessage = message.isUserMessage;
    this.isSystemMessage = message.isSystemMessage;
  }
}

/**
 * 聊天列表响应DTO
 */
export class ChatListResponseDTO {
  constructor(chats, totalCount, page = 1, pageSize = 20) {
    this.chats = chats.map(chat => new ChatResponseDTO(chat));
    this.totalCount = totalCount;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(totalCount / pageSize);
  }
}

/**
 * 搜索结果DTO
 */
export class SearchResultDTO {
  constructor(results) {
    this.results = results.map(result => ({
      chatId: result.chat.id,
      chatTitle: result.chat.title,
      message: new MessageResponseDTO(result.message),
      matchedContent: result.matchedContent
    }));
    this.totalCount = results.length;
  }
}
