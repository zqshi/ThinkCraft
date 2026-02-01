/**
 * helpers.js 单元测试
 * 测试通用辅助函数
 */

import {
  autoResize,
  sleep,
  formatDateTime,
  formatTime,
  generateId,
  vibrate,
  isMobile,
  getFileExtension,
  truncateText,
  scrollToBottom,
  forceScrollToBottom,
  focusInput,
  copyToClipboard,
  closeAllChatMenus,
  closeChatMenu
} from './helpers.js';

describe('helpers.js - 通用辅助函数', () => {
  describe('sleep', () => {
    test('应该等待指定的毫秒数', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90); // 允许10ms误差
    });
  });

  describe('formatDateTime', () => {
    test('应该格式化Date对象', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = formatDateTime(date);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/01/);
      expect(result).toMatch(/15/);
    });

    test('应该格式化ISO字符串', () => {
      const result = formatDateTime('2024-01-15T10:30:00');
      expect(result).toMatch(/2024/);
    });
  });

  describe('formatTime', () => {
    test('应该返回当前时间的格式化字符串', () => {
      const result = formatTime();
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('generateId', () => {
    test('应该生成唯一ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    test('应该返回字符串类型', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    test('应该包含时间戳和随机部分', () => {
      const id = generateId();
      expect(id).toContain('_');
      const parts = id.split('_');
      expect(parts.length).toBe(2);
      expect(Number(parts[0])).toBeGreaterThan(0);
    });
  });

  describe('vibrate', () => {
    test('应该在支持的设备上调用navigator.vibrate', () => {
      let calledWith = null;
      const mockVibrate = duration => {
        calledWith = duration;
      };
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true
      });

      vibrate(50);
      expect(calledWith).toBe(50);
    });

    test('应该使用默认值30ms', () => {
      let calledWith = null;
      const mockVibrate = duration => {
        calledWith = duration;
      };
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true
      });

      vibrate();
      expect(calledWith).toBe(30);
    });
  });

  describe('isMobile', () => {
    test('应该检测移动设备', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
        configurable: true
      });

      expect(isMobile()).toBe(true);

      // 恢复原始值
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
        configurable: true
      });
    });

    test('应该检测桌面设备', () => {
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true
      });

      expect(isMobile()).toBe(false);

      // 恢复原始值
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
        configurable: true
      });
    });
  });

  describe('getFileExtension', () => {
    test('应该提取文件扩展名', () => {
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('image.PNG')).toBe('png');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    test('应该处理没有扩展名的文件', () => {
      expect(getFileExtension('README')).toBe('');
    });

    test('应该处理隐藏文件', () => {
      expect(getFileExtension('.gitignore')).toBe('');
    });
  });

  describe('truncateText', () => {
    test('应该截断长文本', () => {
      const text = '这是一段很长的文本内容';
      const result = truncateText(text, 5);
      expect(result).toBe('这是一段很...');
    });

    test('应该保留短文本', () => {
      const text = '短文本';
      const result = truncateText(text, 10);
      expect(result).toBe('短文本');
    });

    test('应该使用自定义后缀', () => {
      const text = '这是一段很长的文本内容';
      const result = truncateText(text, 5, '…');
      expect(result).toBe('这是一段很…');
    });

    test('应该处理空文本', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText(null, 10)).toBe(null);
    });
  });

  describe('autoResize', () => {
    test('应该调整textarea高度', () => {
      const textarea = document.createElement('textarea');
      Object.defineProperty(textarea, 'scrollHeight', {
        value: 80,
        writable: true,
        configurable: true
      });

      autoResize(textarea);
      expect(textarea.style.height).toBe('80px');
    });

    test('应该限制最大高度为120px', () => {
      const textarea = document.createElement('textarea');
      Object.defineProperty(textarea, 'scrollHeight', {
        value: 200,
        writable: true,
        configurable: true
      });

      autoResize(textarea);
      expect(textarea.style.height).toBe('120px');
    });
  });

  describe('scrollToBottom', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="chatContainer"></div>';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('应该在用户在底部附近时滚动', () => {
      const container = document.getElementById('chatContainer');
      Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(container, 'scrollTop', { value: 950, writable: true, configurable: true });
      Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });

      scrollToBottom();
      // 应该滚动到底部
      expect(container.scrollTop).toBeGreaterThan(0);
    });

    test('应该在容器不存在时不报错', () => {
      document.body.innerHTML = '';
      expect(() => scrollToBottom()).not.toThrow();
    });
  });

  describe('forceScrollToBottom', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="chatContainer"></div>';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('应该强制滚动到底部', () => {
      const container = document.getElementById('chatContainer');
      Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(container, 'scrollTop', { value: 0, writable: true, configurable: true });

      forceScrollToBottom();
      expect(container.scrollTop).toBe(1000);
    });

    test('应该在容器不存在时不报错', () => {
      document.body.innerHTML = '';
      expect(() => forceScrollToBottom()).not.toThrow();
    });
  });

  describe('focusInput', () => {
    beforeEach(() => {
      document.body.innerHTML = '<input id="mainInput" type="text" />';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('应该聚焦输入框', () => {
      const input = document.getElementById('mainInput');
      let focusCalled = false;
      input.focus = () => { focusCalled = true; };

      focusInput();
      expect(focusCalled).toBe(true);
    });

    test('应该在输入框不存在时不报错', () => {
      document.body.innerHTML = '';
      expect(() => focusInput()).not.toThrow();
    });
  });

  describe('copyToClipboard', () => {
    test('应该复制文本到剪贴板', async () => {
      // Mock navigator.clipboard
      const mockWriteText = async (text) => {
        return Promise.resolve();
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true
      });

      // Mock alert
      global.alert = () => {};

      await expect(copyToClipboard('test')).resolves.not.toThrow();
    });

    test('应该处理复制失败', async () => {
      // Mock navigator.clipboard to throw error
      const mockWriteText = async () => {
        throw new Error('Copy failed');
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true
      });

      // Mock alert
      global.alert = () => {};

      await expect(copyToClipboard('test')).resolves.not.toThrow();
    });
  });

  describe('closeAllChatMenus', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="chat-item menu-open" data-chat-id="1">
          <div class="chat-item-actions">
            <div id="menu-1" class="chat-item-menu active" data-chat-id="1"></div>
          </div>
        </div>
        <div class="chat-item menu-open" data-chat-id="2">
          <div class="chat-item-actions">
            <div id="menu-2" class="chat-item-menu active" data-chat-id="2"></div>
          </div>
        </div>
      `;
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('应该关闭所有聊天菜单', () => {
      closeAllChatMenus();

      const menus = document.querySelectorAll('.chat-item-menu.active');
      expect(menus.length).toBe(0);

      const openItems = document.querySelectorAll('.chat-item.menu-open');
      expect(openItems.length).toBe(0);
    });
  });

  describe('closeChatMenu', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="chat-item menu-open" data-chat-id="1">
          <div class="chat-item-actions">
            <div id="menu-1" class="chat-item-menu active" data-chat-id="1"></div>
          </div>
        </div>
      `;
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('应该关闭指定的聊天菜单', () => {
      closeChatMenu('1');

      const menu = document.getElementById('menu-1');
      expect(menu.classList.contains('active')).toBe(false);

      const openItems = document.querySelectorAll('.chat-item.menu-open');
      expect(openItems.length).toBe(0);
    });

    test('应该在菜单不存在时不报错', () => {
      expect(() => closeChatMenu('999')).not.toThrow();
    });
  });
});
