# ChatId 作用域错误修复

**修复时间**: 2026-01-31
**问题**: `ReferenceError: chatId is not defined` at business-plan-generator.js:482

---

## 问题描述

在 `BusinessPlanGenerator.generate()` 方法中，`chatId` 变量在 try 块内使用 `const` 定义，但在 catch 块中被引用，导致作用域错误。

### 错误堆栈
```
business-plan-generator.js:482 Uncaught (in promise) ReferenceError: chatId is not defined
    at BusinessPlanGenerator.generate (business-plan-generator.js:482:54)
    at BusinessPlanGenerator.startGeneration (business-plan-generator.js:271:16)
    at startGeneration (global-bridges.js:29:38)
    at HTMLButtonElement.onclick (index.html:571:73)
```

### 根本原因

**修复前**（第295行）:
```javascript
async generate(type, chapterIds) {
  try {
    // ...
    const chatId = this.state.state.currentChat || window.state?.currentChat || null;
    // ...
  } catch (error) {
    const genState = this.state.getGenerationState(chatId); // ❌ chatId 不在作用域内
    // ...
  }
}
```

由于 JavaScript 的块级作用域规则，`const` 定义的变量只在其所在的块（try 块）内可见，catch 块无法访问。

---

## 修复方案

将 `chatId` 的定义移到 try 块之前，使其在整个方法作用域内可见。

**修复后**（第281行）:
```javascript
async generate(type, chapterIds) {
  // 🔧 获取当前会话ID，用于数据隔离（在 try 块外定义，以便 catch 块可以访问）
  const chatId = this.state.state.currentChat || window.state?.currentChat || null;

  try {
    // 验证参数
    if (!type) {
      console.error('[生成] 缺少报告类型');
      alert('生成失败：缺少报告类型');
      return;
    }

    if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
      console.error('[生成] 缺少章节ID');
      alert('生成失败：请至少选择一个章节');
      return;
    }

    if (!chatId) {
      console.error('[生成] 缺少会话ID');
      alert('生成失败：无法确定当前会话');
      return;
    }
    // ...
  } catch (error) {
    const genState = this.state.getGenerationState(chatId); // ✅ 现在可以访问 chatId
    // ...
  }
}
```

---

## 修改文件

- **frontend/js/modules/business-plan-generator.js**
  - 将 `chatId` 定义从第295行移到第281行（try 块之前）
  - 调整了参数验证的顺序

---

## 验证

修复后，catch 块可以正常访问 `chatId` 变量，用于：
1. 获取生成状态：`this.state.getGenerationState(chatId)`
2. 更新错误状态：`this.state.errorGeneration(chatId, type, error)`
3. 持久化状态：`this.persistGenerationState(chatId, type, {...})`

---

## 影响范围

- ✅ 不影响正常生成流程（try 块）
- ✅ 修复了错误处理流程（catch 块）
- ✅ 保持了代码逻辑不变

---

**状态**: ✅ 已修复
**测试**: 需要在浏览器中测试生成流程和错误处理
