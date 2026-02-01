/**
 * dom.js 单元测试
 * 测试DOM操作工具函数
 */

// 加载dom.js到全局环境
beforeAll(async () => {
  await import('./dom.js');
});

describe('dom.js - DOM操作工具函数', () => {
  // 在每个测试前设置DOM环境
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="testElement" class="test-class">Test Content</div>
      <textarea id="testTextarea"></textarea>
      <input id="testInput" type="text" />
      <div id="chatContainer"></div>
    `;

    // 模拟全局state对象
    window.state = {
      autoScrollLocked: false,
      autoScrollEnabled: true,
      autoScrollUnlockTimer: null
    };
  });

  // 在每个测试后清理
  afterEach(() => {
    document.body.innerHTML = '';
    delete window.state;
  });

  describe('autoResize', () => {
    test('应该调整textarea高度', () => {
      const textarea = document.getElementById('testTextarea');
      Object.defineProperty(textarea, 'scrollHeight', {
        value: 80,
        writable: true,
        configurable: true
      });

      autoResize(textarea);
      expect(textarea.style.height).toBe('80px');
    });

    test('应该限制最大高度为120px', () => {
      const textarea = document.getElementById('testTextarea');
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
    test('应该滚动到容器底部', () => {
      const container = document.getElementById('chatContainer');
      Object.defineProperty(container, 'scrollHeight', {
        value: 1000,
        writable: true,
        configurable: true
      });

      scrollToBottom();
      expect(container.scrollTop).toBe(1000);
    });

    test('应该在锁定时不滚动', () => {
      window.state.autoScrollLocked = true;
      const container = document.getElementById('chatContainer');
      container.scrollTop = 100;

      scrollToBottom();
      expect(container.scrollTop).toBe(100);
    });

    test('应该在禁用时不滚动', () => {
      window.state.autoScrollEnabled = false;
      const container = document.getElementById('chatContainer');
      container.scrollTop = 100;

      scrollToBottom();
      expect(container.scrollTop).toBe(100);
    });

    test('应该在force=true时强制滚动', () => {
      window.state.autoScrollLocked = true;
      const container = document.getElementById('chatContainer');
      Object.defineProperty(container, 'scrollHeight', {
        value: 1000,
        writable: true,
        configurable: true
      });

      scrollToBottom(true);
      expect(container.scrollTop).toBe(1000);
    });
  });

  describe('focusInput', () => {
    test('应该聚焦默认输入框', () => {
      let input = document.getElementById('mainInput');
      if (!input) {
        // 如果不存在，创建一个
        input = document.createElement('input');
        input.id = 'mainInput';
        document.body.appendChild(input);
      }

      // 模拟focus方法
      let focusCalled = false;
      input.focus = () => { focusCalled = true; };
      focusInput();
      expect(focusCalled).toBe(true);
    });

    test('应该聚焦指定的输入框', () => {
      const input = document.getElementById('testInput');
      // 模拟focus方法
      let focusCalled = false;
      input.focus = () => { focusCalled = true; };

      focusInput('testInput');
      expect(focusCalled).toBe(true);
    });
  });

  describe('lockAutoScroll', () => {
    test('应该锁定自动滚动', () => {
      lockAutoScroll();
      expect(window.state.autoScrollLocked).toBe(true);
    });

    test('应该在指定时间后解锁', done => {
      lockAutoScroll(100);
      expect(window.state.autoScrollLocked).toBe(true);

      setTimeout(() => {
        expect(window.state.autoScrollLocked).toBe(false);
        done();
      }, 150);
    });

    test('应该清除之前的定时器', () => {
      lockAutoScroll(1000);
      const firstTimer = window.state.autoScrollUnlockTimer;

      lockAutoScroll(1000);
      const secondTimer = window.state.autoScrollUnlockTimer;

      expect(firstTimer).not.toBe(secondTimer);
    });
  });

  describe('unlockAutoScroll', () => {
    test('应该解锁自动滚动', () => {
      window.state.autoScrollLocked = true;
      unlockAutoScroll();
      expect(window.state.autoScrollLocked).toBe(false);
    });

    test('应该清除定时器', () => {
      lockAutoScroll(1000);
      expect(window.state.autoScrollUnlockTimer).not.toBeNull();

      unlockAutoScroll();
      expect(window.state.autoScrollUnlockTimer).toBeNull();
    });
  });

  describe('showElement', () => {
    test('应该显示元素（通过ID）', () => {
      const element = document.getElementById('testElement');
      element.style.display = 'none';

      showElement('testElement');
      expect(element.style.display).toBe('');
    });

    test('应该显示元素（通过对象）', () => {
      const element = document.getElementById('testElement');
      element.style.display = 'none';

      showElement(element);
      expect(element.style.display).toBe('');
    });
  });

  describe('hideElement', () => {
    test('应该隐藏元素（通过ID）', () => {
      hideElement('testElement');
      const element = document.getElementById('testElement');
      expect(element.style.display).toBe('none');
    });

    test('应该隐藏元素（通过对象）', () => {
      const element = document.getElementById('testElement');
      hideElement(element);
      expect(element.style.display).toBe('none');
    });
  });

  describe('toggleElement', () => {
    test('应该切换元素显示状态', () => {
      const element = document.getElementById('testElement');

      const result1 = toggleElement('testElement');
      expect(element.style.display).toBe('none');
      expect(result1).toBe(true);

      const result2 = toggleElement('testElement');
      expect(element.style.display).toBe('');
      expect(result2).toBe(false);
    });
  });

  describe('addClass', () => {
    test('应该添加CSS类（通过ID）', () => {
      addClass('testElement', 'new-class');
      const element = document.getElementById('testElement');
      expect(element.classList.contains('new-class')).toBe(true);
    });

    test('应该添加CSS类（通过对象）', () => {
      const element = document.getElementById('testElement');
      addClass(element, 'new-class');
      expect(element.classList.contains('new-class')).toBe(true);
    });
  });

  describe('removeClass', () => {
    test('应该移除CSS类（通过ID）', () => {
      removeClass('testElement', 'test-class');
      const element = document.getElementById('testElement');
      expect(element.classList.contains('test-class')).toBe(false);
    });

    test('应该移除CSS类（通过对象）', () => {
      const element = document.getElementById('testElement');
      removeClass(element, 'test-class');
      expect(element.classList.contains('test-class')).toBe(false);
    });
  });

  describe('toggleClass', () => {
    test('应该切换CSS类', () => {
      const element = document.getElementById('testElement');

      const result1 = toggleClass('testElement', 'toggle-class');
      expect(element.classList.contains('toggle-class')).toBe(true);
      expect(result1).toBe(true);

      const result2 = toggleClass('testElement', 'toggle-class');
      expect(element.classList.contains('toggle-class')).toBe(false);
      expect(result2).toBe(false);
    });
  });
});
