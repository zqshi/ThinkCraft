import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DeepSeekMockServer } from '../../../helpers/DeepSeekMockServer.js';
import { ConversationRepository } from '../../../../domains/conversation/repositories/ConversationRepository.js';

let ConversationService;

describe('ConversationService', () => {
  let mockServer;
  let service;
  let repository;

  beforeAll(async () => {
    mockServer = new DeepSeekMockServer();
    await mockServer.start();
    process.env.DEEPSEEK_API_KEY = 'test-key';
    process.env.DEEPSEEK_API_URL = mockServer.getUrl();

    const serviceModule = await import('../../../../domains/conversation/services/ConversationService.js');
    ConversationService = serviceModule.ConversationService;
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    repository = new ConversationRepository();
    service = new ConversationService(repository);
  });

  it('creates a conversation with valid input', async () => {
    const conversation = await service.createConversation('user_001', 'My Idea');

    expect(conversation).toBeDefined();
    expect(conversation.userId).toBe('user_001');
  });

  it('rejects empty title', async () => {
    await expect(service.createConversation('user_001', '')).rejects.toThrow('用户ID和对话标题不能为空');
  });

  it('adds and sends message with AI response', async () => {
    mockServer.enqueueResponse('AI response');
    const conversation = await service.createConversation('user_002', 'Chat');

    const result = await service.sendMessage(conversation.id, 'Hello');

    expect(result.userMsg.role).toBe('user');
    expect(result.assistantMsg.content).toContain('AI response');
  });
});
