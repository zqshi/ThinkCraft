/**
 * format.js 工具函数测试
 * 测试各种格式化功能
 */

// 由于format.js使用全局函数，我们需要在测试环境中加载它
import './format.js';

// 从全局作用域获取函数
const {
  formatTime,
  generateChatId,
  normalizeChatId,
  formatDate,
  formatDateTime,
  truncateText,
  generateRandomId,
  formatFileSize,
  formatNumber,
  parseCodeBlocks,
  escapeHtml
} = global;

describe('formatTime', () => {
  test('应该返回"刚刚"当时间差小于1分钟', () => {
    const timestamp = Date.now() - 30000; // 30秒前
    expect(formatTime(timestamp)).toBe('刚刚');
  });

  test('应该返回分钟数当时间差小于1小时', () => {
    const timestamp = Date.now() - 5 * 60 * 1000; // 5分钟前
    expect(formatTime(timestamp)).toBe('5分钟前');
  });

  test('应该返回小时数当时间差小于1天', () => {
    const timestamp = Date.now() - 3 * 60 * 60 * 1000; // 3小时前
    expect(formatTime(timestamp)).toBe('3小时前');
  });

  test('应该返回天数当时间差小于1周', () => {
    const timestamp = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2天前
    expect(formatTime(timestamp)).toBe('2天前');
  });

  test('应该返回周数当时间差小于4周', () => {
    const timestamp = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000; // 2周前
    expect(formatTime(timestamp)).toBe('2周前');
  });

  test('应该返回日期格式当时间差大于4周', () => {
    const timestamp = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30天前
    const result = formatTime(timestamp);
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('generateChatId', () => {
  test('应该生成唯一的数字ID', () => {
    const id1 = generateChatId();
    const id2 = generateChatId();

    expect(typeof id1).toBe('number');
    expect(typeof id2).toBe('number');
    expect(id1).not.toBe(id2);
  });

  test('生成的ID应该基于当前时间戳', () => {
    const before = Date.now();
    const id = generateChatId();
    const after = Date.now();

    // ID应该在合理的时间范围内
    expect(id).toBeGreaterThanOrEqual(before * 1000);
    expect(id).toBeLessThanOrEqual(after * 1000 + 1000);
  });
});

describe('normalizeChatId', () => {
  test('应该将字符串ID转换为数字', () => {
    expect(normalizeChatId('12345')).toBe(12345);
    expect(typeof normalizeChatId('12345')).toBe('number');
  });

  test('应该保持数字ID不变', () => {
    expect(normalizeChatId(12345)).toBe(12345);
  });

  test('应该处理带前导零的字符串', () => {
    expect(normalizeChatId('00123')).toBe(123);
  });
});

describe('formatDate', () => {
  test('应该格式化Date对象', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(formatDate(date)).toBe('2024-01-15');
  });

  test('应该格式化时间戳', () => {
    const timestamp = new Date('2024-01-15').getTime();
    expect(formatDate(timestamp)).toBe('2024-01-15');
  });

  test('应该格式化日期字符串', () => {
    expect(formatDate('2024-01-15')).toBe('2024-01-15');
  });

  test('应该正确处理月份和日期的补零', () => {
    const date = new Date('2024-03-05');
    expect(formatDate(date)).toBe('2024-03-05');
  });
});

describe('formatDateTime', () => {
  test('应该格式化完整的日期时间', () => {
    const date = new Date('2024-01-15T10:30:45');
    expect(formatDateTime(date)).toBe('2024-01-15 10:30:45');
  });

  test('应该正确补零', () => {
    const date = new Date('2024-03-05T09:05:03');
    expect(formatDateTime(date)).toBe('2024-03-05 09:05:03');
  });
});

describe('truncateText', () => {
  test('应该截断超长文本', () => {
    const text = '这是一段很长的文本内容，需要被截断处理';
    expect(truncateText(text, 10)).toBe('这是一段很长的文本内容...');
  });

  test('应该保持短文本不变', () => {
    const text = '短文本';
    expect(truncateText(text, 10)).toBe('短文本');
  });

  test('应该处理空文本', () => {
    expect(truncateText('', 10)).toBe('');
    expect(truncateText(null, 10)).toBeNull();
    expect(truncateText(undefined, 10)).toBeUndefined();
  });

  test('应该使用默认长度50', () => {
    const text = 'a'.repeat(60);
    const result = truncateText(text);
    expect(result).toBe('a'.repeat(50) + '...');
  });
});

describe('generateRandomId', () => {
  test('应该生成指定长度的随机ID', () => {
    const id = generateRandomId(10);
    expect(id).toHaveLength(10);
  });

  test('应该使用默认长度8', () => {
    const id = generateRandomId();
    expect(id).toHaveLength(8);
  });

  test('应该只包含字母和数字', () => {
    const id = generateRandomId(20);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  test('应该生成不同的ID', () => {
    const id1 = generateRandomId();
    const id2 = generateRandomId();
    expect(id1).not.toBe(id2);
  });
});

describe('formatFileSize', () => {
  test('应该格式化0字节', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  test('应该格式化字节', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  test('应该格式化KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  test('应该格式化MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(2621440)).toBe('2.5 MB');
  });

  test('应该格式化GB', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  test('应该格式化TB', () => {
    expect(formatFileSize(1099511627776)).toBe('1 TB');
  });
});

describe('formatNumber', () => {
  test('应该添加千分位分隔符', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  test('应该处理小数字', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(999)).toBe('999');
  });

  test('应该处理负数', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
  });
});

describe('parseCodeBlocks', () => {
  test('应该解析单个代码块', () => {
    const text = '```javascript\nconsole.log("hello");\n```';
    const blocks = parseCodeBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('javascript');
    expect(blocks[0].code).toBe('console.log("hello");');
  });

  test('应该解析多个代码块', () => {
    const text = `
      \`\`\`javascript
      const a = 1;
      \`\`\`

      \`\`\`python
      print("hello")
      \`\`\`
    `;
    const blocks = parseCodeBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].language).toBe('javascript');
    expect(blocks[1].language).toBe('python');
  });

  test('应该处理没有语言标识的代码块', () => {
    const text = '```\nsome code\n```';
    const blocks = parseCodeBlocks(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('text');
  });

  test('应该返回空数组当没有代码块', () => {
    const text = '这是普通文本，没有代码块';
    const blocks = parseCodeBlocks(text);

    expect(blocks).toHaveLength(0);
  });
});

describe('escapeHtml', () => {
  test('应该转义HTML特殊字符', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#039;');
  });

  test('应该转义多个特殊字符', () => {
    const html = '<script>alert("XSS")</script>';
    const escaped = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
    expect(escapeHtml(html)).toBe(escaped);
  });

  test('应该保持普通文本不变', () => {
    const text = 'Hello World';
    expect(escapeHtml(text)).toBe(text);
  });

  test('应该处理混合内容', () => {
    const text = 'Hello <b>World</b> & "Friends"';
    const escaped = 'Hello &lt;b&gt;World&lt;/b&gt; &amp; &quot;Friends&quot;';
    expect(escapeHtml(text)).toBe(escaped);
  });
});
