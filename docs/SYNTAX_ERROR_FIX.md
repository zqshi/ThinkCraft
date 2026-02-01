# 语法错误修复报告

## 问题描述

在执行登出功能修复后，发现以下语法错误：

```
app-helpers.js:13 Uncaught SyntaxError: Unexpected token 'export'
report-generator.js:16 Uncaught SyntaxError: Cannot use import statement outside a module
business-plan-generator.js:6 Uncaught SyntaxError: Cannot use import statement outside a module
report-button-manager.js:6 Uncaught SyntaxError: Cannot use import statement outside a module
```

## 根本原因

这些文件在 HTML 中作为普通脚本加载（没有 `type="module"`），但使用了 ES6 的 `import/export` 语法。

## 修复方案

### 1. 移除 `export` 关键字

**文件**: `frontend/js/utils/app-helpers.js`

```javascript
// 修复前
export function normalizeChatId(chatId) { ... }

// 修复后
function normalizeChatId(chatId) { ... }
```

### 2. 暴露函数到 window 对象

**文件**: `frontend/js/utils/app-helpers.js`

```javascript
// 在文件末尾添加
window.normalizeChatId = normalizeChatId;
```

### 3. 移除 `import` 语句，改用全局声明

**文件**: `frontend/js/modules/state/report-button-manager.js`
```javascript
// 修复前
import { normalizeChatId } from '../../utils/app-helpers.js';

// 修复后
/* global normalizeChatId */
```

**文件**: `frontend/js/modules/report/report-generator.js`
```javascript
// 修复前
import { normalizeChatId } from '../../utils/app-helpers.js';

// 修复后
/* global normalizeChatId */
```

**文件**: `frontend/js/modules/business-plan-generator.js`
```javascript
// 修复前
import { normalizeChatId } from '../utils/app-helpers.js';

// 修复后
/* global normalizeChatId */
```

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `frontend/js/utils/app-helpers.js` | 移除 `export` 关键字，添加 `window.normalizeChatId` |
| `frontend/js/modules/state/report-button-manager.js` | 移除 `import` 语句，添加 `/* global normalizeChatId */` |
| `frontend/js/modules/report/report-generator.js` | 移除 `import` 语句，添加 `/* global normalizeChatId */` |
| `frontend/js/modules/business-plan-generator.js` | 移除 `import` 语句，添加 `/* global normalizeChatId */` |

## 验证

修复后，所有语法错误应该消失。可以通过以下方式验证：

1. 刷新页面
2. 检查浏览器控制台是否还有 `SyntaxError`
3. 确认 `window.normalizeChatId` 可用：
   ```javascript
   console.log(typeof window.normalizeChatId); // 应该是 'function'
   ```

## 后续建议

如果项目需要使用 ES6 模块系统，建议：

1. 将所有脚本改为 `type="module"` 加载
2. 使用打包工具（如 Webpack、Rollup）进行模块打包
3. 统一使用 `import/export` 语法

但这需要更大范围的重构，不在本次修复范围内。
