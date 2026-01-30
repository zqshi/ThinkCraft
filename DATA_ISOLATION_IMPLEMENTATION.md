# ThinkCraft 数据隔离实现文档

## 概述

本文档描述了 ThinkCraft 项目中实现的完整数据隔离方案，确保会话和项目之间的数据完全隔离，避免数据混淆。

## 数据隔离架构

### 1. 会话级数据隔离

**原则**：一个会话ID对应一个创意，所有会话相关数据通过 `chatId` 关联。

#### 1.1 会话关联的数据

- **对话记录** (`chats` 表)
  - 主键：`id` (chatId)
  - 包含：消息列表、用户数据、对话状态

- **分析报告** (`reports` 表)
  - 主键：`id`
  - 外键：`chatId` (关联到会话)
  - 索引：`chatId`、`type`、`timestamp`
  - 类型：`'business'` | `'proposal'`

- **商业计划书/产品立项材料**
  - 存储在 `reports` 表中
  - 通过 `chatId` 和 `type` 关联

- **PDF导出**
  - 基于当前会话的报告数据
  - 导出时携带 `chatId` 信息

- **分享链接**
  - 后端存储包含 `chatId` 字段
  - 确保分享内容与会话关联

#### 1.2 实现细节

**IndexedDB 索引优化**：
```javascript
// storage-manager.js
if (!db.objectStoreNames.contains('reports')) {
  const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
  reportsStore.createIndex('type', 'type', { unique: false });
  reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
  reportsStore.createIndex('chatId', 'chatId', { unique: false }); // 新增索引
}
```

**按会话查询报告**：
```javascript
// storage-manager.js
async getReportsByChatId(chatId) {
  if (!chatId) return [];
  return this.getByIndex('reports', 'chatId', String(chatId));
}

async getReportByChatIdAndType(chatId, type) {
  if (!chatId || !type) return null;
  const reports = await this.getReportsByChatId(chatId);
  return reports.find(r => r.type === type) || null;
}
```

**会话切换时加载报告**：
```javascript
// app-boot.js
async function loadGenerationStatesForChat(chatId) {
  resetGenerationButtons();
  if (!chatId) return;

  // 使用索引查询，提高效率
  const reports = await window.storageManager.getReportsByChatId(String(chatId));

  reports.forEach(report => {
    if (report.type === 'business' || report.type === 'proposal') {
      generatedReports[report.type] = {
        data: report.data,
        chatId: report.chatId,
        status: report.status,
        progress: report.progress,
        selectedChapters: report.selectedChapters,
        error: report.error
      };
      // 更新按钮状态...
    }
  });
}
```

**保存报告时关联会话**：
```javascript
// business-plan-generator.js
async saveReport(type, data) {
  const chatId = this.state.state.currentChat || window.state?.currentChat || null;
  const normalizedChatId = chatId ? String(chatId).trim() : null;

  await window.storageManager.saveReport({
    id: `${type}-${Date.now()}`,
    type,
    data,
    chatId: normalizedChatId, // 关键关联字段
    status: 'completed',
    // ...
  });
}
```

**分享链接包含会话ID**：
```javascript
// app-boot.js
async function generateShareLink() {
  const shareData = {
    ...reportData,
    chatId: state.currentChat,
    ideaTitle: state.userData.idea || '创意分析报告'
  };

  const response = await fetch(`${state.settings.apiUrl}/api/share/create`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'insight-report',
      data: shareData,
      title: state.userData.idea || '创意分析报告',
      chatId: state.currentChat  // 添加会话ID
    })
  });
}
```

---

### 2. 项目级数据隔离

**原则**：项目与创意一一对应，所有项目相关数据通过 `projectId` 关联。

#### 2.1 项目关联的数据

- **项目基本信息** (`projects` 表)
  - 主键：`id` (projectId)
  - 外键：`ideaId` (关联到会话ID)
  - 索引：`ideaId`、`mode`、`status`、`createdAt`、`updatedAt`

