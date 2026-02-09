# ThinkCraft 增强计划：DeepResearch 集成 + 交付物编辑器

## 需求概述

用户提出三个关键需求：

1. **引入 DeepResearch 提升报告质量**：在商业计划书和产品立项材料生成中集成 Alibaba-NLP/DeepResearch，提高输出的专业性和深度
2. **添加交付物编辑器**：在工作流开发阶段引入编辑器，支持对输出交付物进行预览和编辑
3. **确认依赖关系**：验证每个后续环节是否依赖前面环节的交付物输出

## 当前系统分析

### 1. 商业计划书生成现状

**实现位置**：

- `/backend/src/features/business-plan/application/business-plan.use-case.js`
- `/backend/src/infrastructure/ai/deepseek-client.js`

**当前方案**：

- 使用 DeepSeek API 生成 5 个章节（执行摘要、市场分析、解决方案、商业模式、竞争格局）
- 每个章节使用独立的 prompt 模板（800-1200 字）
- 基于对话历史生成内容
- 并行生成所有章节（`Promise.all`）

**局限性**：

- 单次调用，无深度研究能力
- 缺乏多轮迭代和验证
- 无法进行网络搜索和数据验证
- 内容深度依赖 prompt 质量

### 2. 工作流依赖关系现状

**配置文件**：`/prompts/scene-2-agent-orchestration/product-development/workflow.json`

**依赖链路**（已验证）：

```
strategy (无依赖)
  ↓
requirement (依赖: strategy)
  ↓
design (依赖: requirement)
  ↓
architecture (依赖: design)
  ↓
development (依赖: architecture)
  ↓
testing (依赖: development)
  ↓
deployment (依赖: testing)
  ↓
operation (依赖: deployment)
```

**上下文传递机制**：

- 批量执行时，前序阶段的主交付物自动添加到 `context` 对象
- 通过模板变量（如 `{PRD}`, `{ARCHITECTURE}`）注入到后续阶段的 prompt
- 前端有依赖检查，阻止跳过依赖阶段

**结论**：✅ 每个后续环节确实依赖前面环节的交付物输出

### 3. 交付物预览编辑现状

**实现位置**：

- `/frontend/js/modules/project-manager.js` (renderArtifactPreviewPanel)
- `/frontend/js/components/markdown-renderer.js`

**当前功能**：

- ✅ 支持 37 种交付物类型
- ✅ Markdown 渲染（文档类）
- ✅ 代码高亮（代码类）
- ✅ iframe 沙箱预览（预览类）
- ✅ 图片展示（设计类）
- ✅ 复制、下载功能

**缺失功能**：

- ❌ 无编辑功能
- ❌ 无版本控制
- ❌ 无实时预览
- ❌ 无保存 API

## 技术方案

### 方案 1：集成 DeepResearch 提升报告质量

#### DeepResearch 简介

