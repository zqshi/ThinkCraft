# 精炼需求文档-LLM版模板

> 面向LLM的精炼需求文档模板

---

## 模板元信息

**Template**: 精炼需求文档-LLM版模板
**Version**: v1.0
**适用场景**: 需求设计阶段 - 最终输出环节
**输出文件命名**: `精炼需求文档-LLM-{产品名称}-v{YYYYMMDDHHmmss}.md`

---

## 模板结构

````markdown
# 精炼需求文档（LLM版）

---

**Template**: 精炼需求文档-LLM版模板
**Version**: v{YYYYMMDDHHmmss}
**Changelog**: {时间} - {修改人} - {修改原因摘要}

---

## 1. 文档元信息

### 1.1 文档属性

- **产品名称**: [产品名称]
- **文档版本**: v{YYYYMMDDHHmmss}
- **文档类型**: 精炼需求文档（LLM版）
- **目标读者**: LLM（战略设计Agent、开发Agent等）

### 1.2 依赖文档

- **需求设计文档-传统版**: [文档路径] - v{YYYYMMDDHHmmss}
- **需求设计挑战回应**: [文档路径] - v{YYYYMMDDHHmmss}

---

## 2. 产品概述

### 2.1 产品定位

[一句话描述产品定位]

### 2.2 核心价值

- **用户价值**: [一句话描述用户价值]
- **业务价值**: [一句话描述业务价值]

### 2.3 成功指标

```json
{
  "business_metrics": [
    { "name": "[指标名称]", "current": "[当前值]", "target": "[目标值]", "measure": "[衡量方式]" }
  ],
  "user_metrics": [
    { "name": "[指标名称]", "current": "[当前值]", "target": "[目标值]", "measure": "[衡量方式]" }
  ]
}
```
````

---

## 3. 目标用户

```json
{
  "user_personas": [
    {
      "name": "[用户名称]",
      "priority": "P0/P1/P2/P3",
      "characteristics": {
        "age": "[年龄范围]",
        "occupation": "[职业]",
        "income": "[收入范围]"
      },
      "pain_points": [
        {
          "description": "[痛点描述]",
          "severity": "high/medium/low",
          "frequency": "high/medium/low"
        }
      ],
      "expectations": ["[期望1]", "[期望2]"]
    }
  ]
}
```

---

## 4. 功能需求

### 4.1 功能架构

```json
{
  "modules": [
    {
      "id": "module-001",
      "name": "[模块名称]",
      "description": "[模块描述]",
      "priority": "P0/P1/P2/P3",
      "dependencies": ["module-002"]
    }
  ]
}
```

### 4.2 功能详细设计

#### 功能模块1：[模块名称]

##### 用户故事

```json
{
  "id": "US-001",
  "title": "[用户故事标题]",
  "as_a": "[用户角色]",
  "i_want": "[完成某个任务]",
  "so_that": "[获得某种价值]",
  "priority": "P0/P1/P2/P3",
  "details": {
    "scenario": "[详细场景描述]",
    "trigger": "[触发条件]",
    "preconditions": ["[前置条件1]", "[前置条件2]"]
  }
}
```

##### 验收标准

```json
{
  "acceptance_criteria": [
    {
      "id": "AC-001",
      "title": "[验收标准标题]",
      "type": "normal/error/edge",
      "given": "[前置条件]",
      "when": "[操作行为]",
      "then": "[预期结果]"
    },
    {
      "id": "AC-002",
      "title": "[验收标准标题]",
      "type": "error",
      "given": "[前置条件]",
      "when": "[操作行为]",
      "then": "[预期结果]"
    },
    {
      "id": "AC-003",
      "title": "[验收标准标题]",
      "type": "edge",
      "given": "[前置条件]",
      "when": "[操作行为]",
      "then": "[预期结果]"
    }
  ]
}
```

##### 业务规则

```json
{
  "business_rules": [
    {
      "id": "BR-001",
      "description": "[业务规则描述]",
      "type": "validation/calculation/workflow",
      "priority": "must/should/could"
    }
  ]
}
```

##### 输入输出

```json
{
  "inputs": [
    {
      "field": "[字段名]",
      "type": "string/number/boolean/object/array",
      "required": true/false,
      "description": "[说明]",
      "constraints": {
        "min_length": 0,
        "max_length": 100,
        "pattern": "[正则表达式]",
        "enum": ["value1", "value2"]
      }
    }
  ],
  "outputs": [
    {
      "field": "[字段名]",
      "type": "string/number/boolean/object/array",
      "description": "[说明]"
    }
  ]
}
```

##### 状态管理

```json
{
  "states": [
    {
      "name": "[状态名称]",
      "description": "[状态描述]",
      "transitions": [
        {
          "to": "[目标状态]",
          "trigger": "[触发条件]",
          "guard": "[守卫条件]",
          "action": "[执行动作]"
        }
      ]
    }
  ]
}
```

##### 依赖关系

```json
{
  "dependencies": {
    "depends_on": ["US-002", "US-003"],
    "depended_by": ["US-005"]
  }
}
```

#### 功能模块2：[模块名称]

[按照相同结构描述]

---

## 5. 非功能需求

