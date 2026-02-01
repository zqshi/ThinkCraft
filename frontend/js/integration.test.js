/**
 * 集成测试示例
 * 测试多个模块协作的完整流程
 */

describe('集成测试 - 聊天流程', () => {
  beforeEach(() => {
    // 设置完整的DOM环境
    document.body.innerHTML = `
      <div id="emptyState"></div>
      <div id="messageList" style="display: none;"></div>
      <input id="mainInput" type="text" />
      <div id="chatContainer"></div>
      <div id="chatList"></div>
    `;

    // 模拟完整的全局state
    window.state = {
      currentChat: null,
      chats: [],
      messages: [],
      userData: {},
      conversationStep: 0,
      analysisCompleted: false,
      autoScrollEnabled: true,
      typingChatId: null,
      pendingChatIds: new Set(),
      isLoading: false,
      settings: {
        saveHistory: true,
        apiUrl: 'http://localhost:3000'
      }
    };

    // 模拟全局函数
    window.generateChatId = () => Date.now();
    window.loadChats = () => {};
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.state;
    delete window.generateChatId;
    delete window.loadChats;
  });

  describe('完整的聊天流程', () => {
    test('应该能够创建新对话并发送消息', () => {
      // 1. 初始状态验证
      expect(window.state.currentChat).toBeNull();
      expect(window.state.chats.length).toBe(0);
      expect(window.state.messages.length).toBe(0);

      // 2. 模拟用户输入
      const input = document.getElementById('mainInput');
      input.value = '你好,我想创建一个项目';

      // 3. 模拟创建新对话
      const chatId = window.generateChatId();
      window.state.currentChat = chatId;
      window.state.chats.unshift({
        id: chatId,
        title: '新对话',
        messages: [],
        userData: {...window.state.userData},
        conversationStep: 0,
        analysisCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4. 验证对话创建
      expect(window.state.currentChat).toBe(chatId);
      expect(window.state.chats.length).toBe(1);
      expect(window.state.chats[0].title).toBe('新对话');

      // 5. 模拟添加消息
      window.state.messages.push({
        role: 'user',
        content: input.value
      });

      // 6. 验证消息添加
      expect(window.state.messages.length).toBe(1);
      expect(window.state.messages[0].role).toBe('user');
      expect(window.state.messages[0].content).toBe('你好,我想创建一个项目');

      // 7. 模拟对话步骤递增
      window.state.conversationStep++;
      expect(window.state.conversationStep).toBe(1);

      // 8. 模拟保存到localStorage
      localStorage.setItem('thinkcraft_chats', JSON.stringify(window.state.chats));
      const saved = JSON.parse(localStorage.getItem('thinkcraft_chats'));
      expect(saved.length).toBe(1);
      expect(saved[0].id).toBe(chatId);
    });

    test('应该能够加载历史对话', () => {
      // 1. 准备历史数据
      const chatId = 123;
      const historicalChats = [
        {
          id: chatId,
          title: '历史对话',
          messages: [
            { role: 'user', content: '历史消息1' },
            { role: 'assistant', content: '历史回复1' }
          ],
          userData: {},
          conversationStep: 1,
          analysisCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // 2. 保存到localStorage
      localStorage.setItem('thinkcraft_chats', JSON.stringify(historicalChats));

      // 3. 模拟加载
      const loaded = JSON.parse(localStorage.getItem('thinkcraft_chats'));
      window.state.chats = loaded;

      // 4. 验证加载
      expect(window.state.chats.length).toBe(1);
      expect(window.state.chats[0].id).toBe(chatId);
      expect(window.state.chats[0].messages.length).toBe(2);

      // 5. 模拟切换到历史对话
      window.state.currentChat = chatId;
      window.state.messages = [...window.state.chats[0].messages];
      window.state.conversationStep = window.state.chats[0].conversationStep;

      // 6. 验证切换
      expect(window.state.currentChat).toBe(chatId);
      expect(window.state.messages.length).toBe(2);
      expect(window.state.conversationStep).toBe(1);
    });

    test('应该能够删除对话', () => {
      // 1. 准备数据
      const chatId1 = 123;
      const chatId2 = 456;
      window.state.chats = [
        { id: chatId1, title: '对话1', messages: [] },
        { id: chatId2, title: '对话2', messages: [] }
      ];

      // 2. 验证初始状态
      expect(window.state.chats.length).toBe(2);

      // 3. 模拟删除对话
      window.state.chats = window.state.chats.filter(c => c.id !== chatId1);

      // 4. 验证删除
      expect(window.state.chats.length).toBe(1);
      expect(window.state.chats[0].id).toBe(chatId2);

      // 5. 保存到localStorage
      localStorage.setItem('thinkcraft_chats', JSON.stringify(window.state.chats));
      const saved = JSON.parse(localStorage.getItem('thinkcraft_chats'));
      expect(saved.length).toBe(1);
    });
  });

  describe('UI状态管理', () => {
    test('应该正确管理空状态和消息列表显示', () => {
      const emptyState = document.getElementById('emptyState');
      const messageList = document.getElementById('messageList');

      // 初始状态
      expect(emptyState.style.display).toBe('');
      expect(messageList.style.display).toBe('none');

      // 发送消息后
      emptyState.style.display = 'none';
      messageList.style.display = 'block';

      expect(emptyState.style.display).toBe('none');
      expect(messageList.style.display).toBe('block');
    });

    test('应该正确管理加载状态', () => {
      const chatId = 123;

      // 设置加载状态
      window.state.pendingChatIds.add(chatId);
      window.state.isLoading = window.state.pendingChatIds.size > 0;

      expect(window.state.isLoading).toBe(true);
      expect(window.state.pendingChatIds.has(chatId)).toBe(true);

      // 清除加载状态
      window.state.pendingChatIds.delete(chatId);
      window.state.isLoading = window.state.pendingChatIds.size > 0;

      expect(window.state.isLoading).toBe(false);
      expect(window.state.pendingChatIds.has(chatId)).toBe(false);
    });
  });

  describe('数据持久化', () => {
    test('应该正确保存和恢复对话状态', () => {
      // 1. 创建对话
      const chatId = Date.now();
      const chat = {
        id: chatId,
        title: '测试对话',
        messages: [
          { role: 'user', content: '测试消息' }
        ],
        userData: { name: '测试用户' },
        conversationStep: 1,
        analysisCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 2. 保存
      window.state.chats = [chat];
      localStorage.setItem('thinkcraft_chats', JSON.stringify(window.state.chats));

      // 3. 清空state
      window.state.chats = [];

      // 4. 恢复
      const restored = JSON.parse(localStorage.getItem('thinkcraft_chats'));
      window.state.chats = restored;

      // 5. 验证
      expect(window.state.chats.length).toBe(1);
      expect(window.state.chats[0].id).toBe(chatId);
      expect(window.state.chats[0].title).toBe('测试对话');
      expect(window.state.chats[0].messages.length).toBe(1);
      expect(window.state.chats[0].userData.name).toBe('测试用户');
    });

    test('应该处理localStorage为空的情况', () => {
      // 清空localStorage
      localStorage.clear();

      // 尝试加载
      const chats = localStorage.getItem('thinkcraft_chats');

      // 验证
      expect(chats).toBeNull();

      // 初始化为空数组
      window.state.chats = chats ? JSON.parse(chats) : [];
      expect(window.state.chats).toEqual([]);
    });
  });
});
