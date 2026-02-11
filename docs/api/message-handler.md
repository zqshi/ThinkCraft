# MessageHandler API文档

## 类概述

`MessageHandler`类负责处理聊天消息的发送、接收和显示,是ThinkCraft聊天功能的核心组件。

## 构造函数

### `constructor()`

创建MessageHandler实例。

```javascript
const messageHandler = new MessageHandler();
```

**初始化**:

- 注入全局state依赖
- 设置事件监听器

---

## 公共方法

### `sendMessage()`

发送用户消息到服务器。

```javascript
async sendMessage(): Promise<void>
```

**功能**:

1. 获取用户输入(支持桌面端和移动端)
2. 验证输入和对话状态
3. 创建新对话(如果需要)
4. 添加用户消息到UI
5. 调用后端API
6. 处理AI回复
7. 保存到localStorage

**流程图**:

```
用户输入 → 验证 → 创建/获取对话 → 添加消息 → 调用API → 处理响应 → 保存状态
```

**错误处理**:

- 输入为空: 静默返回
- 对话忙碌: 静默返回
- API失败: 显示错误消息

**示例**:

```javascript
const handler = new MessageHandler();
await handler.sendMessage();
```

---

### `addMessage(role, content, quickReplies, showButtons, skipTyping, skipStatePush)`

添加消息到界面。

```javascript
addMessage(
  role: string,
  content: string,
  quickReplies: Array<string> | null = null,
  showButtons: boolean = false,
  skipTyping: boolean = false,
  skipStatePush: boolean = false
): HTMLElement
```

**参数**:

| 参数          | 类型                    | 默认值 | 说明                            |
| ------------- | ----------------------- | ------ | ------------------------------- |
| role          | string                  | -      | 消息角色: 'user' 或 'assistant' |
| content       | string                  | -      | 消息内容(支持Markdown)          |
| quickReplies  | Array\<string\> \| null | null   | 快捷回复选项                    |
| showButtons   | boolean                 | false  | 是否显示操作按钮                |
| skipTyping    | boolean                 | false  | 是否跳过打字机效果              |
| skipStatePush | boolean                 | false  | 是否跳过添加到state             |

**返回值**: 创建的消息DOM元素

**功能**:

- 创建消息DOM结构
- 应用打字机效果(AI消息)
- 渲染Markdown
- 代码高亮
- 添加快捷回复按钮
- 添加操作按钮(复制、重新生成等)

**示例**:

```javascript
// 添加用户消息
const userMsg = handler.addMessage('user', '你好');

// 添加AI回复(带打字机效果)
const aiMsg = handler.addMessage(
  'assistant',
  '你好!有什么我可以帮助你的吗?',
  ['告诉我更多', '开始新话题'],
  true,
  false,
  false
);

// 添加AI回复(无打字机效果)
const quickMsg = handler.addMessage('assistant', '收到!', null, false, true, false);
```

---

### `handleAPIResponse(data, chatId)`

处理API响应。

```javascript
async handleAPIResponse(data: Object, chatId: number): Promise<void>
```

**参数**:

- `data`: API响应数据
- `chatId`: 对话ID

**功能**:

- 解析响应数据
- 显示AI回复
- 处理快捷回复
- 更新对话状态
- 触发后续操作

**响应数据结构**:

```javascript
{
  code: 0,
  data: {
    reply: string,              // AI回复内容
    quickReplies: Array<string>, // 快捷回复选项
    analysisCompleted: boolean,  // 分析是否完成
    userData: Object,            // 更新的用户数据
    nextStep: string             // 下一步提示
  }
}
```

**示例**:

```javascript
const response = await fetch('/api/chat', { ... });
const data = await response.json();
await handler.handleAPIResponse(data, chatId);
```

---

### `isCurrentChatBusy()`

检查当前对话是否忙碌。

```javascript
isCurrentChatBusy(): boolean
```

**返回值**:

- `true`: 当前对话正在处理消息
- `false`: 当前对话空闲

**判断条件**:

- 正在打字(typingChatId === currentChat)
- 正在加载(pendingChatIds包含currentChat)

**示例**:

```javascript
if (handler.isCurrentChatBusy()) {
  console.log('对话忙碌中,请稍候');
  return;
}
```

---

## 私有方法

### `_createMessageElement(role, content)`

创建消息DOM元素(内部方法)。

```javascript
_createMessageElement(role: string, content: string): HTMLElement
```

### `_applyTypingEffect(element, content)`

应用打字机效果(内部方法)。

```javascript
async _applyTypingEffect(element: HTMLElement, content: string): Promise<void>
```

### `_renderMarkdown(content)`

渲染Markdown内容(内部方法)。