```json
{
  "non_functional_requirements": {
    "performance": {
      "response_time": "[具体指标]",
      "concurrent_users": "[具体指标]",
      "throughput": "[具体指标]"
    },
    "availability": {
      "uptime": "[可用性指标，如99.9%]",
      "recovery_time": "[故障恢复时间]",
      "backup_strategy": "[备份策略]"
    },
    "security": {
      "data_security": ["[安全要求1]", "[安全要求2]"],
      "access_control": ["[权限要求1]", "[权限要求2]"],
      "compliance": ["[合规要求1]", "[合规要求2]"],
      "privacy": ["[隐私保护措施1]", "[隐私保护措施2]"]
    },
    "usability": {
      "learning_curve": "[描述]",
      "efficiency": "[描述]",
      "error_tolerance": "[描述]"
    },
    "compatibility": {
      "browsers": ["[浏览器1]", "[浏览器2]"],
      "devices": ["[设备类型1]", "[设备类型2]"],
      "os": ["[操作系统1]", "[操作系统2]"]
    },
    "scalability": {
      "functional": "[功能扩展性描述]",
      "data": "[数据扩展性描述]",
      "user": "[用户扩展性描述]"
    }
  }
}
```

---

## 6. 约束条件

```json
{
  "constraints": {
    "technical": [{ "description": "[技术约束描述]", "impact": "high/medium/low" }],
    "business": [{ "description": "[业务约束描述]", "impact": "high/medium/low" }],
    "resource": {
      "time": "[时间约束]",
      "budget": "[预算约束]",
      "team": "[人力约束]"
    },
    "compliance": [{ "description": "[合规约束描述]", "type": "legal/industry/internal" }]
  }
}
```

---

## 7. 风险评估

```json
{
  "risks": [
    {
      "id": "RISK-001",
      "category": "requirement/technical/business",
      "description": "[风险描述]",
      "impact": "high/medium/low",
      "probability": "high/medium/low",
      "mitigation": "[应对措施]",
      "owner": "[负责人]"
    }
  ]
}
```

---

## 8. MVP与迭代

```json
{
  "mvp": {
    "scope": {
      "included_features": ["US-001", "US-002", "US-003"],
      "excluded_features": [{ "id": "US-010", "reason": "[排除原因]" }]
    },
    "success_criteria": ["[成功标准1]", "[成功标准2]"]
  },
  "iterations": [
    {
      "version": "v1.1",
      "features": ["US-004", "US-005"],
      "goals": ["[目标1]", "[目标2]"],
      "timeline": "[计划时间]"
    }
  ]
}
```

---

## 9. 术语表

```json
{
  "glossary": [
    {
      "term": "[术语]",
      "definition": "[定义]",
      "aliases": ["[别名1]", "[别名2]"]
    }
  ]
}
```

---

## 10. 附录

### 10.1 参考文档

```json
{
  "references": [
    {
      "title": "[文档标题]",
      "path": "[文档路径]",
      "version": "v{YYYYMMDDHHmmss}",
      "type": "requirement/research/design"
    }
  ]
}
```

### 10.2 变更记录

```json
{
  "changes": [
    {
      "version": "v1.0",
      "date": "{YYYY-MM-DD}",
      "author": "[修改人]",
      "description": "初始版本",
      "impact": "none"
    }
  ]
}
```

---

## 合规自检

- [ ] 使用结构化JSON格式
- [ ] 所有必填字段已填写
- [ ] 用户故事符合INVEST原则
- [ ] 验收标准覆盖正常/异常/边界场景
- [ ] 验收标准使用Given-When-Then格式
- [ ] 业务规则明确
- [ ] 输入输出定义清晰
- [ ] 约束条件显式列出
- [ ] 符合设计原则（功能为中心、可测试性、结构化与可解析）
- [ ] 包含必要的元信息

---

**文档生成完成，版本号：v{YYYYMMDDHHmmss}**

```

---

## 使用说明

### 何时使用？
- 需求设计文档-传统版完成并通过质量挑战后
- 需要产出面向LLM的精炼需求文档时
- 准备进入战略设计阶段时

### 设计原则
1. **结构化**: 使用JSON格式，机器可解析
2. **精炼**: 去除冗余信息，保留核心内容
3. **明确**: 字段定义明确，无歧义
4. **完整**: 包含所有必要信息
5. **可测试**: 验收标准可直接转化为测试用例

### 与传统版的区别
| 维度 | 传统版 | LLM版 |
|------|--------|-------|
| 目标读者 | 人类 | LLM |
| 格式 | Markdown + 表格 | JSON |
| 详细程度 | 详细，包含背景和说明 | 精炼，只保留核心信息 |
| 可读性 | 高（人类） | 高（机器） |
| 可解析性 | 低 | 高 |

### 后续流程
1. 将精炼需求文档传递给战略设计Agent
2. 战略设计Agent基于精炼需求文档进行战略设计
3. 开发Agent基于精炼需求文档进行开发

---

## 相关模板

- **上一步**: [需求设计挑战回应文档模板](./design-response.md)
- **下一步**: 战略设计阶段
- **参考**: [需求设计文档-传统版模板](./design-doc-traditional.md)
```
