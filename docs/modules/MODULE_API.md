# ThinkCraft 模块API文档

## 概述

本文档描述ThinkCraft模块化架构中各个模块的公共API接口。

---

## 核心模块

### StateManager (core/state-manager.js)

**职责**: 全局状态管理

**API**:

```javascript
// 获取状态
const currentState = window.stateManager.getState();

// 更新状态
window.stateManager.setState({ key: value });

// 订阅状态变化
window.stateManager.subscribe((newState) => {
  console.log('状态已更新:', newState);
});

// 重置状态
window.stateManager.reset();
```

**状态结构**:
```javascript
{
  currentChatId: string,
  chats: Array<Chat>,
  generation: {
    isGenerating: boolean,
    currentChapter: string,
    progress: number
  },
  settings: {
    apiUrl: string,
    model: string,
    temperature: number
  }
}
```

---

## 聊天系统

### MessageHandler (modules/chat/message-handler.js)

**职责**: 处理消息发送和接收

**API**:

```javascript
// 发送消息
await window.messageHandler.sendMessage(content, options);

// 添加消息到界面
window.messageHandler.addMessage({
  role: 'user' | 'assistant',
  content: string,
  timestamp: number
});

// 处理API响应
await window.messageHandler.handleAPIResponse(response);
```

**参数说明**:
- `content`: 消息内容
- `options`: 可选配置
  - `images`: 图片数组（Base64）
  - `context`: 上下文信息

### ChatList (modules/chat/chat-list.js)

**职责**: 管理对话列表

**API**:

```javascript
// 创建新对话
window.chatList.startNewChat();

// 加载对话列表
window.chatList.loadChats();

// 重命名对话
window.chatList.renameChat(chatId, newName);

// 删除对话
window.chatList.deleteChat(chatId);

// 置顶/取消置顶
window.chatList.togglePinChat(chatId);

// 清空所有历史
window.chatList.clearAllHistory();
```

### TypingEffect (modules/chat/typing-effect.js)

**职责**: 打字机效果

**API**:

```javascript
// 基础打字机效果
typeWriter(element, text, speed, callback);

// 带完成回调的打字机效果
typeWriterWithCompletion(element, text, speed, onComplete);
```

**参数说明**:
- `element`: DOM元素
- `text`: 要显示的文本
- `speed`: 打字速度（毫秒/字符）
- `callback/onComplete`: 完成回调

---

## 报告生成系统

### ReportGenerator (modules/report/report-generator.js)

**职责**: 生成和导出报告

**API**:

```javascript
// 生成完整报告
await window.reportGenerator.exportFullReport();

// 预加载报告数据
await window.reportGenerator.prefetchAnalysisReport();

// 更新生成按钮状态
window.reportGenerator.updateGenerationButtonState(generationState);

// 生成PDF
await window.reportGenerator.generatePDF(reportData);
```

**全局桥接**:
```javascript
window.exportFullReport(); // 自动懒加载并调用
```

### ReportViewer (modules/report/report-viewer.js)

**职责**: 查看生成的报告

**API**:

```javascript
// 查看报告
window.reportViewer.viewGeneratedReport(reportId);

// 关闭报告查看器
window.reportViewer.closeReportViewer();
```

### ShareCard (modules/report/share-card.js)

**职责**: 生成分享链接和卡片

**API**:

```javascript
// 生成分享链接
await window.shareCard.generateShareLink(reportData);

// 复制分享链接
window.shareCard.copyShareLink(url);
```

**全局桥接**:
```javascript
window.generateShareLink(); // 自动懒加载并调用
```

---

## Agent协作系统

### AgentCollaboration (modules/agent-collaboration.js)

**职责**: Agent雇佣、任务分配、团队协作

**API**:

```javascript
// 显示Agent管理界面
window.agentCollaboration.showAgentManagement();

// 初始化Agent系统
window.agentCollaboration.initAgentSystem();

// 加载我的Agents
window.agentCollaboration.loadMyAgents();

// 雇佣Agent
await window.agentCollaboration.hireAgent(agentType);

// 解雇Agent
await window.agentCollaboration.fireAgent(agentId);

// 分配任务给Agent
await window.agentCollaboration.assignTaskToAgent(agentId, task);

// 开始团队协作
await window.agentCollaboration.startTeamCollaboration(projectId);
```

**全局桥接**:
```javascript
window.showAgentManagement(); // 自动懒加载并调用
window.initAgentSystem(); // 自动懒加载并调用
```

---

