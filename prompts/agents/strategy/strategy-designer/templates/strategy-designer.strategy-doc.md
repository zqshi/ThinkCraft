---
id: strategy-designer.strategy-doc
name: strategy-designer-strategy-doc-template
description: 战略设计师，负责战略设计文档输出（strategy-doc 模板）
version: 1.0.0
last_updated: 2026-02-03
status: active
---

## Template

Version: 1.0.0
Last Updated: 2026-02-03

【模板全文】
【模板：strategy-designer.strategy-doc.md】

```markdown
# 战略设计文档（战略阶段）

---

**Template**: 战略设计文档-模板
**Version**: v{YYYYMMDDHHmmss}
**Changelog**: {时间} - strategy-design-agent - {修改原因摘要}

---

# 概述

[描述项目背景、战略目标与关键约束]

---

# 提示词构造块设计

**[构造块名称]**

- **详细内容**：这个构造块定义的具体的内容

---

# 工具设计

**[工具名称]**

- **英文ID**：工具的英文命名，大驼峰命名方式
- **介绍**：描述工具的功能
- **输入参数**：用 jsonschema 格式定义参数
- **返回结果**：用 jsonschema 格式定义结果

---

# 能力展示

[mermaid 时序图展示 Agent 的能力，工具使用英文ID]

---

# 全域纵览图

[把核心域、通用域、支撑域的关系画出来用 mermaid 文档]

---
```
