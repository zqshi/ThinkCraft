# 报告模块文档

## 概述

报告模块负责生成、查看和导出各类分析报告,包括AI分析报告、商业计划书和产品立项材料。

## 模块结构

```
frontend/js/modules/report/
├── report-generator.js      # 报告生成核心
├── report-viewer.js         # 报告查看和渲染
└── share-card.js           # 分享卡片生成
```

## 核心类

### ReportGenerator

负责报告的生成、缓存和导出。

**主要方法**:

#### `generateReport(chatId, type)`

生成报告。

```javascript
async generateReport(
  chatId: number,              // 对话ID
  type: string                 // 报告类型: 'analysis' | 'business' | 'product'
): Promise<Object>
```

**功能**:
- 调用后端API生成报告
- 缓存报告数据
- 更新生成状态
- 返回报告数据

**示例**:
```javascript
const generator = new ReportGenerator();
const report = await generator.generateReport(123, 'analysis');
```

#### `prefetchAnalysisReport(chatId, messages)`

后台预取分析报告。

```javascript
async prefetchAnalysisReport(
  chatId: number,
  messages: Array<Message>
)
```

**功能**:
- 在后台预先生成报告
- 提高用户体验
- 减少等待时间

**使用场景**:
- 对话达到一定步骤后自动触发
- 用户可能需要查看报告时

#### `fetchCachedAnalysisReport(chatId, messages)`

从缓存获取报告。

```javascript
async fetchCachedAnalysisReport(
  chatId: number,
  messages: Array<Message>
): Promise<Object>
```

**功能**:
- 检查缓存是否存在
- 返回缓存的报告
- 缓存未命中时生成新报告

#### `exportFullReport(chatId, reportData, format)`

导出完整报告。

```javascript
async exportFullReport(
  chatId: number,
  reportData: Object,
  format: string               // 'pdf' | 'docx' | 'md'
)
```

**功能**:
- 生成PDF/DOCX/Markdown格式
- 包含完整报告内容
- 自动下载文件

**示例**:
```javascript
await generator.exportFullReport(123, reportData, 'pdf');
```

#### `loadGenerationStates()`

加载所有报告的生成状态。

```javascript
async loadGenerationStates()
```

**功能**:
- 从localStorage加载状态
- 恢复生成进度
- 更新UI显示

#### `loadGenerationStatesForChat(chatId)`

加载指定对话的生成状态。

```javascript
async loadGenerationStatesForChat(chatId: number)
```

---

### ReportViewer

负责报告的查看和渲染。

**主要方法**:

#### `renderAIReport(reportData, container)`

渲染AI分析报告。

```javascript
renderAIReport(
  reportData: Object,
  container: HTMLElement
)
```

**功能**:
- 渲染6个章节
- 支持Markdown格式
- 代码高亮
- 响应式布局

**报告章节**:
1. 创意定义与演化
2. 核心洞察与根本假设
3. 边界条件与应用场景
4. 可行性分析与关键挑战
5. 思维盲点与待探索问题
6. 结构化行动建议

**示例**:
```javascript
const viewer = new ReportViewer();
const container = document.getElementById('reportContainer');
viewer.renderAIReport(reportData, container);
```

#### `viewGeneratedReport(chatId, type)`

查看已生成的报告。

```javascript
async viewGeneratedReport(
  chatId: number,
  type: string                 // 'business' | 'product'
)
```

**功能**:
- 加载报告数据
- 渲染报告内容
- 显示报告面板

#### `viewReport(chatId)`

查看AI分析报告。

```javascript
async viewReport(chatId: number)
```

**功能**:
- 检查报告是否存在
- 生成或加载报告
- 显示报告面板

---

### ShareCard

负责生成分享卡片。

**主要方法**:

#### `generateShareCard(reportData)`

生成分享卡片。

```javascript
async generateShareCard(reportData: Object): Promise<Blob>
```

**功能**:
- 生成精美的分享图片
- 包含报告摘要
- 支持社交媒体分享

---

## 数据结构

### 分析报告对象

```javascript
{
  chatId: number,
  type: 'analysis',
  generatedAt: string,         // ISO时间戳
  data: {
    chapter1: {
      title: '创意定义与演化',
      content: string,         // Markdown格式
      keyPoints: Array<string>
    },
    chapter2: {
      title: '核心洞察与根本假设',
      content: string,
      assumptions: Array<string>
    },
    chapter3: {
      title: '边界条件与应用场景',
      content: string,
      scenarios: Array<Object>
    },
    chapter4: {
      title: '可行性分析与关键挑战',
      content: string,
      challenges: Array<Object>
    },
    chapter5: {
      title: '思维盲点与待探索问题',
      content: string,
      questions: Array<string>
    },
    chapter6: {
      title: '结构化行动建议',
      content: string,
      actions: Array<Object>
    }
  }
}
```

### 商业计划书对象

```javascript
{
  chatId: number,
  type: 'business',
  generatedAt: string,
  data: {
    executive_summary: string,
    market_analysis: string,
    product_description: string,
    business_model: string,
    financial_projections: string,
    team: string,
    risks: string
  }
}
```

### 产品立项材料对象

