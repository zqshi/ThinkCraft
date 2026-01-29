import { ChatUseCase } from '../chat.use-case.js';
import { CreateChatDTO, AddMessageDTO, UpdateChatDTO } from '../chat.dto.js';

describe('ChatUseCase', () => {
  let useCase;

  beforeEach(() => {
    useCase = new ChatUseCase();
  });

  it('should create a chat with initial message and tags', async () => {
    const response = await useCase.createChat(
      new CreateChatDTO({
        title: '测试聊天',
        initialMessage: 'hello',
        tags: ['a', 'b'],
        userId: 'user-1'
      })
    );

    expect(response.title).toBe('测试聊天');
    expect(response.tags).toEqual(['a', 'b']);
    expect(response.messageCount).toBe(1);
    expect(response.lastMessage.content).toBe('hello');
  });

  it('should send a message and return message response', async () => {
    const chat = await useCase.createChat(new CreateChatDTO({ title: 'Chat' }));
    const message = await useCase.sendMessage(
      new AddMessageDTO({
        chatId: chat.id,
        content: 'hi',
        type: 'text',
        sender: 'user',
        metadata: { key: 'value' }
      })
    );

    expect(message.content).toBe('hi');
    expect(message.metadata.key).toBe('value');
  });

  it('should update chat title, status, tags and pin', async () => {
    const chat = await useCase.createChat(new CreateChatDTO({ title: 'Old' }));
    const updated = await useCase.updateChat(
      chat.id,
      new UpdateChatDTO({ title: 'New', status: 'archived', tags: ['x'], isPinned: true })
    );

    expect(updated.title).toBe('New');
    expect(updated.status).toBe('archived');
    expect(updated.tags).toEqual(['x']);
    expect(updated.isPinned).toBe(true);
  });

  it('should list chats with filters and pagination', async () => {
    const chat1 = await useCase.createChat(new CreateChatDTO({ title: 'A', tags: ['x'] }));
    await useCase.createChat(new CreateChatDTO({ title: 'B', tags: ['y'] }));
    await useCase.archiveChat(chat1.id);

    const archived = await useCase.getChatList(1, 10, { status: 'archived' });
    expect(archived.totalCount).toBe(1);
    expect(archived.chats[0].status).toBe('archived');
  });

  it('should search chats by keyword', async () => {
    const chat = await useCase.createChat(new CreateChatDTO({ title: 'SearchChat' }));
    await useCase.sendMessage(
      new AddMessageDTO({ chatId: chat.id, content: '关键字 here', type: 'text', sender: 'user' })
    );

    const results = await useCase.searchChats('关键字');
    expect(results.length).toBe(1);
    expect(results[0].chat.id).toBe(chat.id);
  });

  it('should archive and restore chat', async () => {
    const chat = await useCase.createChat(new CreateChatDTO({ title: 'Arch' }));
    const archived = await useCase.archiveChat(chat.id);
    expect(archived.status).toBe('archived');

    const restored = await useCase.restoreChat(chat.id);
    expect(restored.status).toBe('active');
  });

  it('should merge chats', async () => {
    const target = await useCase.createChat(new CreateChatDTO({ title: 'Target' }));
    const source = await useCase.createChat(new CreateChatDTO({ title: 'Source' }));
    await useCase.sendMessage(
      new AddMessageDTO({ chatId: source.id, content: 'from source', type: 'text', sender: 'user' })
    );

    const merged = await useCase.mergeChats(target.id, [source.id]);
    expect(merged.title).toBe('Target');
    expect(merged.messageCount).toBeGreaterThan(0);
  });

  it('should delete chat and update stats', async () => {
    const chat = await useCase.createChat(new CreateChatDTO({ title: 'DeleteMe' }));
    await useCase.sendMessage(
      new AddMessageDTO({ chatId: chat.id, content: 'msg', type: 'text', sender: 'user' })
    );

    const statsBefore = await useCase.getChatStats();
    await useCase.deleteChat(chat.id);
    const statsAfter = await useCase.getChatStats();

    expect(statsBefore.totalChats).toBeGreaterThan(statsAfter.totalChats);
  });
});
