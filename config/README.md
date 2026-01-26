# 系统提示词配置指南

## 📁 文件位置

**配置文件：** `config/system-prompts.js`

这个文件包含所有可用的系统提示词预设。

**报告提示词：** `config/report-prompts.js`

该文件用于“查看完整报告”的结构化分析报告生成要求。

---

## 🎯 快速开始

### 1. 切换预设

打开 `config/system-prompts.js`，找到文件末尾：

```javascript
// 修改这里切换不同的预设
const DEFAULT_PROMPT = 'default'; // 改为其他预设的key
```

**可用预设：**

- `default` - 当前默认的系统提示词

**示例：**

```javascript
// 切换为自定义模式
const DEFAULT_PROMPT = 'my_custom_prompt';
```

### 2. 修改现有预设

在 `SYSTEM_PROMPTS` 对象中找到对应的预设，直接修改内容：

```javascript
const SYSTEM_PROMPTS = {
  default: `你是ThinkCraft AI思维助手...

    // 在这里修改提示词内容
    你的使命：
    - 帮助用户...
    - 提出建设性的问题...
    `

  // 其他预设...
};
```

### 3. 创建新预设

在 `SYSTEM_PROMPTS` 对象中添加新的key：

```javascript
const SYSTEM_PROMPTS = {
  default: `...`,
  business_consultant: `...`,

  // 添加你的新预设
  my_custom_prompt: `你是XXX...

    你的特点：
    - XXX
    - XXX

    引导方式：
    1. XXX
    2. XXX
    `
};
```

然后设置为默认：

```javascript
const DEFAULT_PROMPT = 'my_custom_prompt';
```

### 4. 使修改生效

1. 保存 `config/system-prompts.js` 文件
2. 刷新浏览器（Cmd+R / Ctrl+R）
3. 开始新对话测试效果

**注意：** 已有的对话会继续使用旧的提示词，新对话会使用修改后的提示词。

---

## 📊 报告提示词配置

报告生成要求维护在 `config/report-prompts.js`。该提示词会约束后端输出的 JSON 结构。

**注意：** 若你调整了报告 JSON 结构，需要同步更新前端 `index.html` 的 `renderAIReport` 结构映射，否则报告弹窗会显示不完整。

## 📝 提示词设计建议

### 基本结构

一个好的系统提示词通常包含：

```
1. 角色定义
   "你是XXX，XXX领域的专家"

2. 核心能力/使命
   - 列出主要职责
   - 说明擅长的领域

3. 交互风格
   - 如何与用户对话
   - 语气和态度

4. 引导策略
   - 如何提问
   - 分析框架
   - 关键步骤

5. 行为准则
   - 应该做什么
   - 不应该做什么
```

### 示例模板

**最小化模板：**

```javascript
my_prompt: `你是[角色名称]，[一句话定位]。

核心职责：
- [职责1]
- [职责2]

对话方式：
- [风格1]
- [风格2]

引导思路：
1. [步骤1]
2. [步骤2]
3. [步骤3]`;
```

**完整模板：**

```javascript
my_prompt: `你是[角色名称]，[详细背景介绍]。

专业背景：
- [经验1]
- [经验2]
- [技能1]

分析框架：[使用的方法论]
1. [维度1]：[说明]
2. [维度2]：[说明]
3. [维度3]：[说明]

对话风格：
- [风格特点1]
- [风格特点2]
- [风格特点3]

引导策略：
1. [第一步做什么]
2. [第二步做什么]
3. [第三步做什么]

输出：[最终交付什么]

记住：[核心原则或座右铭]`;
```

### 设计原则

1. **清晰具体**
   - 避免模糊的描述
   - 给出具体的行为指导

2. **聚焦核心**
   - 不要试图做所有事情
   - 专注于1-2个核心价值

3. **符合场景**
   - 根据目标用户设计语气
   - 匹配实际使用场景

4. **可迭代**
   - 从简单开始
   - 根据反馈不断优化

---

## 💡 使用技巧

### 1. A/B测试

创建多个版本，测试哪个效果更好：

```javascript
default_v1: `...`,
default_v2: `...`,
default_v3: `...`,
```

### 3. 组合使用

在不同阶段切换预设：

- **初期探索** → `friendly_mentor`（建立信任）
- **深入分析** → `business_consultant`（严格验证）
- **执行阶段** → `lean_startup_coach`（快速迭代）

---

## 🔧 高级技巧

### 1. 动态提示词（未来功能）

可以扩展为根据对话内容动态调整：

```javascript
// 示例：检测用户背景后切换
if (userMessage.includes('技术')) {
  currentPrompt = SYSTEM_PROMPTS.tech_product_expert;
}
```

### 2. 领域专用预设

为特定行业创建专用预设：

```javascript
saas_advisor: `...`,      // SaaS产品
mobile_app_coach: `...`,  // 移动应用
hardware_expert: `...`,   // 硬件产品
social_impact: `...`,     // 社会影响力项目
```

### 3. 多语言支持

创建不同语言版本：

```javascript
default_en: `You are ThinkCraft...`,
default_zh: `你是ThinkCraft...`,
default_ja: `あなたはThinkCraft...`,
```

---

## 📊 效果评估

修改提示词后，观察：

1. **对话质量**
   - AI的问题是否切中要害？
   - 回复是否有帮助？

2. **用户体验**
   - 语气是否合适？
   - 是否让人愿意继续对话？

3. **分析深度**
   - 是否发现了用户忽视的盲点？
   - 建议是否可执行？

---

## 🐛 常见问题

### Q: 修改后没生效？

A: 确保：

1. 保存了文件
2. 刷新了浏览器（强制刷新：Cmd+Shift+R）
3. 开始了**新对话**（不是继续旧对话）

### Q: 提示词太长会有问题吗？

A: DeepSeek支持长提示词，但建议：

- 控制在500字以内
- 重点突出，避免冗余

### Q: 如何测试新提示词？

A:

1. 保存修改
2. 刷新页面
3. 发送测试消息："你好，介绍一下你自己"
4. 观察AI的自我介绍是否符合预期

### Q: 能否在对话中切换？

A: 当前版本不支持，需要刷新页面。未来可以添加这个功能。

---

## 📚 参考资源

**提示词工程：**

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering)

**商业分析框架：**

- 精益画布（Lean Canvas）
- 商业模式画布（Business Model Canvas）
- 价值主张画布（Value Proposition Canvas）

**创业方法论：**

- 精益创业（Lean Startup）
- 客户开发（Customer Development）
- 工作要做（Jobs To Be Done）

---

**祝你创建出完美的AI助手！** 🚀

有问题随时查看这个文档或修改配置文件。