```javascript
{
  chatId: number,
  type: 'product',
  generatedAt: string,
  data: {
    product_vision: string,
    target_users: string,
    core_features: string,
    technical_architecture: string,
    development_plan: string,
    success_metrics: string
  }
}
```

---

## 状态管理

报告模块使用全局`state`对象管理状态:

```javascript
window.state = {
  generationStates: {
    [chatId]: {
      analysis: {
        status: 'idle' | 'generating' | 'completed' | 'error',
        progress: number,        // 0-100
        error: string
      },
      business: { ... },
      product: { ... }
    }
  },
  reportCache: {
    [reportKey]: {
      data: Object,
      timestamp: number
    }
  }
}
```

---

## API接口

### 生成分析报告

```
POST /api/reports/analysis
```

**请求体**:
```json
{
  "chatId": 123,
  "messages": [...]
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "report": { ... },
    "cacheKey": "analysis_123_abc"
  }
}
```

### 生成商业计划书

```
POST /api/reports/business
```

**请求体**:
```json
{
  "chatId": 123,
  "messages": [...]
}
```

### 生成产品立项材料

```
POST /api/reports/product
```

**请求体**:
```json
{
  "chatId": 123,
  "messages": [...]
}
```

### 导出报告

```
POST /api/reports/export
```

**请求体**:
```json
{
  "chatId": 123,
  "type": "analysis",
  "format": "pdf"
}
```

**响应**: PDF文件流

---

## 使用示例

### 生成报告

```javascript
const generator = new ReportGenerator();

// 生成分析报告
const analysisReport = await generator.generateReport(123, 'analysis');

// 生成商业计划书
const businessPlan = await generator.generateReport(123, 'business');

// 生成产品立项材料
const productDoc = await generator.generateReport(123, 'product');
```

### 查看报告

```javascript
const viewer = new ReportViewer();

// 查看分析报告
await viewer.viewReport(123);

// 查看商业计划书
await viewer.viewGeneratedReport(123, 'business');

// 查看产品立项材料
await viewer.viewGeneratedReport(123, 'product');
```

### 导出报告

```javascript
const generator = new ReportGenerator();

// 导出为PDF
await generator.exportFullReport(123, reportData, 'pdf');

// 导出为DOCX
await generator.exportFullReport(123, reportData, 'docx');

// 导出为Markdown
await generator.exportFullReport(123, reportData, 'md');
```

### 预取报告

```javascript
const generator = new ReportGenerator();

// 在对话进行中预取报告
if (state.conversationStep >= 5) {
  await generator.prefetchAnalysisReport(chatId, state.messages);
}
```

---

## 缓存机制

报告模块使用智能缓存提高性能:

### 缓存键生成

```javascript
function getAnalysisReportKey(chatId, messages) {
  const content = messages.map(m => m.content).join('|');
  const hash = simpleHash(content);
  return `analysis_${chatId}_${hash}`;
}
```

### 缓存存储

```javascript
// 存储到state
state.reportCache[cacheKey] = {
  data: reportData,
  timestamp: Date.now()
};

// 持久化到localStorage
localStorage.setItem('thinkcraft_report_cache', JSON.stringify(state.reportCache));
```

### 缓存读取

```javascript
// 从state读取
const cached = state.reportCache[cacheKey];

// 检查是否过期(24小时)
const isExpired = Date.now() - cached.timestamp > 24 * 60 * 60 * 1000;

if (!isExpired) {
  return cached.data;
}
```

---

## 最佳实践

### 1. 错误处理

```javascript
try {
  const report = await generator.generateReport(chatId, 'analysis');
} catch (error) {
  console.error('生成报告失败:', error);
  // 显示错误提示
  showError('生成报告失败,请重试');
  // 更新状态
  state.generationStates[chatId].analysis.status = 'error';
  state.generationStates[chatId].analysis.error = error.message;
}
```

### 2. 进度显示

```javascript
// 更新进度
state.generationStates[chatId].analysis.progress = 50;

// 显示进度条
updateProgressBar(50);

// 完成后
state.generationStates[chatId].analysis.status = 'completed';
state.generationStates[chatId].analysis.progress = 100;
```

### 3. 性能优化

- 使用缓存避免重复生成
- 后台预取提高响应速度
- 懒加载大型报告
- 分页显示长报告

### 4. 用户体验

- 显示生成进度
- 提供取消功能
- 支持离线查看
- 自动保存草稿

---

## 测试

报告模块包含完整的单元测试:

```bash
# 运行报告模块测试
npm test -- report

# 查看覆盖率
npm run test:coverage -- report
```

---

## 常见问题

### Q: 报告生成需要多长时间?

A: 通常需要5-15秒,取决于对话长度和复杂度。

### Q: 如何自定义报告样式?

A: 修改`report-viewer.js`中的CSS类和HTML结构。

### Q: 报告缓存多久过期?

A: 默认24小时,可在`getAnalysisReportKey`函数中修改。

### Q: 如何添加新的报告类型?

A:
1. 在`ReportGenerator`中添加新的生成方法
2. 在`ReportViewer`中添加新的渲染方法
3. 更新API接口
4. 更新数据结构

---

## 相关文档

- [架构设计](../architecture.md)
- [API文档](../api/report-generator.md)
- [测试指南](../TESTING.md)
- [快速开始](../guides/getting-started.md)