- **工作流阶段**
  - 存储在项目的 `workflow.stages` 数组中
  - 每个阶段包含：`id`、`name`、`status`、`artifacts`

- **交付物** (`artifacts` 表)
  - 主键：`id`
  - 外键：`projectId`、`stageId`
  - 索引：`projectId`、`stageId`、`type`、`createdAt`

- **项目成员**
  - 存储在项目的 `assignedAgents` 数组中
  - 包含 Agent ID 列表

- **协同建议**
  - 存储在项目的 `collaborationSuggestion` 字段中
  - 包含推荐的协作方式和成员

#### 2.2 实现细节

**项目与会话的关联**：
```
Chat (chatId)
  ↓ (作为 ideaId)
Project (projectId, ideaId)
  ↓
Workflow Stages → Artifacts
```

**创建项目时关联创意**：
```javascript
// project-manager.js
async createProject(ideaId, name) {
  // 统一转换为字符串，避免类型混淆
  const normalizedIdeaId = this.normalizeIdeaId(ideaId);

  // 检查该创意是否已创建项目
  const existing = await this.storageManager.getProjectByIdeaId(normalizedIdeaId);
  if (existing) {
    throw new Error('该创意已创建项目');
  }

  // 调用后端API创建项目（使用字符串ID）
  const response = await fetch(`${this.apiUrl}/api/projects`, {
    method: 'POST',
    body: JSON.stringify({ ideaId: normalizedIdeaId, name })
  });

  const project = result.data.project;
  project.ideaId = String(project.ideaId).trim(); // 确保是字符串

  await this.storageManager.saveProject(project);
  return project;
}
```

**根据创意查询项目**：
```javascript
// storage-manager.js
async getProjectByIdeaId(ideaId) {
  await this.ensureReady();

  // 统一转换为字符串，避免类型混淆
  const normalizedIdeaId = String(ideaId).trim();

  return new Promise((resolve, reject) => {
    const transaction = this.db.transaction(['projects'], 'readonly');
    const store = transaction.objectStore('projects');
    const index = store.index('ideaId');
    const request = index.get(normalizedIdeaId);

    request.onsuccess = () => {
      const project = request.result || null;
      // 排除已删除的项目
      if (project && project.status === 'deleted') {
        resolve(null);
      } else {
        resolve(project);
      }
    };
  });
}
```

**交付物与项目的关联**：
```javascript
// storage-manager.js
async getArtifactsByProject(projectId) {
  return this.getByIndex('artifacts', 'projectId', projectId);
}

async saveArtifact(artifact) {
  // 确保包含 projectId
  if (!artifact.projectId) {
    throw new Error('Artifact must have projectId');
  }
  return this.save('artifacts', artifact);
}
```

---

### 3. ID 类型统一

**问题**：历史代码中 `chatId` 和 `ideaId` 可能是数字或字符串，导致比较失败。

**解决方案**：统一所有ID为字符串类型。

#### 3.1 ID 规范化方法

```javascript
// project-manager.js
/**
 * 规范化 ideaId：统一转换为字符串
 */
normalizeIdeaId(value) {
  if (value === null || value === undefined) {
    return value;
  }
  return String(value).trim();
}

/**
 * 规范化 ideaId 用于比较：统一转换为字符串
 */
normalizeIdeaIdForCompare(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}
```

#### 3.2 应用场景

1. **保存报告时**：
```javascript
const normalizedChatId = chatId ? String(chatId).trim() : null;
```

2. **查询项目时**：
```javascript
const normalizedIdeaId = String(ideaId).trim();
const project = await this.storageManager.getProjectByIdeaId(normalizedIdeaId);
```

3. **创建项目时**：
```javascript
project.ideaId = String(project.ideaId).trim();
```

4. **查询报告时**：
```javascript
const reports = await window.storageManager.getReportsByChatId(String(chatId));
```

