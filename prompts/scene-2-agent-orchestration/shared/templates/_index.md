# 文档模板索引

> **快速查找所需模板**

---

## 📑 模板分类

### 1. Agent 调用规范

- **[Agent 调用模板](./agent-call/call-template.md)** - 协调者调用 Agent 时使用的标准 Prompt 结构
- **[调用前自检清单](./agent-call/call-checklist.md)** - 三层检查清单，确保调用质量

### 2. 需求设计阶段模板

#### 2.1 需求收集与澄清

- **[用户需求输入模板](./demand-design/user-input.md)** - 记录用户原始需求
- **[需求澄清问题模板](./demand-design/clarify-questions.md)** - 生成需求澄清问题列表
- **[需求澄清分析文档模板](./demand-design/clarify-analysis.md)** - 整合澄清结果的分析文档

#### 2.2 研究与分析

- **[产品研究分析报告模板](./demand-design/research-report.md)** - 市场环境、竞争格局、用户需求分析

#### 2.3 需求设计

- **[需求设计文档-传统版模板](./demand-design/design-doc-traditional.md)** - 面向人类阅读的完整需求文档
- **[需求设计挑战文档模板](./demand-design/design-challenge.md)** - 质量挑战问题列表
- **[需求设计挑战回应文档模板](./demand-design/design-response.md)** - 挑战回应与人类裁决
- **[精炼需求文档-LLM版模板](./demand-design/design-doc-llm.md)** - 面向 LLM 的精炼需求文档

### 3. 战略设计阶段模板

- **[战略设计分析文档模板](./strategy-design/strategy-analysis.md)** - 包含候选列表的反思论述
- **[战略设计文档模板](./strategy-design/strategy-doc.md)** - 正式战略设计文档
- **[战略设计挑战文档模板](./strategy-design/strategy-challenge.md)** - 质量挑战问题列表
- **[战略设计挑战回应文档模板](./strategy-design/strategy-response.md)** - 挑战回应与人类裁决

### 4. 开发阶段模板

#### 4.1 开发文档

- **[前端开发文档模板](./development/frontend-doc.md)** - 技术栈、项目结构、核心组件设计

#### 4.2 测试文档

- **[测试计划模板](./development/test-plan.md)** - 测试概述、策略、用例设计
- **[测试用例模板](./development/test-case.md)** - 功能/Prompt/工具测试用例
- **[测试报告模板](./development/test-report.md)** - 测试执行情况、缺陷统计、测试结论

#### 4.3 运维文档

- **[部署方案模板](./development/deploy-plan.md)** - 部署架构、容器化、CI/CD
- **[运维手册模板](./development/ops-manual.md)** - 系统概述、日常运维、故障处理

#### 4.4 性能优化

- **[性能分析报告模板](./development/performance-report.md)** - 性能基线、瓶颈分析
- **[优化方案模板](./development/optimization-plan.md)** - 优化目标、方案、实施计划

### 5. 检查清单与话术

#### 5.1 合规检查清单

- **[文档合规自检清单](./checklists/document-compliance.md)** - 所有文档必须执行的通用检查项
- **[流程推进自检](./checklists/process-checklist.md)** - 阶段推进前的合规自检
- **[设计原则检查](./checklists/design-principles.md)** - 用户中心、数据驱动、系统性等原则检查
- **[用户故事质量检查](./checklists/user-story-quality.md)** - 独立性、可协商、有价值等检查
- **[验收标准质量检查](./checklists/acceptance-criteria-quality.md)** - 具体明确、完整覆盖、业务导向检查

#### 5.2 交互话术

- **审查提问框架** - 问题定位、原则关联、影响评估、改进方向
- **挑战沟通原则** - 建设性、具体明确、附带建议、保持专业
- **用户沟通深度提问框架** - 场景还原、痛点挖掘、价值探索、边界确认

---

## 📝 文档元信息规范

所有文档必须包含以下元信息：

```markdown
**Template**: [模板名称]
**Version**: v{YYYYMMDDHHmmss}
**Changelog**: {时间} - {修改人} - {修改原因摘要}
```

---

## ✅ 合规自检流程

### 写作-落盘-校验-确认流程

1. **写作前绑定模板**：先读取模板库，确定模板名称与结构
2. **落盘写入**：按照模板章节与字段落盘至约定目录
3. **自动回读校验**：写入后立即回读，校验章节完整性与必填字段
4. **用户确认**：用户明确确认后方可推进下一阶段

### 章节匹配校验规则

- 模板中的一级/二级标题与字段名必须在产出文档中一一对应出现
- 不得随意增删或改名模板固定章节；扩展内容需作为"附录/补充"添加

### 合规自检（最低集）

- [ ] **模板匹配**：已使用正确的模板，章节结构与模板一致
- [ ] **元信息完整**：包含 Template、Version、Changelog 三项元信息
- [ ] **目录与命名符合规范**：文件命名和存放路径符合规范
- [ ] **依赖/来源存在且路径正确**：依赖的文档存在且路径正确
- [ ] **已获上一阶段用户确认**：上一阶段已完成并获得用户明确确认（首次调用除外）
- [ ] **核心原则符合**：功能为中心、无全局流程依赖、可测试性、结构化与可解析、约束显式

---

## 🔗 相关文档

- **核心原则**：[../../product-core-shared.md](../../product-core-shared.md)
- **Agent 协作规范**：[../../agent-collaboration.md](../../agent-collaboration.md)

---

## 📌 使用说明

### 如何选择模板？

1. 明确当前所处的阶段（需求设计/战略设计/开发）
2. 明确要产出的文档类型（分析/设计/挑战/回应/测试/部署等）
3. 在对应分类下查找匹配的模板
4. 严格按照模板的章节结构和格式要求组织文档

### 模板使用原则

- ✅ 严格遵循模板结构，不得随意增删章节
- ✅ 所有必填字段必须填写
- ✅ 扩展内容作为"附录/补充"添加
- ❌ 不得私自创建未定义的模板
- ❌ 不得混用不同阶段的模板

---

**注意**：本索引为精简版，完整模板内容请查阅各子目录下的具体模板文件。如需新增模板，请先在此索引中注册。
