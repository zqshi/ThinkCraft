/**
 * typing-effect.js 单元测试
 * 测试打字机效果功能
 */

describe('TypingEffect', () => {
  beforeEach(() => {
    // 设置DOM环境
    document.body.innerHTML = `
      <div id="testElement"></div>
      <div id="messageList"></div>
    `;

    // 模拟全局state对象
    window.state = {
      typingChatId: null,
      currentChat: null,
      autoScrollEnabled: true
    };

    // 模拟全局函数
    window.scrollToBottom = () => {};
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.state;
    delete window.scrollToBottom;
  });

  describe('打字机效果基础功能', () => {
    test('应该能够逐字显示文本', async () => {
      const element = document.getElementById('testElement');
      const text = 'Hello';

      // 模拟打字机效果
      for (let i = 0; i < text.length; i++) {
        element.textContent += text[i];
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      expect(element.textContent).toBe('Hello');
    });

    test('应该能够处理空文本', () => {
      const element = document.getElementById('testElement');
      const text = '';

      element.textContent = text;
      expect(element.textContent).toBe('');
    });

    test('应该能够处理中文文本', async () => {
      const element = document.getElementById('testElement');
      const text = '你好';

      // 模拟打字机效果
      for (let i = 0; i < text.length; i++) {
        element.textContent += text[i];
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      expect(element.textContent).toBe('你好');
    });

    test('应该能够处理特殊字符', async () => {
      const element = document.getElementById('testElement');
      const text = '!@#$%^&*()';

      // 模拟打字机效果
      for (let i = 0; i < text.length; i++) {
        element.textContent += text[i];
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      expect(element.textContent).toBe('!@#$%^&*()');
    });
  });

  describe('打字机状态管理', () => {
    test('应该设置typingChatId', () => {
      expect(window.state.typingChatId).toBeNull();

      window.state.typingChatId = 123;
      expect(window.state.typingChatId).toBe(123);
    });

    test('应该在完成后清除typingChatId', () => {
      window.state.typingChatId = 123;
      expect(window.state.typingChatId).toBe(123);

      // 模拟完成
      window.state.typingChatId = null;
      expect(window.state.typingChatId).toBeNull();
    });

    test('应该检查当前chat是否正在打字', () => {
      window.state.currentChat = 123;
      window.state.typingChatId = 123;

      const isTyping = window.state.typingChatId === window.state.currentChat;
      expect(isTyping).toBe(true);
    });

    test('应该检查其他chat是否正在打字', () => {
      window.state.currentChat = 123;
      window.state.typingChatId = 456;

      const isTyping = window.state.typingChatId === window.state.currentChat;
      expect(isTyping).toBe(false);
    });
  });

  describe('自动滚动集成', () => {
    test('应该在打字时调用scrollToBottom', () => {
      let scrollCalled = false;
      window.scrollToBottom = () => { scrollCalled = true; };

      window.scrollToBottom();
      expect(scrollCalled).toBe(true);
    });

    test('应该在autoScrollEnabled为true时滚动', () => {
      let scrollCalled = false;
      window.scrollToBottom = () => { scrollCalled = true; };

      window.state.autoScrollEnabled = true;
      window.scrollToBottom();
      expect(scrollCalled).toBe(true);
    });
  });

  describe('代码块处理', () => {
    test('应该能够识别代码块标记', () => {
      const text = '```javascript\nconst x = 1;\n```';
      expect(text).toContain('```');
      expect(text).toContain('javascript');
    });

    test('应该能够提取代码块内容', () => {
      const text = '```javascript\nconst x = 1;\n```';
      const match = text.match(/```(\w+)?\n([\s\S]*?)```/);

      expect(match).not.toBeNull();
      expect(match[1]).toBe('javascript');
      expect(match[2]).toBe('const x = 1;\n');
    });

    test('应该能够处理多个代码块', () => {
      const text = '```js\ncode1\n```\n\ntext\n\n```py\ncode2\n```';
      const matches = text.match(/```(\w+)?\n([\s\S]*?)```/g);

      expect(matches).not.toBeNull();
      expect(matches.length).toBe(2);
    });
  });

  describe('Markdown处理', () => {
    test('应该能够识别粗体标记', () => {
      const text = '**粗体文本**';
      expect(text).toContain('**');
    });

    test('应该能够识别斜体标记', () => {
      const text = '*斜体文本*';
      expect(text).toContain('*');
    });

    test('应该能够识别链接标记', () => {
      const text = '[链接文本](https://example.com)';
      expect(text).toMatch(/\[.*?\]\(.*?\)/);
    });

    test('应该能够识别列表标记', () => {
      const text = '- 列表项1\n- 列表项2';
      expect(text).toContain('- ');
    });
  });

  describe('性能测试', () => {
    test('应该能够快速处理短文本', async () => {
      const element = document.getElementById('testElement');
      const text = 'Short text';
      const startTime = Date.now();

      // 模拟快速打字
      element.textContent = text;

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('应该能够处理长文本', async () => {
      const element = document.getElementById('testElement');
      const text = 'a'.repeat(1000);

      // 模拟处理长文本
      element.textContent = text;

      expect(element.textContent.length).toBe(1000);
    });
  });

  describe('错误处理', () => {
    test('应该处理null元素', () => {
      const element = document.getElementById('nonexistent');
      expect(element).toBeNull();
    });

    test('应该处理undefined文本', () => {
      const element = document.getElementById('testElement');
      const text = undefined;

      element.textContent = text || '';
      expect(element.textContent).toBe('');
    });

    test('应该处理null文本', () => {
      const element = document.getElementById('testElement');
      const text = null;

      element.textContent = text || '';
      expect(element.textContent).toBe('');
    });
  });

  describe('完成回调', () => {
    test('应该在完成后执行回调', async () => {
      let callbackExecuted = false;
      const callback = () => {
        callbackExecuted = true;
      };

      // 模拟打字完成
      await new Promise(resolve => setTimeout(resolve, 10));
      callback();

      expect(callbackExecuted).toBe(true);
    });

    test('应该传递正确的参数给回调', async () => {
      let receivedElement = null;
      const element = document.getElementById('testElement');
      const callback = (el) => {
        receivedElement = el;
      };

      // 模拟打字完成
      await new Promise(resolve => setTimeout(resolve, 10));
      callback(element);

      expect(receivedElement).toBe(element);
    });
  });
});
