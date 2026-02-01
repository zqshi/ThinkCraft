# 聊天模块文档

## 概述

聊天模块负责处理用户与AI的对话交互,包括消息发送、接收、显示和历史管理。

## 模块结构

```
frontend/js/modules/chat/
├── message-handler.js      # 消息处理核心
├── typing-effect.js         # 打字机效果
├── chat-list.js            # 对话历史管理
└── chat-manager.js         # 对话状态管理
```

## 核心类

### MessageHandler

负责消息的发送、接收和显示。

**主要方法**:

#### `sendMessage()`

发送用户消息到服务器。

```javascript
async sendMessage()
```

**功能**:
- 获取用户输入
- 创建新对话(如果需要)
- 发送消息到API
- 处理响应
- 更新UI

**流程**:
1. 检查输入框内容
2. 检查对话是否忙碌
3. 创建或获取当前对话ID
4. 添加用户消息到UI
5. 调用后端API
6. 处理AI回复
7. 保存到localStorage

#### `addMessage(role, content, quickReplies, showButtons, skipTyping, skipStatePush)`

添加消息到界面。

```javascript
addMessage(
  role: string,              // 'user' 或 'assistant'
  content: string,           // 消息内容
  quickReplies: Array,       // 快捷回复选项
  showButtons: boolean,      // 是否显示操作按钮
  skipTyping: boolean,       // 是否跳过打字机效果
  skipStatePush: boolean     // 是否跳过添加到state
): HTMLElement
```

**返回值**: 创建的消息DOM元素

**示例**:
```javascript
const messageDiv = messageHandler.addMessage(
  'user',
  '你好',
  null,
  false,
  false,
  false
);
```

#### `handleAPIResponse(data, chatId)`

处理API响应。

```javascript
async handleAPIResponse(data: Object, chatId: number)
```

**功能**:
- 解析API响应
- 显示AI回复
- 处理快捷回复
- 更新对话状态

#### `isCurrentChatBusy()`

检查当前对话是否忙碌。

```javascript
isCurrentChatBusy(): boolean
```

**返回值**: 如果当前对话正在处理消息则返回true

---

### TypingEffect

负责AI回复的打字机动画效果。

**主要方法**:

#### `typeWriter(element, text, speed)`

基础打字机效果。

```javascript
async typeWriter(
  element: HTMLElement,      // 目标元素
  text: string,              // 要显示的文本
  speed: number              // 打字速度(ms)
)
```

**功能**:
- 逐字显示文本
- 支持Markdown渲染
- 支持代码块高亮
- 自动滚动

**示例**:
```javascript
const typingEffect = new TypingEffect();
await typingEffect.typeWriter(messageDiv, 'Hello World', 30);
```

#### `typeWriterWithCompletion(element, text, speed, onComplete)`

带完成回调的打字机效果。

```javascript
async typeWriterWithCompletion(
  element: HTMLElement,
  text: string,
  speed: number,
  onComplete: Function       // 完成回调
)
```

**功能**:
- 与typeWriter相同
- 完成后执行回调函数

**示例**:
```javascript
await typingEffect.typeWriterWithCompletion(
  messageDiv,
  'Hello World',
  30,
  (element) => {
    console.log('打字完成');
  }
);
```

---

### ChatList

负责对话历史的管理。

**主要方法**:

#### `loadChats()`

加载对话列表。

```javascript
loadChats()
```

**功能**:
- 从localStorage加载对话
- 渲染对话列表
- 更新UI显示

#### `startNewChat()`

开始新对话。

```javascript
startNewChat()
```

**功能**:
- 清空当前消息
- 重置对话状态
- 更新UI

#### `deleteChat(chatId)`

删除指定对话。

```javascript
deleteChat(chatId: number)
```

**功能**:
- 从localStorage删除
- 更新UI
- 如果是当前对话则清空

---

### ChatManager

负责对话状态管理。

**主要方法**:

#### `saveCurrentChat()`

保存当前对话。

```javascript
saveCurrentChat()
```

**功能**:
- 自动提取标题
- 区分新建和更新
- 持久化到localStorage

#### `loadChat(chatId)`

加载指定对话。

```javascript
loadChat(chatId: number)
```

**功能**:
- 保存当前对话
- 加载消息和状态
- 更新UI显示

#### `toggleChatMenu(e, chatId)`