```javascript
_renderMarkdown(content: string): string
```

---

## 事件

MessageHandler会触发以下自定义事件:

### `message:sent`

消息发送成功时触发。

```javascript
window.addEventListener('message:sent', event => {
  console.log('消息已发送:', event.detail);
});
```

**事件数据**:

```javascript
{
  chatId: number,
  message: string,
  timestamp: number
}
```

### `message:received`

收到AI回复时触发。

```javascript
window.addEventListener('message:received', event => {
  console.log('收到回复:', event.detail);
});
```

**事件数据**:

```javascript
{
  chatId: number,
  reply: string,
  timestamp: number
}
```

### `message:error`

消息发送失败时触发。

```javascript
window.addEventListener('message:error', event => {
  console.error('发送失败:', event.detail);
});
```

**事件数据**:

```javascript
{
  chatId: number,
  error: Error,
  timestamp: number
}
```

---

## 状态管理

MessageHandler依赖全局`state`对象:

```javascript
window.state = {
  currentChat: number | null,      // 当前对话ID
  messages: Array<Message>,        // 当前消息列表
  conversationStep: number,        // 对话步骤
  analysisCompleted: boolean,      // 分析完成标志
  typingChatId: number | null,     // 正在打字的对话ID
  pendingChatIds: Set<number>,     // 待处理的对话ID
  isLoading: boolean,              // 加载状态
  autoScrollEnabled: boolean,      // 自动滚动开关
  userData: Object,                // 用户数据
  chats: Array<Chat>,              // 对话列表
  settings: {
    saveHistory: boolean,          // 是否保存历史
    apiUrl: string                 // API地址
  }
}
```

---

## 错误处理

### API错误

```javascript
try {
  await handler.sendMessage();
} catch (error) {
  if (error.name === 'NetworkError') {
    // 网络错误
    showError('网络连接失败,请检查网络');
  } else if (error.name === 'APIError') {
    // API错误
    showError('服务器错误,请稍后重试');
  } else {
    // 其他错误
    showError('发送失败,请重试');
  }
}
```

### 输入验证

```javascript
// 空输入
if (!message.trim()) {
  return; // 静默返回
}

// 对话忙碌
if (handler.isCurrentChatBusy()) {
  return; // 静默返回
}
```

---

## 性能优化

### 1. 防抖处理

```javascript
let sendTimeout;
function debouncedSend() {
  clearTimeout(sendTimeout);
  sendTimeout = setTimeout(() => {
    handler.sendMessage();
  }, 300);
}
```

### 2. 虚拟滚动

对于大量消息,使用虚拟滚动:

```javascript
// 只渲染可见区域的消息
const visibleMessages = messages.slice(startIndex, endIndex);
```

### 3. 懒加载

延迟加载历史消息:

```javascript
// 滚动到顶部时加载更多
container.addEventListener('scroll', () => {
  if (container.scrollTop === 0) {
    loadMoreMessages();
  }
});
```

---

## 测试

### 单元测试

```javascript
describe('MessageHandler', () => {
  test('应该发送消息', async () => {
    const handler = new MessageHandler();
    await handler.sendMessage();
    expect(state.messages.length).toBeGreaterThan(0);
  });

  test('应该添加消息到UI', () => {
    const handler = new MessageHandler();
    const element = handler.addMessage('user', '测试');
    expect(element).toBeDefined();
    expect(element.textContent).toContain('测试');
  });
});
```

### 集成测试

```javascript
describe('消息发送流程', () => {
  test('完整流程', async () => {
    // 1. 输入消息
    const input = document.getElementById('mainInput');
    input.value = '测试消息';

    // 2. 发送
    const handler = new MessageHandler();
    await handler.sendMessage();

    // 3. 验证
    expect(state.messages.length).toBe(1);
    expect(state.messages[0].content).toBe('测试消息');
  });
});
```

---

## 最佳实践

### 1. 始终检查对话状态

```javascript
if (handler.isCurrentChatBusy()) {
  return;
}
```

### 2. 使用try-catch包裹API调用

```javascript
try {
  await handler.sendMessage();
} catch (error) {
  console.error('发送失败:', error);
  showError('发送失败,请重试');
}
```

### 3. 及时清理事件监听器

```javascript
const listener = (event) => { ... };
window.addEventListener('message:sent', listener);

// 组件销毁时
window.removeEventListener('message:sent', listener);
```

### 4. 保持状态同步

```javascript
// 更新state
state.messages.push(message);

// 同步到localStorage
localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));

// 更新UI
loadChats();
```

---

## 相关文档

- [聊天模块文档](../modules/chat.md)
- [架构 ADR](../architecture/ADR-001-modular-refactor.md)
- [测试指南](../guides/testing.md)
