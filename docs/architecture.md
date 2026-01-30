# ThinkCraft 架构设计

## 整体架构

ThinkCraft 采用模块化架构，将功能拆分为独立的模块，便于维护和扩展。

### 架构图

```
┌─────────────────────────────────────────────┐
│           index.html (入口)                  │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼────┐                 ┌───▼────┐
│ 核心层 │                 │ 模块层 │
└───┬────┘                 └───┬────┘
    │                          │
    ├─ state-manager           ├─ chat/
    ├─ api-client              │  ├─ typing-effect
    ├─ storage-manager         │  ├─ message-handler
    └─ modal-manager           │  ├─ chat-list
                               │  └─ chat-manager
                               │
                               ├─ report/
                               │  ├─ report-viewer
                               │  ├─ report-generator
                               │  └─ share-card
                               │
                               ├─ input-handler
                               ├─ knowledge-base
                               ├─ project-manager
                               ├─ agent-collaboration
                               │
                               └─ utils/
                                  ├─ icons
                                  ├─ dom
                                  ├─ format
                                  └─ helpers
```

## 模块职责

### 核心层

#### state-manager.js

**职责**: 全局状态管理

**核心功能**:

- 管理应用状态（消息、对话、用户设置等）
- 提供状态访问和修改接口
- 状态持久化

**关键数据结构**:

```javascript
state = {
  currentChat: null, // 当前对话ID
  messages: [], // 消息列表
  chats: [], // 对话列表
  settings: {}, // 用户设置
  userData: {}, // 用户数据
  typingChatId: null, // 正在打字的对话ID
  pendingChatIds: new Set(), // 等待响应的对话ID集合
  autoScrollLocked: false, // 自动滚动锁定状态
  autoScrollEnabled: true // 自动滚动启用状态
};
```

#### api-client.js

**职责**: API请求封装

**核心功能**:

- 封装所有后端API调用
- 处理请求和响应
- 错误处理和重试机制

**主要方法**:

- `sendMessage(message)` - 发送消息
- `generateReport(chatId, type)` - 生成报告
- `uploadImage(file)` - 上传图片

#### storage-manager.js

**职责**: 数据持久化

**核心功能**:

- IndexedDB 数据存储
- LocalStorage 配置存储
- 数据导入导出

**主要方法**:

- `saveChat(chat)` - 保存对话
- `getChat(chatId)` - 获取对话
- `deleteChat(chatId)` - 删除对话
- `saveProject(project)` - 保存项目
- `getProject(projectId)` - 获取项目

#### modal-manager.js

**职责**: 模态框管理

**核心功能**:

- 显示和隐藏模态框
- 模态框内容管理
- 模态框事件处理

### 模块层

#### chat/ - 聊天模块

##### typing-effect.js

**职责**: 打字机效果

**核心功能**:

- AI回复的打字机动画
- 支持Markdown渲染
- 支持代码高亮

**主要类**: `TypingEffect`

**核心方法**:

- `typeWriter(element, text, speed, chatId)` - 基础打字机效果
- `typeWriterWithCompletion(element, text, speed, chatId, onComplete)` - 带完成回调的打字机效果

##### message-handler.js

**职责**: 消息处理

**核心功能**:

- 消息发送和接收
- 消息显示和渲染
- 快速回复

**主要类**: `MessageHandler`

**核心方法**:

- `sendMessage()` - 发送消息
- `addMessage(role, content, ...)` - 添加消息到界面
- `handleAPIResponse(content)` - 处理API响应
- `quickReply(text)` - 快速回复

##### chat-list.js

**职责**: 对话列表管理

**核心功能**:

- 对话列表加载和显示
- 对话创建、重命名、删除
- 对话固定和标签管理

**主要类**: `ChatList`

**核心方法**:

- `loadChats()` - 加载对话列表
- `startNewChat()` - 开始新对话
- `renameChat(chatId, newTitle)` - 重命名对话
- `deleteChat(chatId)` - 删除对话
- `togglePinChat(chatId)` - 固定/取消固定对话

