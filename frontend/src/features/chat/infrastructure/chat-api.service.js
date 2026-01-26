/**
 * Chat API服务
 * 提供聊天功能的API调用接口
 */
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class ChatApiService {
  constructor() {
    this.basePath = '/chat';
  }

  /**
   * 创建聊天
   */
  async createChat(projectId, title) {
    return apiClient.post(this.basePath, {
      projectId,
      title
    });
  }

  /**
   * 获取聊天列表
   */
  async getChats(projectId) {
    return apiClient.get(this.basePath, { projectId });
  }

  /**
   * 获取聊天详情
   */
  async getChat(chatId) {
    return apiClient.get(`${this.basePath}/${chatId}`);
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId, content, messageType = 'text') {
    return apiClient.post(`${this.basePath}/${chatId}/messages`, {
      content,
      type: messageType
    });
  }

  /**
   * 获取消息列表
   */
  async getMessages(chatId, limit = 50, offset = 0) {
    return apiClient.get(`${this.basePath}/${chatId}/messages`, {
      limit,
      offset
    });
  }

  /**
   * 更新聊天状态
   */
  async updateChatStatus(chatId, status) {
    return apiClient.put(`${this.basePath}/${chatId}/status`, {
      status
    });
  }

  /**
   * 删除聊天
   */
  async deleteChat(chatId) {
    return apiClient.delete(`${this.basePath}/${chatId}`);
  }

  /**
   * 上传文件
   */
  async uploadFile(chatId, file) {
    return apiClient.upload(`${this.basePath}/${chatId}/upload`, file);
  }

  /**
   * 流式接收消息（SSE）
   */
  streamMessages(chatId, onMessage, onError) {
    const eventSource = new EventSource(`${this.basePath}/${chatId}/stream`);

    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    };

    eventSource.onerror = error => {
      console.error('SSE连接错误:', error);
      if (onError) {
        onError(error);
      }
    };

    return eventSource;
  }
}

// 创建单例实例
export const chatApiService = new ChatApiService();