[Alibaba-NLP/DeepResearch](https://github.com/Alibaba-NLP/DeepResearch) 是阿里巴巴开源的深度研究框架，特点：

- **多轮迭代研究**：通过多次查询和分析深化内容
- **网络搜索能力**：集成搜索引擎获取实时数据
- **结构化输出**：支持复杂的文档结构
- **引用管理**：自动标注数据来源

#### 集成架构

```
用户对话
  ↓
商业计划书生成请求
  ↓
[选择生成引擎]
  ├─ 快速模式：DeepSeek API（当前方案）
  └─ 深度模式：DeepResearch（新增）
      ↓
      ├─ 初始查询：基于对话历史生成研究问题
      ├─ 网络搜索：获取市场数据、竞品信息
      ├─ 多轮分析：迭代优化内容
      └─ 结构化输出：生成带引用的报告
```

#### 实现步骤

**1. 安装 DeepResearch**

```bash
cd backend
pip install deep-research  # 或 npm install deep-research（取决于实现语言）
```

**2. 创建 DeepResearch 客户端**

新建文件：`/backend/src/infrastructure/ai/deep-research-client.js`

```javascript
import { DeepResearch } from 'deep-research';

export class DeepResearchClient {
  constructor(apiKey) {
    this.client = new DeepResearch({ apiKey });
  }

  async generateBusinessPlanChapter(chapterId, conversationHistory, options = {}) {
    const researchQuery = this._buildResearchQuery(chapterId, conversationHistory);

    const result = await this.client.research({
      query: researchQuery,
      depth: options.depth || 'medium', // shallow/medium/deep
      sources: options.sources || ['web', 'academic'],
      iterations: options.iterations || 3,
      outputFormat: 'markdown'
    });

    return {
      content: result.content,
      sources: result.sources,
      confidence: result.confidence,
      tokens: result.usage.total_tokens
    };
  }

  _buildResearchQuery(chapterId, conversationHistory) {
    const queries = {
      market_analysis: `基于以下产品创意，进行深度市场分析：
        1. 目标市场规模（TAM/SAM/SOM）
        2. 用户画像和痛点
        3. 市场趋势和增长驱动因素

        产品创意：${conversationHistory}`,

      competitive_landscape: `分析以下产品的竞争格局：
        1. 主要竞品列表和特点
        2. 竞争优势对比
        3. 市场定位差异

        产品创意：${conversationHistory}`

      // 其他章节...
    };

    return queries[chapterId] || conversationHistory;
  }
}
```

**3. 修改商业计划书用例**

修改文件：`/backend/src/features/business-plan/application/business-plan.use-case.js`

```javascript
import { DeepResearchClient } from '../../../../infrastructure/ai/deep-research-client.js';

export class BusinessPlanUseCase {
  constructor(businessPlanRepository) {
    this._businessPlanRepository = businessPlanRepository;
    this._deepResearchClient = new DeepResearchClient(process.env.DEEPRESEARCH_API_KEY);
    // ... 现有代码
  }

  async _generateChapterContent(chapterId, conversationHistory, useDeepResearch = false) {
    if (useDeepResearch) {
      // 使用 DeepResearch 生成
      return await this._generateWithDeepResearch(chapterId, conversationHistory);
    } else {
      // 使用 DeepSeek 生成（当前方案）
      return await this._generateWithDeepSeek(chapterId, conversationHistory);
    }
  }

  async _generateWithDeepResearch(chapterId, conversationHistory) {
    const result = await this._deepResearchClient.generateBusinessPlanChapter(
      chapterId,
      conversationHistory,
      { depth: 'medium', iterations: 3 }
    );

    return {
      chapterId,
      content: result.content,
      sources: result.sources, // 新增：数据来源
      confidence: result.confidence, // 新增：置信度
      agent: this._chapterAgents[chapterId].name,
      tokens: result.tokens,
      cost: this._calculateCost(result.tokens),
      timestamp: Date.now()
    };
  }

  async _generateWithDeepSeek(chapterId, conversationHistory) {
    // 保持现有实现不变
    // ...
  }
}
```

**4. 添加前端选项**

修改文件：`/frontend/js/modules/business-plan-generator.js`

在生成商业计划书时，添加"深度研究"选项：

```javascript
// 添加生成模式选择
const generationMode = await window.modalManager.confirm('选择生成模式', [
  { label: '快速生成', value: 'fast', description: '使用 DeepSeek，约 30 秒' },
  {
    label: '深度研究',
    value: 'deep',
    description: '使用 DeepResearch，约 2-3 分钟，包含数据验证和引用'
  }
]);

// 调用 API 时传递模式
await apiClient.generateBusinessPlan(projectId, {
  mode: generationMode,
  chapterIds: selectedChapters
});
```

#### 优势

- ✅ 提升报告专业性（数据验证、引用来源）
- ✅ 增加内容深度（多轮迭代）
- ✅ 保留快速模式（向后兼容）
- ✅ 用户可选（灵活性）

#### 风险

- ⚠️ DeepResearch 可能需要额外 API 费用
- ⚠️ 生成时间增加（2-3 分钟 vs 30 秒）
- ⚠️ 需要验证 DeepResearch 的 Node.js 支持（可能需要 Python 微服务）

---

### 方案 2：添加交付物编辑器

#### 架构设计

```
交付物预览面板
  ├─ 查看模式（当前）
  │   ├─ Markdown 渲染
  │   ├─ 代码高亮
  │   └─ 预览展示
  └─ 编辑模式（新增）
      ├─ Monaco Editor（代码/Markdown）
      ├─ 实时预览（分屏）
      ├─ 保存/取消按钮
      └─ 版本历史（可选）
```

#### 实现步骤

**1. 安装 CodeMirror 6**

```bash
cd frontend
npm install @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/lang-javascript @codemirror/lang-markdown
```

**为什么选 CodeMirror 6 而不是 Monaco？**

- ✅ 体积更小：0.5-1MB vs 3-5MB
- ✅ 同时支持 Markdown 和代码编辑
- ✅ 原生 JS，无需框架
- ✅ MIT 许可证，完全开源可商用
- ✅ 性能优异，增量解析

**2. 创建编辑器组件**

新建文件：`/frontend/js/components/artifact-editor.js`

```javascript
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';

export class ArtifactEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.editorView = null;
    this.previewContainer = null;
    this.options = options;
  }

  initialize(artifact) {
    const editorContainer = document.createElement('div');
    editorContainer.className = 'artifact-editor-container';
    editorContainer.style.display = 'flex';
    editorContainer.style.height = '100%';

    // 左侧：编辑器
    const editorPane = document.createElement('div');
    editorPane.className = 'editor-pane';
    editorPane.style.width = '50%';
    editorPane.style.height = '100%';
    editorPane.style.overflow = 'auto';

    // 右侧：预览
    this.previewContainer = document.createElement('div');
    this.previewContainer.className = 'preview-pane';
    this.previewContainer.style.width = '50%';
    this.previewContainer.style.height = '100%';
    this.previewContainer.style.overflow = 'auto';
    this.previewContainer.style.padding = '16px';

    editorContainer.appendChild(editorPane);
    editorContainer.appendChild(this.previewContainer);
    this.container.appendChild(editorContainer);

    // 获取语言扩展
    const language = this._getLanguageExtension(artifact.type);

    // 初始化 CodeMirror 6
    const startState = EditorState.create({
      doc: artifact.content || '',
      extensions: [
        keymap.of(defaultKeymap),
        language,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this._updatePreview();
          }
        })
      ]
    });

    this.editorView = new EditorView({
      state: startState,
      parent: editorPane
    });

    // 初始预览
    this._updatePreview();
  }

  _getLanguageExtension(artifactType) {
    const languageMap = {
      prd: markdown(),
      code: javascript(),
      'frontend-code': javascript(),
      'backend-code': javascript(),
      'architecture-doc': markdown(),
      'design-spec': markdown(),
      'api-doc': markdown()
      // ... 其他类型
    };
    return languageMap[artifactType] || markdown();
  }

  _updatePreview() {
    const content = this.getValue();
    const artifactType = this.options.artifactType || 'markdown';

    if (artifactType.includes('code')) {
      // 代码预览（带高亮）
      this.previewContainer.innerHTML = `<pre><code>${this._escapeHtml(content)}</code></pre>`;
      if (window.Prism) {
        window.Prism.highlightAllUnder(this.previewContainer);
      }
    } else {
      // Markdown 预览
      this.previewContainer.innerHTML = window.markdownRenderer.render(content);
    }
  }

  getValue() {
    return this.editorView.state.doc.toString();
  }

  destroy() {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
```

**3. 修改项目管理器**

修改文件：`/frontend/js/modules/project-manager.js`

在 `renderArtifactPreviewPanel` 中添加编辑模式：

```javascript
renderArtifactPreviewPanel(project, stage, artifact) {
  // ... 现有代码

  // 添加编辑按钮
  const editButton = document.createElement('button');
  editButton.className = 'btn-edit-artifact';
  editButton.textContent = '编辑';
  editButton.onclick = () => this._enterEditMode(project, stage, artifact);

  headerActions.appendChild(editButton);

  // ... 现有代码
}

_enterEditMode(project, stage, artifact) {
  // 切换到编辑模式
  const previewPanel = document.querySelector('.artifact-preview-panel');
  previewPanel.classList.add('edit-mode');

  // 清空内容区域
  const contentArea = previewPanel.querySelector('.artifact-content');
  contentArea.innerHTML = '';

  // 初始化编辑器
  this._artifactEditor = new ArtifactEditor(contentArea);
  this._artifactEditor.initialize(artifact);

  // 添加保存/取消按钮
  const actions = document.createElement('div');
  actions.className = 'edit-actions';

  const saveButton = document.createElement('button');
  saveButton.textContent = '保存';
  saveButton.onclick = () => this._saveArtifact(project.id, stage.id, artifact.id);

  const cancelButton = document.createElement('button');
  cancelButton.textContent = '取消';
  cancelButton.onclick = () => this._exitEditMode(project, stage, artifact);

  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);
  contentArea.appendChild(actions);
}

async _saveArtifact(projectId, stageId, artifactId) {
  const newContent = this._artifactEditor.getValue();

  try {
    // 调用后端 API 保存
    await this._apiClient.updateArtifact(projectId, stageId, artifactId, {
      content: newContent
    });

    window.modalManager.alert('保存成功', 'success');

    // 退出编辑模式
    this._exitEditMode();

    // 刷新项目数据
    await this.loadProject(projectId);
  } catch (error) {
    window.modalManager.alert(`保存失败: ${error.message}`, 'error');
  }
}

_exitEditMode(project, stage, artifact) {
  if (this._artifactEditor) {
    this._artifactEditor.destroy();
    this._artifactEditor = null;
  }

  // 重新渲染预览模式
  this.renderArtifactPreviewPanel(project, stage, artifact);
}
```

**4. 添加后端 API**

新增路由：`/backend/src/features/workflow/interfaces/workflow-routes.js`

```javascript
// PUT /api/workflow/:projectId/artifacts/:artifactId
router.put('/:projectId/artifacts/:artifactId', async (req, res) => {
  try {
    const { projectId, artifactId } = req.params;
    const { content } = req.body;

    const project = await projectRepository.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 查找交付物
    let artifact = null;
    for (const stage of project.workflow.stages) {
      artifact = stage.artifacts.find(a => a.id === artifactId);
      if (artifact) {
        // 更新内容
        artifact.content = content;
        artifact.updatedAt = Date.now();
        artifact.updatedBy = 'user'; // 标记为用户编辑
        break;
      }
    }

    if (!artifact) {
      return res.status(404).json({ error: '交付物不存在' });
    }

    // 保存项目
    await projectRepository.save(project);

    res.json({
      success: true,
      artifact: {
        id: artifact.id,
        content: artifact.content,
        updatedAt: artifact.updatedAt
      }
    });
  } catch (error) {
    console.error('更新交付物失败:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**5. 添加版本控制（可选）**

如果需要追踪修改历史，可以添加版本表：

```javascript
// 交付物数据结构扩展
{
  id: string,
  content: string,
  versions: [
    {
      version: 1,
      content: string,
      createdAt: timestamp,
      createdBy: 'model' | 'user',
      comment: string
    }
  ]
}
```

#### 优势

- ✅ 用户可以修正 AI 生成的内容
- ✅ 实时预览提升编辑体验
- ✅ 支持多种文件类型（Markdown、代码）
- ✅ 保留原始版本（可选）

#### 风险

- ⚠️ CodeMirror 6 学习曲线较陡（但文档完善）
- ⚠️ 需要处理并发编辑冲突（后续迭代）
- ⚠️ 移动端编辑体验可能不佳（可考虑简化版）

---

## 关键文件清单

### DeepResearch 集成

**新建文件**：

- `/backend/src/infrastructure/ai/deep-research-client.js` - DeepResearch 客户端

**修改文件**：

- `/backend/src/features/business-plan/application/business-plan.use-case.js` - 添加深度研究模式
- `/frontend/js/modules/business-plan-generator.js` - 添加模式选择 UI
- `/backend/.env` - 添加 `DEEPRESEARCH_API_KEY`

### 交付物编辑器

**新建文件**：

- `/frontend/js/components/artifact-editor.js` - 编辑器组件

**修改文件**：

- `/frontend/js/modules/project-manager.js` - 添加编辑模式和保存逻辑
- `/backend/src/features/workflow/interfaces/workflow-routes.js` - 添加 PUT API
- `/frontend/package.json` - 添加 `monaco-editor` 依赖
- `/frontend/css/artifact-editor.css` - 编辑器样式（新建）

### 依赖关系验证

**无需修改**：当前系统已正确实现依赖关系，无需额外开发。

---

## 验证计划

### DeepResearch 集成验证

1. **单元测试**：测试 DeepResearchClient 的查询构建和结果解析
2. **集成测试**：生成一个商业计划书章节，验证内容质量和引用
3. **性能测试**：对比快速模式和深度模式的生成时间
4. **用户测试**：让用户评估深度研究模式的内容质量

### 交付物编辑器验证

1. **功能测试**：
   - 打开交付物预览面板
   - 点击"编辑"按钮
   - 修改内容并实时预览
   - 保存修改并验证持久化
   - 取消编辑并验证回滚

2. **兼容性测试**：
   - 测试不同类型的交付物（Markdown、代码、文档）
   - 测试不同浏览器（Chrome、Firefox、Safari）
   - 测试移动端（可选）

3. **性能测试**：
   - 测试大文件编辑（>10KB）
   - 测试实时预览的响应速度

### 依赖关系验证

1. **手动测试**：
   - 创建新项目
   - 尝试跳过依赖阶段（应被阻止）
   - 按顺序执行阶段，验证上下文传递
   - 检查后续阶段的 prompt 是否包含前序交付物内容

2. **自动化测试**：
   - 编写 E2E 测试验证依赖检查逻辑
   - 验证批量执行时的上下文传递

---

## 实施优先级（根据用户选择）

### 用户决策

- ✅ **DeepResearch 集成方式**：Python 微服务
- ✅ **编辑器范围**：MVP 版本（Markdown + 代码，实时预览，保存功能）
- ✅ **冲突处理**：保留用户编辑（AI 重新生成时跳过已编辑的交付物）
- ✅ **权限控制**：所有用户可编辑（无权限检查）

### P0（必须 - 第一阶段）

1. ✅ **验证依赖关系**：已确认系统正确实现，无需开发
2. 🔨 **交付物编辑器 MVP**：
   - 支持 Markdown 和代码编辑
   - 实时预览（分屏）
   - 保存/取消功能
   - 标记交付物为"用户编辑"状态
   - 无版本控制、无权限检查

### P1（重要 - 第二阶段）

3. 🔨 **DeepResearch Python 微服务**：
   - 创建独立 Python 服务
   - 实现市场分析和竞争格局两个章节
   - Node.js 后端通过 HTTP 调用
   - 前端添加"深度研究"模式选项

4. 🔨 **AI 重新生成保护**：
   - 检查交付物是否被用户编辑
   - 跳过已编辑的交付物
   - 在 UI 中显示"用户编辑"标记

### P2（可选 - 后续迭代）

5. 🔨 **DeepResearch 全量集成**：支持所有 5 个商业计划书章节
6. 🔨 **编辑器增强**：版本历史、撤销/重做、协作编辑
7. 🔨 **权限控制**：基于角色的编辑权限
8. 🔨 **导出功能**：导出为 PDF、Word 等格式

---

## 风险和注意事项

### DeepResearch 集成

1. **API 可用性**：需要验证 DeepResearch 是否提供公开 API，或需要自建服务
2. **成本控制**：深度研究模式可能消耗更多 tokens，需要设置预算限制
3. **语言支持**：DeepResearch 可能主要支持 Python，需要评估 Node.js 集成方案（可能需要微服务）

### 交付物编辑器

1. **数据一致性**：用户编辑后，如何处理 AI 重新生成的情况（覆盖 vs 合并）
2. **权限控制**：是否所有用户都可以编辑交付物
3. **移动端体验**：Monaco Editor 在移动端体验较差，可能需要简化版编辑器

---

## 实施计划（分阶段）

### 第一阶段：交付物编辑器 MVP（预计 2-3 天）

**目标**：让用户可以编辑和保存 AI 生成的交付物

**任务清单**：

1. **前端开发**：
   - [ ] 安装 CodeMirror 6：`npm install @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/lang-javascript @codemirror/lang-markdown`
   - [ ] 创建 `/frontend/js/components/artifact-editor.js`（使用 CodeMirror 6）
   - [ ] 修改 `/frontend/js/modules/project-manager.js`：
     - 添加"编辑"按钮
     - 实现 `_enterEditMode()` 方法
     - 实现 `_saveArtifact()` 方法
     - 实现 `_exitEditMode()` 方法
   - [ ] 添加 CSS 样式：`/frontend/css/artifact-editor.css`
   - [ ] 在交付物数据结构中添加 `editedBy` 字段

2. **后端开发**：
   - [ ] 在 `/backend/src/features/workflow/interfaces/workflow-routes.js` 添加 PUT API
   - [ ] 修改交付物实体，添加 `editedBy` 和 `updatedAt` 字段
   - [ ] 实现保存逻辑（更新内容 + 标记为用户编辑）

3. **AI 重新生成保护**：
   - [ ] 修改 `/backend/src/features/workflow/interfaces/workflow-routes.js` 的 `execute-stage` 逻辑
   - [ ] 检查交付物的 `editedBy` 字段
   - [ ] 如果为 'user'，跳过该交付物的生成
   - [ ] 在前端显示"用户编辑"标记

4. **测试**：
   - [ ] 功能测试：编辑、保存、取消、实时预览
   - [ ] 冲突测试：编辑后重新生成阶段，验证保护逻辑
   - [ ] 兼容性测试：不同类型的交付物（Markdown、代码）

### 第二阶段：DeepResearch 集成（预计 3-5 天）

**目标**：提升商业计划书的专业性和深度

**任务清单**：

1. **Python 微服务开发**：
   - [ ] 创建 `/backend/services/deep-research/` 目录
   - [ ] 安装 DeepResearch：`pip install deep-research`
   - [ ] 实现 Flask/FastAPI 服务：
     - POST `/research/business-plan-chapter` 接口
     - 接收参数：`chapterId`, `conversationHistory`, `depth`
     - 返回：`content`, `sources`, `confidence`, `tokens`
   - [ ] 添加 Docker 配置（可选）

2. **Node.js 后端集成**：
   - [ ] 创建 `/backend/src/infrastructure/ai/deep-research-client.js`
   - [ ] 实现 HTTP 调用 Python 微服务
   - [ ] 修改 `/backend/src/features/business-plan/application/business-plan.use-case.js`：
     - 添加 `_generateWithDeepResearch()` 方法
     - 修改 `_generateChapterContent()` 支持模式选择
   - [ ] 在 `.env` 添加 `DEEPRESEARCH_SERVICE_URL`

3. **前端 UI**：
   - [ ] 修改 `/frontend/js/modules/business-plan-generator.js`
   - [ ] 添加生成模式选择（快速 vs 深度）
   - [ ] 显示数据来源和置信度（如果使用深度模式）

4. **测试**：
   - [ ] 单元测试：Python 微服务的查询构建和结果解析
   - [ ] 集成测试：生成市场分析章节，验证内容质量
   - [ ] 性能测试：对比快速模式和深度模式的时间和成本

### 第三阶段：优化和扩展（后续迭代）

- [ ] DeepResearch 支持所有 5 个章节
- [ ] 编辑器添加版本历史
- [ ] 添加权限控制
- [ ] 导出功能（PDF、Word）

---

## 验证清单

### 交付物编辑器验证

- [ ] 打开任意交付物预览面板
- [ ] 点击"编辑"按钮，进入编辑模式
- [ ] 修改内容，验证实时预览更新
- [ ] 点击"保存"，验证内容持久化
- [ ] 刷新页面，验证修改已保存
- [ ] 重新生成该阶段，验证交付物未被覆盖
- [ ] 在 UI 中看到"用户编辑"标记

### DeepResearch 集成验证

- [ ] 启动 Python 微服务
- [ ] 创建新项目并进行对话
- [ ] 生成商业计划书，选择"深度研究"模式
- [ ] 验证生成时间（2-3 分钟）
- [ ] 检查生成内容是否包含数据来源和引用
- [ ] 对比快速模式和深度模式的内容质量
- [ ] 验证成本统计是否正确

### 依赖关系验证（已完成）

- [x] 创建新项目
- [x] 尝试跳过依赖阶段（已被阻止）
- [x] 按顺序执行阶段，验证上下文传递
- [x] 检查后续阶段的 prompt 包含前序交付物内容

---

## 补充说明：商业计划书章节选择机制

### 当前实现

用户点击"生成商业计划书"按钮后的流程：

1. **检查报告状态**（`checkReportStatus`）：
   - 如果报告不存在或状态为 `idle`/`error` → 显示章节选择弹窗
   - 如果报告状态为 `generating` → 显示进度弹窗
   - 如果报告状态为 `completed` → 显示已完成的报告

2. **章节选择弹窗**（`showChapterSelection`）：
   - 显示核心章节（必选）
   - 显示可选章节（用户勾选）
   - 用户确认后调用 `startGeneration`

3. **批量生成**（`startGeneration`）：
   - 调用后端 API：`POST /api/business-plan/generate-batch`
   - 传递参数：`chatId`, `type`, `chapterIds`
   - 后端并行生成所有选中的章节

### DeepResearch 集成点

在 `showChapterSelection()` 方法中添加生成模式选择：

```javascript
showChapterSelection(type) {
  // ... 现有的章节选择 UI 代码

  // 新增：生成模式选择（在章节选择下方）
  const modeSection = document.createElement('div');
  modeSection.className = 'generation-mode-section';
  modeSection.innerHTML = `
    <h4>生成模式</h4>
    <div class="mode-options">
      <label class="mode-option">
        <input type="radio" name="generation-mode" value="fast" checked>
        <div class="mode-info">
          <strong>快速生成</strong>
          <span>使用 DeepSeek，约 30 秒，适合快速验证</span>
        </div>
      </label>
      <label class="mode-option">
        <input type="radio" name="generation-mode" value="deep">
        <div class="mode-info">
          <strong>深度研究</strong>
          <span>使用 DeepResearch，约 2-3 分钟，包含数据验证和引用</span>
        </div>
      </label>
    </div>
  `;

  // 插入到确认按钮之前
  modal.querySelector('.modal-footer').before(modeSection);
}

// 在生成时获取选中的模式
async startGeneration(type, selectedChapters) {
  const mode = document.querySelector('input[name="generation-mode"]:checked')?.value || 'fast';

  // 调用 API 时传递模式
  await this.api.generateBusinessPlan(chatId, {
    type,
    mode,  // 新增：生成模式
    chapterIds: selectedChapters
  });
}
```

### 后端 API 修改

修改 `/backend/src/features/business-plan/interfaces/business-plan-routes.js`：

```javascript
// POST /api/business-plan/generate-batch
router.post('/generate-batch', async (req, res) => {
  const { chatId, type, chapterIds, mode } = req.body; // 新增 mode 参数

  // 传递给 use case
  const result = await businessPlanUseCase.generateBatchChapters(businessPlanId, {
    chapterIds,
    conversationHistory,
    mode // 新增：生成模式
  });
});
```

### 章节配置

**商业计划书**（`business`）：

- **核心章节**（4个）：执行摘要、市场分析、解决方案、商业模式
- **可选章节**（7个）：竞争格局、市场策略、团队架构、财务预测、风险评估、实施计划、附录

**产品立项报告**（`proposal`）：

- **核心章节**（4个）：项目摘要、问题洞察、产品方案、实施路径
- **可选章节**（3个）：竞品分析、预算规划、风险控制

### DeepResearch 优先级

建议先实现以下章节的深度研究模式（数据密集型）：

1. **市场分析**（`market-analysis`）- 需要市场数据、用户画像
2. **竞争格局**（`competitive-landscape`）- 需要竞品信息、市场定位
3. **财务预测**（`financial-projection`）- 需要行业数据、成本基准

其他章节可以继续使用快速模式（DeepSeek）。