##### chat-manager.js

**职责**: 对话管理

**核心功能**:

- 对话保存和加载
- 对话菜单交互
- Portal模式菜单

**主要类**: `ChatManager`

**核心方法**:

- `loadChat(id)` - 加载对话
- `saveCurrentChat()` - 保存当前对话
- `toggleChatMenu(e, chatId)` - 切换对话菜单
- `portalChatMenu(menu, chatId)` - Portal模式菜单

#### report/ - 报告模块

##### report-viewer.js

**职责**: 报告查看

**核心功能**:

- 报告渲染和显示
- 6章节报告结构
- Markdown渲染

**主要类**: `ReportViewer`

**核心方法**:

- `viewReport(reportData)` - 查看报告
- `renderAIReport(reportData)` - 渲染AI报告
- `renderChapter(chapter, index)` - 渲染章节

##### report-generator.js

**职责**: 报告生成

**核心功能**:

- 报告生成和缓存
- 报告导出
- 生成状态管理

**主要类**: `ReportGenerator`

**核心方法**:

- `generateDetailedReport(force)` - 生成详细报告
- `prefetchAnalysisReport()` - 预取分析报告
- `exportFullReport()` - 导出完整报告
- `loadGenerationStates(chatId)` - 加载生成状态

##### share-card.js

**职责**: 分享卡片

**核心功能**:

- 生成分享卡片
- 下载分享图片
- 分享链接生成

**主要类**: `ShareCard`

#### input-handler.js

**职责**: 输入处理

**核心功能**:

- 文本输入处理
- 语音输入（Web Speech API）
- 图片上传和识别
- 智能输入模式检测

**主要类**: `InputHandler`

**核心方法**:

- `handleVoice()` - 处理语音输入
- `handleCamera()` - 处理相机
- `handleImageUpload()` - 处理图片上传
- `processImageFile(file)` - 处理图片文件
- `getSmartInputMode()` - 智能检测最佳输入方式

#### knowledge-base.js

**职责**: 知识库管理

**核心功能**:

- 知识创建、编辑、删除
- 知识搜索和过滤
- 多维度组织（项目、类型、时间线、标签）

**主要类**: `KnowledgeBase`

**核心方法**:

- `showKnowledgeBase(mode, projectId)` - 显示知识库
- `loadKnowledgeData(mode, projectId)` - 加载知识数据
- `createKnowledge()` - 创建知识
- `viewKnowledge(id)` - 查看知识详情
- `renderByProject/Type/Timeline/Tags()` - 多维度渲染

#### project-manager.js

**职责**: 项目管理

**核心功能**:

- 项目创建、编辑、删除
- 项目成员管理
- 工作流执行

**主要类**: `ProjectManager`

#### agent-collaboration.js

**职责**: Agent协作

**核心功能**:

- 协作模式建议
- Agent推荐
- 协作执行

**主要类**: `AgentCollaboration`

#### utils/ - 工具函数

##### icons.js

**职责**: 图标处理

**核心功能**:

- SVG图标生成
- Agent图标管理
- 图标缓存

**主要函数**:

- `getDefaultIconSvg(seed, size)` - 获取默认图标
- `getAgentIconSvg(seed, size)` - 获取Agent图标
- `buildIconSvg(config)` - 构建SVG图标

##### dom.js

**职责**: DOM操作

**核心功能**:

- 元素显示/隐藏
- CSS类操作
- 滚动控制

**主要函数**:

- `autoResize(textarea)` - 自动调整textarea高度
- `scrollToBottom(force)` - 滚动到底部
- `focusInput(inputId)` - 聚焦输入框
- `showElement/hideElement/toggleElement()` - 元素显示控制
- `addClass/removeClass/toggleClass()` - CSS类操作

##### format.js

**职责**: 格式化工具

**核心功能**:

- 时间格式化
- ID生成
- 文本处理

**主要函数**:

