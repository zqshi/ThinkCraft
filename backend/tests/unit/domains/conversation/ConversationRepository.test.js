import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConversationRepository } from '../../../../domains/conversation/repositories/ConversationRepository.js';

describe('ConversationRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new ConversationRepository();
  });

  it('creates and fetches a conversation', async () => {
    const created = await repository.createConversation({
      id: 'conv_repo_001',
      userId: 'user_001',
      title: 'Test Conversation',
      conversationStep: 0,
      isPinned: false,
      analysisCompleted: false,
      userData: { purpose: 'testing' }
    });

    expect(created.id).toBe('conv_repo_001');

    const loaded = await repository.getConversationById('conv_repo_001');
    expect(loaded).toBeDefined();
    expect(loaded.title).toBe('Test Conversation');
  });

  it('adds messages and returns them in order', async () => {
    await repository.createConversation({
      id: 'conv_repo_002',
      userId: 'user_002',
      title: 'Chat',
      conversationStep: 0,
      isPinned: false,
      analysisCompleted: false
    });

    await repository.addMessage('conv_repo_002', { role: 'user', content: 'Hello' });
    await repository.addMessage('conv_repo_002', { role: 'assistant', content: 'Hi!' });

    const messages = await repository.getMessages('conv_repo_002');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
  });

  it('pins and completes analysis', async () => {
    await repository.createConversation({
      id: 'conv_repo_003',
      userId: 'user_003',
      title: 'Pinned Chat',
      conversationStep: 0,
      isPinned: false,
      analysisCompleted: false
    });

    const pinned = await repository.pinConversation('conv_repo_003', true);
    expect(pinned).toBe(true);

    const marked = await repository.markAnalysisCompleted('conv_repo_003');
    expect(marked).toBe(true);

    const updated = await repository.getConversationById('conv_repo_003');
    expect(updated.isPinned).toBe(true);
    expect(updated.analysisCompleted).toBe(true);
  });
});