## 项目管理系统

### ProjectManager (modules/project-manager.js)

**职责**: 项目创建、管理、关联

**API**:

```javascript
// 创建新项目
window.projectManager.createNewProject();

// 打开项目
window.projectManager.openProject(projectId);

// 渲染项目详情
window.projectManager.renderProjectDetail(project);

// 关联想法到项目
window.projectManager.linkIdeaToProject(ideaId, projectId);

// 删除项目
await window.projectManager.deleteProject(projectId);

// 更新项目
await window.projectManager.updateProject(projectId, updates);
```

**全局桥接**:
```javascript
window.createNewProject(); // 自动懒加载并调用
```

---

## 知识库系统

### KnowledgeBase (modules/knowledge-base.js)

**职责**: 知识管理和检索

**API**:

```javascript
// 显示知识库
window.knowledgeBase.showKnowledgeBase(mode, projectId);

// 关闭知识库面板
window.knowledgeBase.closeKnowledgePanel();

// 加载知识数据
await window.knowledgeBase.loadKnowledgeData();

// 渲染知识列表
window.knowledgeBase.renderKnowledgeList(knowledgeList);

// 查看知识详情
window.knowledgeBase.viewKnowledge(knowledgeId);

// 创建知识
await window.knowledgeBase.createKnowledge(knowledgeData);

// 更新知识
await window.knowledgeBase.updateKnowledge(knowledgeId, updates);

// 删除知识
await window.knowledgeBase.deleteKnowledge(knowledgeId);
```

**全局桥接**:
```javascript
window.showKnowledgeBase(mode, projectId); // 自动懒加载并调用
```

**参数说明**:
- `mode`: 'view' | 'select' | 'manage'
- `projectId`: 项目ID（可选）

---

## 输入处理系统

### InputHandler (modules/input-handler.js)

**职责**: 处理语音输入、图片上传、相机拍照

**API**:

```javascript
// 初始化
window.inputHandler.init();

// 语音输入
window.inputHandler.handleVoice();

// 图片上传
window.inputHandler.handleImageUpload();

// 相机拍照
window.inputHandler.handleCamera();

// 初始化语音输入
window.inputHandler.initVoiceInput();

// 切换到语音模式
window.inputHandler.switchToVoiceMode();

// 切换到文本模式
window.inputHandler.switchToTextMode();

// 请求麦克风权限
await window.inputHandler.requestMicrophonePermission();
```

**全局桥接**:
```javascript
window.handleVoice(); // 自动懒加载并调用
window.handleImageUpload(); // 自动懒加载并调用
```

---

## 商业计划书生成器

### BusinessPlanGenerator (modules/business-plan-generator.js)

**职责**: 生成商业计划书

**API**:

```javascript
// 生成商业计划书
await window.businessPlanGenerator.generateBusinessPlan(projectData);

// 生成特定章节
await window.businessPlanGenerator.generateChapter(chapterName);

// 导出为PDF
await window.businessPlanGenerator.exportToPDF();
```

---

## 新手引导系统

### OnboardingManager (modules/onboarding/onboarding-manager.js)

**职责**: 新用户引导流程

**API**:

```javascript
// 初始化引导
window.onboardingManager.init();

// 显示特定步骤
window.onboardingManager.showStep(stepNumber);

// 完成引导
window.onboardingManager.finishOnboarding();

// 跳过引导
window.onboardingManager.skipOnboarding();
```

**全局桥接**:
```javascript
window.initOnboarding(); // 自动懒加载并调用
```

---

## 设置管理系统

### SettingsManager (modules/settings/settings-manager.js)

**职责**: 应用设置管理

**API**:

```javascript
// 显示设置界面
window.settingsManager.showSettings();

// 保存设置
await window.settingsManager.saveSettings(settings);

// 加载设置
window.settingsManager.loadSettings();

// 重置设置
window.settingsManager.resetSettings();
```

---

## 工具函数

### DOM工具 (utils/dom.js)

```javascript
// 自动调整文本框高度
autoResize(textarea);

// 滚动到底部
scrollToBottom(container, smooth);

// 聚焦输入框
focusInput();

// 锁定自动滚动
lockAutoScroll();

// 解锁自动滚动
unlockAutoScroll();
```

### 图标工具 (utils/icons.js)

```javascript
// 获取默认图标SVG
getDefaultIconSvg(iconName);

// 获取Agent图标SVG
getAgentIconSvg(agentType);

// 构建图标SVG
buildIconSvg(iconConfig);

// 解析Agent图标键
resolveAgentIconKey(agentType);
```

