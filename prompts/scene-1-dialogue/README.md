# 场景一：对话链路

## 概述

场景一用于用户与AI的多轮对话，生成分析报告、商业计划书、产品立项材料等文档。

## 目录结构

```
scene-1-dialogue/
├── dialogue-guide/        # 对话引导
│   └── system-default.md  # 默认对话系统提示词
│
├── analysis-report/       # 分析报告生成
│   ├── full-document.md   # 完整报告生成提示词
│   ├── version-config.json
│   └── ab-test-config.json
│
├── business-plan/         # 商业计划书生成
│   ├── full-document.md
│   ├── chapters-config.json
│   ├── version-config.json
│   ├── ab-test-config.json
│   └── chapters/          # 9个固定章节模板
│       ├── executive-summary.md
│       ├── market-analysis.md
│       └── ...
│
└── proposal/              # 产品立项材料生成
    ├── full-document.md
    ├── chapters-config.json
    ├── version-config.json
    ├── ab-test-config.json
    └── chapters/          # 6个固定章节模板
        ├── project-summary.md
        ├── problem-insight.md
        └── ...
```

## 功能模块

### 1. 对话引导（dialogue-guide/）

**用途**：引导用户输入创意，进行多轮对话

**提示词文件**：

- `system-default.md`：默认对话系统提示词

**使用方式**：

```javascript
const dialoguePrompt = await promptLoader.load('scene-1-dialogue/dialogue-guide/system-default');
```

### 2. 分析报告生成（analysis-report/）

**用途**：基于对话历史生成分析报告

**提示词文件**：

- `full-document.md`：完整报告生成提示词

**使用方式**：

```javascript
const reportPrompt = await promptLoader.load('scene-1-dialogue/analysis-report/full-document');
```

### 3. 商业计划书生成（business-plan/）

**用途**：生成完整的商业计划书

**章节列表**（固定9章）：

1. executive-summary（执行摘要）
2. market-analysis（市场分析）
3. solution（解决方案）
4. business-model（商业模式）
5. competitive-landscape（竞争格局）
6. marketing-strategy（营销策略）
7. team-structure（团队结构）
8. financial-projection（财务预测）
9. risk-assessment（风险评估）
**使用方式**：

```javascript
const businessPlanPrompt = await promptLoader.buildDocumentPrompt(
  'scene-1-dialogue/business-plan',
  selectedChapterIds,
  conversationHistory
);
```

### 4. 产品立项材料生成（proposal/）

**用途**：生成产品立项材料

**章节列表**（固定6章）：

1. project-summary（立项背景与机会论证）
2. problem-insight（产品定义与价值主张）
3. product-solution（产品方案与功能规格）
4. implementation-path（实施路线图与资源计划）
5. budget-planning（投入产出与成功度量）
6. risk-control（风险评估与决策建议）

**使用方式**：

```javascript
const proposalPrompt = await promptLoader.buildDocumentPrompt(
  'scene-1-dialogue/proposal',
  selectedChapterIds,
  conversationHistory
);
```

## 配置文件

### chapters-config.json

定义章节的配置信息：

```json
{
  "chapters": [
    {
      "id": "executive-summary",
      "name": "执行摘要",
      "required": true,
      "order": 1
    },
    ...
  ]
}
```

### version-config.json

定义版本配置：

```json
{
  "current_version": "1.0.0",
  "versions": [
    {
      "version": "1.0.0",
      "description": "初始版本",
      "date": "2026-01-27"
    }
  ]
}
```

### ab-test-config.json

定义A/B测试配置：

```json
{
  "enabled": false,
  "variants": []
}
```

## 使用流程

### 1. 对话引导

```
用户输入创意
  ↓
加载 dialogue-guide/system-default.md
  ↓
AI引导用户多轮对话
  ↓
收集对话历史
```

### 2. 生成分析报告

```
对话历史
  ↓
加载 analysis-report/full-document.md
  ↓
生成分析报告
  ↓
展示给用户
```

### 3. 生成商业计划书

```
对话历史 + 固定九章
  ↓
加载 business-plan/full-document.md
加载九章模板
  ↓
生成完整商业计划书
  ↓
展示给用户
```

## 修改指南

### 修改对话引导提示词

1. 编辑 `dialogue-guide/system-default.md`
2. 测试对话效果
3. 提交变更

### 添加新章节

1. 在 `proposal/chapters/` 创建新文件（`business-plan` 采用固定九章，不新增章节）
2. 更新对应 `chapters-config.json`
3. 测试章节生成
4. 提交变更

### 修改章节模板

1. 编辑对应的章节文件
2. 测试生成效果
3. 提交变更

## 质量标准

### 对话引导质量标准

- [ ] 引导语清晰友好
- [ ] 问题具体可回答
- [ ] 覆盖核心要素
- [ ] 对话流程自然

### 文档生成质量标准

- [ ] 内容完整准确
- [ ] 结构清晰合理
- [ ] 格式规范统一
- [ ] 语言专业流畅

## 版本信息

- **版本**：1.0.0
- **最后更新**：2026-01-27
- **变更日志**：
  - 1.0.0：初始版本
