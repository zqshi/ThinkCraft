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
  truncateText
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
      expect(id).toMatch(/_/);
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
      textarea.style.height = '50px';
      Object.defineProperty(textarea, 'scrollHeight', {
        value: 80,
        writable: true
      });

      autoResize(textarea);
      expect(textarea.style.height).toBe('80px');
    });

    test('应该限制最大高度为120px', () => {
      const textarea = document.createElement('textarea');
      Object.defineProperty(textarea, 'scrollHeight', {
        value: 200,
        writable: true
      });

      autoResize(textarea);
      expect(textarea.style.height).toBe('120px');
    });
  });
});