切换菜单显示。

```javascript
toggleChatMenu(e: Event, chatId: number)
```

**功能**:
- Portal模式避免裁剪
- 自动关闭其他菜单
- 动态定位

---

## 数据结构

### Chat对象

```javascript
{
  id: number,                    // 对话ID
  title: string,                 // 对话标题
  messages: Array<Message>,      // 消息列表
  userData: Object,              // 用户数据
  conversationStep: number,      // 对话步骤
  analysisCompleted: boolean,    // 分析是否完成
  createdAt: string,             // 创建时间(ISO)
  updatedAt: string              // 更新时间(ISO)
}
```

### Message对象

```javascript
{
  role: string,                  // 'user' 或 'assistant'
  content: string,               // 消息内容
  quickReplies: Array<string>,   // 快捷回复(可选)
  timestamp: number              // 时间戳(可选)
}
```

---

## 状态管理

聊天模块使用全局`state`对象管理状态:

```javascript
window.state = {
  currentChat: number,           // 当前对话ID
  chats: Array<Chat>,            // 对话列表
  messages: Array<Message>,      // 当前消息列表
  conversationStep: number,      // 对话步骤
  analysisCompleted: boolean,    // 分析完成标志
  typingChatId: number,          // 正在打字的对话ID
  autoScrollEnabled: boolean,    // 自动滚动开关
  autoScrollLocked: boolean,     // 自动滚动锁定
  pendingChatIds: Set<number>,   // 待处理的对话ID
  isLoading: boolean             // 加载状态
}
```

---

## API接口

### 发送消息

```
POST /api/chat
```

**请求体**:
```json
{
  "message": "用户消息",
  "chatId": 123,
  "userData": {},
  "conversationStep": 1
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "reply": "AI回复",
    "quickReplies": ["选项1", "选项2"],
    "analysisCompleted": false
  }
}
```

---

## 使用示例

### 发送消息

```javascript
// 获取MessageHandler实例
const messageHandler = new MessageHandler();

// 发送消息
await messageHandler.sendMessage();
```

### 添加消息

```javascript
// 添加用户消息
messageHandler.addMessage('user', '你好', null, false, false, false);

// 添加AI回复(带打字机效果)
messageHandler.addMessage('assistant', 'Hello!', null, true, false, false);

// 添加AI回复(无打字机效果)
messageHandler.addMessage('assistant', 'Hello!', null, true, true, false);
```

### 加载对话

```javascript
// 获取ChatManager实例
const chatManager = new ChatManager();

// 加载指定对话
chatManager.loadChat(123);
```

### 保存对话

```javascript
// 保存当前对话
chatManager.saveCurrentChat();
```

---

## 最佳实践

### 1. 错误处理

始终使用try-catch包裹API调用:

```javascript
try {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  // 处理响应
} catch (error) {
  console.error('发送消息失败:', error);
  // 显示错误提示
}
```

### 2. 状态同步

确保UI和state保持同步:

```javascript
// 更新state
state.messages.push(message);

// 同步到localStorage
localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));

// 更新UI
loadChats();
```

### 3. 性能优化

- 使用防抖处理频繁操作
- 懒加载历史消息
- 虚拟滚动处理大量消息

### 4. 用户体验

- 显示加载状态
- 提供错误提示
- 支持重试机制
- 自动保存草稿

---

## 测试

聊天模块包含完整的单元测试:

```bash
# 运行聊天模块测试
npm test -- chat

# 查看覆盖率
npm run test:coverage -- chat
```

---

## 常见问题

### Q: 如何禁用打字机效果?

A: 在调用`addMessage`时设置`skipTyping`为`true`:

```javascript
messageHandler.addMessage('assistant', 'Hello!', null, true, true, false);
```

### Q: 如何自定义打字速度?

A: 修改`TypingEffect`类的默认速度参数:

```javascript
const typingEffect = new TypingEffect();
await typingEffect.typeWriter(element, text, 50); // 50ms每字符
```

### Q: 如何处理长消息?

A: 使用分页或虚拟滚动:

```javascript
// 分页加载
const pageSize = 50;
const messages = state.messages.slice(0, pageSize);
```

---

## 相关文档

- [架构设计](../architecture.md)
- [API文档](../api/message-handler.md)
- [测试指南](../TESTING.md)
- [快速开始](../guides/getting-started.md)