---

## 数据流图

### 会话数据流

```
用户创建对话
  ↓
生成 chatId (字符串)
  ↓
保存对话记录 (chats 表, id=chatId)
  ↓
生成分析报告
  ↓
保存报告 (reports 表, chatId=chatId)
  ↓
生成商业计划书/产品立项材料
  ↓
保存报告 (reports 表, chatId=chatId, type='business'|'proposal')
  ↓
导出PDF / 生成分享链接
  ↓
携带 chatId 信息
```

### 项目数据流

```
用户完成对话分析
  ↓
创建项目 (ideaId=chatId)
  ↓
保存项目 (projects 表, id=projectId, ideaId=chatId)
  ↓
配置工作流阶段
  ↓
保存阶段 (project.workflow.stages)
  ↓
生成交付物
  ↓
保存交付物 (artifacts 表, projectId=projectId, stageId=stageId)
  ↓
添加项目成员
  ↓
保存成员 (project.assignedAgents)
```

---

## 验证方法

### 1. 会话隔离验证

**测试步骤**：

1. **创建多个会话**：
   - 创建会话A（chatId: "1234567890"）
   - 创建会话B（chatId: "9876543210"）

2. **生成报告**：
   - 在会话A中生成商业计划书
   - 在会话B中生成产品立项材料

3. **切换会话**：
   - 切换到会话A，验证只显示会话A的商业计划书
   - 切换到会话B，验证只显示会话B的产品立项材料

4. **验证数据库**：
```javascript
// 打开浏览器控制台
const reportsA = await window.storageManager.getReportsByChatId("1234567890");
console.log('会话A的报告:', reportsA);

const reportsB = await window.storageManager.getReportsByChatId("9876543210");
console.log('会话B的报告:', reportsB);
```

5. **验证分享链接**：
   - 生成会话A的分享链接，检查是否包含 `chatId: "1234567890"`
   - 生成会话B的分享链接，检查是否包含 `chatId: "9876543210"`

### 2. 项目隔离验证

**测试步骤**：

1. **创建多个项目**：
   - 基于会话A创建项目X（ideaId: "1234567890"）
   - 基于会话B创建项目Y（ideaId: "9876543210"）

2. **添加交付物**：
   - 在项目X中添加PRD文档
   - 在项目Y中添加UI设计

3. **查询项目**：
```javascript
// 打开浏览器控制台
const projectX = await window.storageManager.getProjectByIdeaId("1234567890");
console.log('项目X:', projectX);

const projectY = await window.storageManager.getProjectByIdeaId("9876543210");
console.log('项目Y:', projectY);
```

4. **查询交付物**：
```javascript
const artifactsX = await window.storageManager.getArtifactsByProject(projectX.id);
console.log('项目X的交付物:', artifactsX);

const artifactsY = await window.storageManager.getArtifactsByProject(projectY.id);
console.log('项目Y的交付物:', artifactsY);
```

5. **验证隔离**：
   - 确认项目X的交付物不包含项目Y的内容
   - 确认项目Y的交付物不包含项目X的内容

### 3. ID类型验证

**测试步骤**：

1. **测试数字ID**：
```javascript
const chatId = 1234567890; // 数字
const reports = await window.storageManager.getReportsByChatId(chatId);
console.log('数字ID查询结果:', reports);
```

2. **测试字符串ID**：
```javascript
const chatId = "1234567890"; // 字符串
const reports = await window.storageManager.getReportsByChatId(chatId);
console.log('字符串ID查询结果:', reports);
```

3. **验证结果一致**：
   - 两次查询应该返回相同的结果
   - 证明ID类型统一生效

---

## 关键修改文件

### 前端文件

1. **storage-manager.js**
   - 升级数据库版本到 v8
   - 添加 `reports` 表的 `chatId` 索引
   - 新增 `getReportsByChatId()` 方法
   - 新增 `getReportByChatIdAndType()` 方法
   - 修改 `getProjectByIdeaId()` 统一ID为字符串