- `formatTime(timestamp)` - 格式化时间戳
- `generateChatId()` - 生成聊天ID
- `formatDate/formatDateTime()` - 格式化日期
- `truncateText(text, maxLength)` - 截断文本
- `escapeHtml(text)` - 转义HTML

##### helpers.js

**职责**: 通用辅助函数

**核心功能**:

- 异步工具
- 剪贴板操作
- 设备检测

**主要函数**:

- `sleep(ms)` - 睡眠函数
- `copyToClipboard(text)` - 复制到剪贴板
- `isMobile()` - 检测移动设备
- `vibrate(duration)` - 震动反馈
- `getFileExtension(filename)` - 获取文件扩展名

## 数据流

### 消息发送流程

```
用户输入 → MessageHandler.sendMessage()
    ↓
检查状态 (isCurrentChatBusy)
    ↓
添加用户消息 (addMessage)
    ↓
调用API (apiClient.sendMessage)
    ↓
处理响应 (handleAPIResponse)
    ↓
显示AI回复 (typeWriter)
    ↓
保存到Storage (storageManager.saveChat)
    ↓
更新State (state.messages)
```

### 报告生成流程

```
用户点击生成 → ReportGenerator.generateDetailedReport()
    ↓
检查缓存 (fetchCachedAnalysisReport)
    ↓
调用API (apiClient.generateReport)
    ↓
保存缓存 (storageManager.saveReport)
    ↓
渲染报告 (ReportViewer.renderAIReport)
    ↓
更新按钮状态 (updateGenerationButtonState)
```

### 对话加载流程

```
用户选择对话 → ChatList.loadChat(id)
    ↓
从Storage加载 (storageManager.getChat)
    ↓
更新State (state.currentChat, state.messages)
    ↓
渲染消息列表 (MessageHandler.addMessage)
    ↓
滚动到底部 (scrollToBottom)
    ↓
聚焦输入框 (focusInput)
```

## 设计模式

### 单例模式

所有管理器类（StateManager, ApiClient, StorageManager等）都采用单例模式，确保全局只有一个实例。

```javascript
class StateManager {
  constructor() {
    if (StateManager.instance) {
      return StateManager.instance;
    }
    StateManager.instance = this;
    // ...
  }
}
```

### 观察者模式

状态变化时通知相关模块更新UI。

### 工厂模式

图标生成使用工厂模式，根据不同类型生成不同的图标。

### 策略模式

输入处理根据不同设备和环境采用不同的策略（文本/语音）。

## 性能优化

### 1. 懒加载

- 模块按需加载
- 图片懒加载
- 报告按需生成

### 2. 缓存机制

- 报告缓存（IndexedDB）
- 图标缓存（内存）
- API响应缓存

### 3. 防抖和节流

- 输入框自动调整大小（防抖）
- 滚动事件处理（节流）
- 搜索输入（防抖）

### 4. 虚拟滚动

- 长对话列表使用虚拟滚动
- 减少DOM节点数量

## 安全性

### 1. XSS防护

- 所有用户输入都经过HTML转义
- Markdown渲染使用安全的库

### 2. CSRF防护

- API请求包含CSRF令牌

### 3. 数据加密

- 敏感数据加密存储
- HTTPS传输

## 可扩展性

### 1. 模块化设计

- 功能模块独立
- 接口清晰
- 易于添加新模块

### 2. 插件系统

- 支持第三方插件
- 插件生命周期管理

### 3. 主题系统

- 支持自定义主题
- 深色/浅色模式

## 测试策略

### 1. 单元测试

- 工具函数：100%覆盖率
- 核心模块：80%+覆盖率
- UI组件：60%+覆盖率

### 2. 集成测试

- 完整的用户流程测试
- API集成测试

### 3. E2E测试

- 关键业务流程测试

## 部署架构

### 前端部署

- 静态文件托管（CDN）
- Service Worker（PWA）
- 离线支持

### 后端部署

- API服务器
- 数据库
- 缓存服务器

---

**最后更新**: 2026-01-30
**文档版本**: v1.0
