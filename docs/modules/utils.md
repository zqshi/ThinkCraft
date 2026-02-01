# 工具函数文档

## 概述

工具函数模块提供了一系列通用的辅助函数,用于DOM操作、格式化、图标管理等常见任务。

## 模块结构

```
frontend/js/utils/
├── dom.js          # DOM操作工具
├── format.js       # 格式化工具
├── helpers.js      # 通用辅助函数
└── icons.js        # 图标管理
```

---

## dom.js - DOM操作工具

### autoResize(textarea)

自动调整textarea高度。

```javascript
autoResize(textarea: HTMLTextAreaElement)
```

**功能**:
- 根据内容自动调整高度
- 最大高度限制为120px

**示例**:
```javascript
const textarea = document.getElementById('input');
textarea.addEventListener('input', () => autoResize(textarea));
```

### scrollToBottom(force)

滚动到聊天容器底部。

```javascript
scrollToBottom(force: boolean = false)
```

**参数**:
- `force`: 是否强制滚动(忽略锁定状态)

**示例**:
```javascript
// 正常滚动
scrollToBottom();

// 强制滚动
scrollToBottom(true);
```

### focusInput(inputId)

聚焦输入框。

```javascript
focusInput(inputId: string = 'mainInput')
```

**示例**:
```javascript
// 聚焦默认输入框
focusInput();

// 聚焦指定输入框
focusInput('customInput');
```

### lockAutoScroll(duration)

锁定自动滚动。

```javascript
lockAutoScroll(duration: number = 3000)
```

**功能**:
- 临时禁用自动滚动
- 指定时间后自动解锁

**示例**:
```javascript
// 锁定3秒
lockAutoScroll(3000);
```

### unlockAutoScroll()

解锁自动滚动。

```javascript
unlockAutoScroll()
```

### showElement(element)

显示元素。

```javascript
showElement(element: string | HTMLElement)
```

**示例**:
```javascript
// 通过ID
showElement('myElement');

// 通过对象
const el = document.getElementById('myElement');
showElement(el);
```

### hideElement(element)

隐藏元素。

```javascript
hideElement(element: string | HTMLElement)
```

### toggleElement(element)

切换元素显示状态。

```javascript
toggleElement(element: string | HTMLElement): boolean
```

**返回值**: 切换后的显示状态(true=显示, false=隐藏)

### addClass(element, className)

添加CSS类。

```javascript
addClass(element: string | HTMLElement, className: string)
```

### removeClass(element, className)

移除CSS类。

```javascript
removeClass(element: string | HTMLElement, className: string)
```

### toggleClass(element, className)

切换CSS类。

```javascript
toggleClass(element: string | HTMLElement, className: string): boolean
```

**返回值**: 切换后的状态(true=已添加, false=已移除)

---

## format.js - 格式化工具

### formatTime(timestamp)

格式化时间为相对时间。

```javascript
formatTime(timestamp: number): string
```

**返回值**:
- "刚刚" (< 1分钟)
- "N分钟前" (< 1小时)
- "N小时前" (< 1天)
- "N天前" (< 1周)
- "N周前" (< 4周)
- "YYYY-MM-DD" (>= 4周)

**示例**:
```javascript
const time = formatTime(Date.now() - 60000);
// 输出: "1分钟前"
```

### generateChatId()

生成唯一的对话ID。

```javascript
generateChatId(): number
```

**返回值**: 基于时间戳的数字ID

### normalizeChatId(chatId)

规范化对话ID。

```javascript
normalizeChatId(chatId: string | number): number
```

**功能**:
- 将字符串ID转换为数字
- 处理带前导零的字符串

### formatDate(date)

格式化日期。

```javascript
formatDate(date: Date | number | string): string
```

**返回值**: "YYYY-MM-DD"

**示例**:
```javascript
formatDate(new Date());              // "2026-01-30"
formatDate(Date.now());              // "2026-01-30"
formatDate('2026-01-30T10:00:00');   // "2026-01-30"
```

### formatDateTime(date)

格式化日期时间。

```javascript
formatDateTime(date: Date | number | string): string
```

**返回值**: "YYYY-MM-DD HH:mm:ss"

### truncateText(text, maxLength, suffix)

截断文本。

```javascript
truncateText(
  text: string,
  maxLength: number = 50,
  suffix: string = '...'
): string
```

**示例**:
```javascript
truncateText('这是一段很长的文本', 5);
// 输出: "这是一段很..."
```

### generateRandomId(length)

生成随机ID。

```javascript
generateRandomId(length: number = 8): string
```

**返回值**: 包含字母和数字的随机字符串

### formatFileSize(bytes)

格式化文件大小。

```javascript
formatFileSize(bytes: number): string
```

**返回值**:
- "0 B"
- "123 B"
- "1.23 KB"
- "1.23 MB"
- "1.23 GB"
- "1.23 TB"

**示例**:
```javascript
formatFileSize(1024);        // "1.00 KB"
formatFileSize(1048576);     // "1.00 MB"
```

### formatNumber(num)

格式化数字(添加千分位分隔符)。

```javascript
formatNumber(num: number): string
```

**示例**:
```javascript
formatNumber(1234567);       // "1,234,567"
formatNumber(1234.56);       // "1,234.56"
```

### parseCodeBlocks(text)

解析代码块。

```javascript
parseCodeBlocks(text: string): Array<Object>
```

