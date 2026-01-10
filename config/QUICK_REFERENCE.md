# 系统提示词快速切换卡片

## 🎯 快速切换指南

编辑文件：`config/system-prompts.js`
修改行：`const DEFAULT_PROMPT = 'default';`

---

## 📋 可用预设

### 1️⃣ default（默认）
```javascript
const DEFAULT_PROMPT = 'default';
```
**适合：** 通用场景
**风格：** 专业友好
**特点：** 系统化引导，平衡分析

---

### 2️⃣ business_consultant（商业顾问）
```javascript
const DEFAULT_PROMPT = 'business_consultant';
```
**适合：** 严肃的商业项目验证
**风格：** 专业严谨，数据驱动
**特点：** 精益画布框架，深度分析
**关键词：** 投资人视角、可行性评估

---

### 3️⃣ friendly_mentor（友好导师）
```javascript
const DEFAULT_PROMPT = 'friendly_mentor';
```
**适合：** 初次创业者，需要鼓励
**风格：** 温暖、耐心、支持
**特点：** 倾听为主，分享经验
**关键词：** 陪伴、理解、鼓励

---

### 4️⃣ tech_product_expert（技术专家）
```javascript
const DEFAULT_PROMPT = 'tech_product_expert';
```
**适合：** SaaS产品、开发者工具
**风格：** 技术导向，高效直接
**特点：** 技术可行性+PLG策略
**关键词：** 架构设计、开源策略

---

### 5️⃣ lean_startup_coach（精益教练）
```javascript
const DEFAULT_PROMPT = 'lean_startup_coach';
```
**适合：** 快速验证想法，MVP开发
**风格：** 实验驱动，快速迭代
**特点：** 构建-测量-学习循环
**关键词：** 假设验证、最小测试

---

### 6️⃣ concise（简洁模式）
```javascript
const DEFAULT_PROMPT = 'concise';
```
**适合：** 时间紧迫，需要快速反馈
**风格：** 简短高效
**特点：** 单问单答，直击要害
**关键词：** 效率、速度

---

## 🔄 切换步骤

1. 打开 `config/system-prompts.js`
2. 找到最后一行 `const DEFAULT_PROMPT = 'default';`
3. 改为上面任一预设的代码
4. 保存文件
5. 刷新浏览器
6. 开始新对话测试

---

## 💡 场景推荐

| 你的情况 | 推荐预设 |
|---------|---------|
| 第一次创业，需要支持 | friendly_mentor |
| 准备融资，需要严谨分析 | business_consultant |
| 做技术产品/工具 | tech_product_expert |
| 快速验证想法 | lean_startup_coach |
| 时间紧迫，要快速决策 | concise |
| 通用场景 | default |

---

## ✏️ 自定义提示词

在 `SYSTEM_PROMPTS` 对象中添加：

```javascript
const SYSTEM_PROMPTS = {
    default: `...`,
    // ... 其他预设

    // 你的自定义预设
    my_custom: `你是XXX...`,
};

// 使用你的自定义预设
const DEFAULT_PROMPT = 'my_custom';
```

详细说明见：`config/README.md`

---

**刷新页面后，发送"你好，介绍一下你自己"测试新提示词！** 🚀