### 格式化工具 (utils/format.js)

```javascript
// 格式化时间
formatTime(timestamp);

// 格式化日期
formatDate(date);

// 格式化文件大小
formatFileSize(bytes);
```

### 应用辅助函数 (utils/app-helpers.js)

```javascript
// 生成对话ID
generateChatId();

// 处理图片文件
processImageFile(file);

// 文件转Base64
fileToBase64(file);

// 获取默认API URL
getDefaultApiUrl();
```

---

## 模块懒加载器

### ModuleLazyLoader (utils/module-lazy-loader.js)

**职责**: 按需加载模块，优化性能

**API**:

```javascript
// 加载模块
const module = await window.moduleLazyLoader.load('moduleName');

// 预加载高优先级模块
await window.moduleLazyLoader.preloadHighPriority();

// 预加载条件模块
await window.moduleLazyLoader.preloadConditional();

// 预加载所有模块
await window.moduleLazyLoader.preloadAll();

// 获取加载统计
const stats = window.moduleLazyLoader.getStats();

// 清除缓存
window.moduleLazyLoader.clearCache('moduleName');
```

**支持的模块名称**:
- `reportGenerator`
- `reportViewer`
- `shareCard`
- `businessPlanGenerator`
- `agentCollaboration`
- `projectManager`
- `knowledgeBase`
- `inputHandler`
- `onboardingManager`
- `settingsManager`
- `messageHandler`
- `chatList`

---

## 全局桥接函数

为了向后兼容，所有迁移的函数都在 `window` 对象上暴露了全局桥接函数：

```javascript
// 报告系统
window.exportFullReport()
window.generateShareLink()

// Agent系统
window.showAgentManagement()
window.initAgentSystem()

// 项目管理
window.createNewProject()

// 知识库
window.showKnowledgeBase(mode, projectId)

// 输入处理
window.handleVoice()
window.handleImageUpload()

// 新手引导
window.initOnboarding()
```

这些函数会自动懒加载对应的模块，无需手动调用 `moduleLazyLoader.load()`。

---

## 事件系统

### 自定义事件

模块间通过自定义事件通信：

```javascript
// 发送事件
window.dispatchEvent(new CustomEvent('chat:message:sent', {
  detail: { chatId, message }
}));

// 监听事件
window.addEventListener('chat:message:sent', (event) => {
  console.log('消息已发送:', event.detail);
});
```

**支持的事件**:
- `chat:message:sent` - 消息发送
- `chat:message:received` - 消息接收
- `report:generated` - 报告生成完成
- `agent:hired` - Agent雇佣成功
- `project:created` - 项目创建成功
- `knowledge:created` - 知识创建成功

---

## 错误处理

所有模块都遵循统一的错误处理规范：

```javascript
try {
  await window.moduleLazyLoader.load('moduleName');
} catch (error) {
  console.error('模块加载失败:', error);

  // 显示用户友好的错误提示
  alert('功能加载失败，请刷新页面重试');

  // 可选：上报错误到监控系统
  if (window.errorReporter) {
    window.errorReporter.report(error);
  }
}
```

---

## 性能监控

使用 Performance API 监控模块加载性能：

```javascript
// 标记开始
performance.mark('module-load-start');

// 加载模块
await window.moduleLazyLoader.load('moduleName');

// 标记结束
performance.mark('module-load-end');

// 测量耗时
performance.measure('module-load', 'module-load-start', 'module-load-end');

// 获取结果
const measure = performance.getEntriesByName('module-load')[0];
console.log(`模块加载耗时: ${measure.duration}ms`);
```

---

## 测试

### 单元测试

每个模块都有对应的测试文件：

```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test -- utils/dom.test.js

# 查看覆盖率
npm test -- --coverage
```

### 端到端测试

```bash
# 运行E2E测试
npm test -- tests/e2e/modular-refactor-validation.test.js
```

---

## 最佳实践

1. **使用懒加载**: 对于低优先级模块，使用 `moduleLazyLoader.load()` 按需加载
2. **错误处理**: 所有异步操作都要有 try-catch
3. **性能监控**: 使用 Performance API 监控关键操作
4. **事件通信**: 模块间通过自定义事件通信，避免直接依赖
5. **单一职责**: 每个模块只负责一个功能领域
6. **向后兼容**: 使用全局桥接函数确保旧代码仍可工作

---

**最后更新**: 2026-01-31
**版本**: 1.0.0