2. **app-boot.js**
   - 修改 `loadGenerationStatesForChat()` 使用索引查询
   - 修改 `generateShareLink()` 添加 `chatId` 字段

3. **business-plan-generator.js**
   - 修改 `saveReport()` 统一 `chatId` 为字符串

4. **project-manager.js**
   - 修改 `normalizeIdeaId()` 统一返回字符串
   - 修改 `normalizeIdeaIdForCompare()` 统一返回字符串
   - 修改 `createProject()` 确保 `ideaId` 是字符串

### 后端文件（需要同步修改）

1. **share-routes.js**
   - 修改分享创建接口，接收 `chatId` 字段
   - 保存分享时包含 `chatId`

2. **project.model.js**
   - 确保 `ideaId` 字段类型为 String
   - 添加索引：`{ ideaId: 1 }`

3. **business-plan.model.js**
   - 确保 `projectId` 字段类型为 String
   - 添加索引：`{ projectId: 1 }`

---

## 注意事项

### 1. 数据库升级

- IndexedDB 版本从 v7 升级到 v8
- 用户首次访问时会自动执行升级
- 升级过程会为 `reports` 表添加 `chatId` 索引
- 旧数据不受影响，新数据使用新索引

### 2. 兼容性

- 所有ID统一为字符串后，与旧数据兼容
- `normalizeIdeaId()` 方法确保数字ID也能正确转换
- 查询时使用 `String(id).trim()` 确保类型一致

### 3. 性能优化

- 使用索引查询代替全表扫描
- `getReportsByChatId()` 使用 `chatId` 索引，查询速度快
- `getProjectByIdeaId()` 使用 `ideaId` 索引，查询速度快

### 4. 数据一致性

- 保存数据前统一ID类型
- 查询数据前统一ID类型
- 避免使用 `==` 宽松比较，统一使用 `===` 严格比较

---

## 后续优化建议

### 1. 后端数据持久化

**问题**：分享数据存储在内存中，服务器重启会丢失。

**建议**：
- 使用 MongoDB 存储分享记录
- 添加 `shares` 集合
- 字段包含：`shareId`、`type`、`data`、`chatId`、`createdAt`、`expiresAt`、`views`

### 2. 数据清理

**问题**：已删除的会话和项目数据仍然保留。

**建议**：
- 添加定期清理任务
- 删除会话时同时删除关联的报告
- 删除项目时同时删除关联的交付物

### 3. 数据导出

**问题**：用户无法导出所有数据。

**建议**：
- 添加数据导出功能
- 支持导出指定会话的所有数据
- 支持导出指定项目的所有数据

### 4. 数据备份

**问题**：IndexedDB 数据可能因浏览器清理而丢失。

**建议**：
- 添加云端备份功能
- 定期同步到后端数据库
- 支持数据恢复

---

## 总结

通过本次数据隔离改造，ThinkCraft 项目实现了：

1. ✅ **会话级完全隔离**：每个会话的对话记录、分析报告、商业计划书、产品立项材料、PDF导出、分享链接完全隔离
2. ✅ **项目级完全隔离**：每个项目的工作流阶段、交付物、成员、协同建议完全隔离
3. ✅ **ID类型统一**：所有ID统一为字符串类型，避免类型混淆
4. ✅ **索引优化**：使用IndexedDB索引提高查询效率
5. ✅ **数据一致性**：保存和查询前统一ID类型，确保数据一致性

数据隔离确保了：
- 切换会话时不会看到其他会话的数据
- 切换项目时不会看到其他项目的数据
- 多个用户使用同一浏览器时数据不会混淆
- 数据查询准确、高效

---

**文档版本**：v1.0
**更新日期**：2026-01-30
**作者**：ThinkCraft 开发团队