**返回值**:
```javascript
[
  {
    language: 'javascript',
    code: 'const x = 1;'
  },
  ...
]
```

### escapeHtml(text)

转义HTML特殊字符。

```javascript
escapeHtml(text: string): string
```

**功能**:
- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`
- `"` → `&quot;`
- `'` → `&#039;`

---

## helpers.js - 通用辅助函数

### sleep(ms)

异步延迟。

```javascript
async sleep(ms: number): Promise<void>
```

**示例**:
```javascript
await sleep(1000);  // 等待1秒
```

### formatDateTime(date)

格式化日期时间(本地化)。

```javascript
formatDateTime(date: Date | string): string
```

**返回值**: 本地化的日期时间字符串

### formatTime()

格式化当前时间。

```javascript
formatTime(): string
```

**返回值**: "HH:mm"

### generateId()

生成唯一ID。

```javascript
generateId(): string
```

**返回值**: "timestamp_randomstring"

### vibrate(duration)

触发设备震动。

```javascript
vibrate(duration: number = 30)
```

**功能**:
- 仅在支持的设备上生效
- 默认震动30ms

### isMobile()

检测是否为移动设备。

```javascript
isMobile(): boolean
```

**返回值**: true表示移动设备

### getFileExtension(filename)

获取文件扩展名。

```javascript
getFileExtension(filename: string): string
```

**示例**:
```javascript
getFileExtension('document.pdf');    // "pdf"
getFileExtension('image.PNG');       // "png"
getFileExtension('archive.tar.gz');  // "gz"
```

### truncateText(text, maxLength, suffix)

截断文本。

```javascript
truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string
```

### autoResize(textarea)

自动调整textarea高度。

```javascript
autoResize(textarea: HTMLTextAreaElement)
```

---

## icons.js - 图标管理

### getIcon(name)

获取图标HTML。

```javascript
getIcon(name: string): string
```

**支持的图标**:
- `send` - 发送图标
- `mic` - 麦克风图标
- `stop` - 停止图标
- `menu` - 菜单图标
- `close` - 关闭图标
- `delete` - 删除图标
- `edit` - 编辑图标
- `copy` - 复制图标
- `download` - 下载图标
- `share` - 分享图标
- `settings` - 设置图标
- `user` - 用户图标
- `robot` - 机器人图标
- `check` - 勾选图标
- `error` - 错误图标
- `warning` - 警告图标
- `info` - 信息图标

**示例**:
```javascript
const sendIcon = getIcon('send');
button.innerHTML = sendIcon;
```

### createIcon(name, className)

创建图标元素。

```javascript
createIcon(name: string, className: string = ''): HTMLElement
```

**示例**:
```javascript
const icon = createIcon('send', 'icon-large');
button.appendChild(icon);
```

---

## 使用示例

### DOM操作

```javascript
// 显示/隐藏元素
showElement('modal');
hideElement('loading');
toggleElement('sidebar');

// CSS类操作
addClass('button', 'active');
removeClass('button', 'disabled');
toggleClass('menu', 'open');

// 滚动和聚焦
scrollToBottom();
focusInput('searchBox');
```

### 格式化

```javascript
// 时间格式化
const relativeTime = formatTime(timestamp);
const date = formatDate(new Date());
const datetime = formatDateTime(new Date());

// 文本处理
const short = truncateText(longText, 100);
const escaped = escapeHtml(userInput);

// 数字格式化
const size = formatFileSize(fileBytes);
const number = formatNumber(1234567);
```

### 辅助函数

```javascript
// 延迟执行
await sleep(1000);

// 设备检测
if (isMobile()) {
  // 移动端逻辑
}

// ID生成
const id = generateId();
const chatId = generateChatId();

// 文件处理
const ext = getFileExtension(filename);
```

---

## 最佳实践

### 1. 错误处理

```javascript
try {
  const element = document.getElementById('myElement');
  if (element) {
    showElement(element);
  }
} catch (error) {
  console.error('DOM操作失败:', error);
}
```

### 2. 性能优化

```javascript
// 批量DOM操作
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const el = createIcon(item.icon);
  fragment.appendChild(el);
});
container.appendChild(fragment);
```

### 3. 类型检查

```javascript
// 检查参数类型
function safeFormatTime(timestamp) {
  if (typeof timestamp !== 'number') {
    return '';
  }
  return formatTime(timestamp);
}
```

---

## 测试

工具函数包含完整的单元测试:

```bash
# 运行工具函数测试
npm test -- utils

# 查看覆盖率
npm run test:coverage -- utils
```

**测试覆盖率**:
- dom.js: 92.85%
- format.js: 98.36%
- helpers.js: 90%+

---

## 常见问题

### Q: 如何添加新的工具函数?

A:
1. 在相应的文件中添加函数
2. 添加JSDoc注释
3. 导出函数
4. 编写单元测试
5. 更新文档

### Q: 工具函数是否支持ES模块?

A: 是的,所有工具函数都支持ES模块导入:

```javascript
import { formatTime, truncateText } from './utils/format.js';
```

### Q: 如何处理浏览器兼容性?

A: 工具函数已考虑主流浏览器兼容性,对于不支持的API会提供降级方案。

---

## 相关文档

- [架构设计](../architecture.md)
- [测试指南](../TESTING.md)
- [快速开始](../guides/getting-started.md)
