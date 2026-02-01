# 新手引导清理功能测试指南

## 问题描述
页面会突然显示示例项目内容："示例项目详情"、"用户洞察平台"等。

## 修复内容
已在 `frontend/js/modules/onboarding/onboarding-manager.js` 中添加多层清理机制。

## 测试方法

### 方法 1: 浏览器控制台快速测试（推荐）

1. 打开应用页面（`index.html` 或 `OS.html`）
2. 按 `F12` 打开浏览器控制台
3. 复制粘贴 `quick-test.js` 的内容并回车
4. 查看输出结果

**或者直接运行：**
```javascript
// 检查是否有示例内容
const title = document.getElementById('projectPanelTitle');
const body = document.getElementById('projectPanelBody');
const mockCards = document.querySelectorAll('.project-card.onboarding-mock');

console.log('面板标题:', title?.textContent);
console.log('面板内容包含示例:', body?.innerHTML.includes('用户洞察平台'));
console.log('示例卡片数量:', mockCards.length);

// 如果发现问题，手动清理
if (window.onboardingManager) {
  window.onboardingManager.cleanupMockContent();
  console.log('✅ 已执行清理');
}
```

### 方法 2: 完整测试套件

1. 打开应用页面
2. 按 `F12` 打开控制台
3. 复制粘贴 `test-onboarding-cleanup.js` 的全部内容
4. 按回车运行
5. 查看详细测试结果

### 方法 3: 独立测试页面

1. 打开 `test-onboarding-cleanup.html`
2. 点击各个测试按钮
3. 查看测试结果

**注意：** 独立测试页面需要手动加载模块，可能不如控制台测试准确。

## 验证步骤

### 1. 验证自动清理
1. 刷新页面
2. 等待 2-3 秒
3. 检查页面是否有示例内容显示
4. **预期结果：** 不应该看到任何示例内容

### 2. 验证手动清理
1. 在控制台运行：
   ```javascript
   window.onboardingManager.cleanupMockContent();
   ```
2. 检查示例内容是否被清除
3. **预期结果：** 所有示例内容应该被清除

### 3. 验证引导完成后的清理
1. 如果是新用户，完成新手引导流程
2. 检查示例内容是否被清除
3. **预期结果：** 引导完成后示例内容应该消失

## 清理机制说明

修复后的代码包含 4 层防御：

1. **页面加载时清理** - 模块加载后自动执行
2. **初始化时清理** - `init()` 方法中检查并清理
3. **完成时清理** - `finish()` 方法中执行清理
4. **超时自动清理** - 示例面板显示 30 秒后自动清理

## 常见问题

### Q: 控制台显示 "onboardingManager 未加载"
**A:** 等待页面完全加载后再测试，或刷新页面。模块是延迟加载的。

### Q: 示例内容还在显示
**A:** 在控制台运行：
```javascript
window.onboardingManager.cleanupMockContent();
```

### Q: 如何确认修复生效？
**A:**
1. 清除浏览器缓存
2. 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）
3. 运行快速测试脚本

## 技术细节

### 清理的内容
- 示例项目面板（标题为"示例项目详情"）
- 示例项目卡片（class: `onboarding-mock`）
- 临时容器（`data-onboarding-temp="true"`）

### 清理时机
- 页面加载后 100ms
- 用户已完成引导时
- 引导流程结束时
- 示例面板显示 30 秒后

### 选择器
```javascript
// 面板标题
#projectPanelTitle (textContent === '示例项目详情')

// 面板内容
#projectPanelBody (innerHTML 包含 '用户洞察平台')

// 示例卡片
.project-card.onboarding-mock
[data-project-id="onboarding-mock-project"]

// 临时容器
[data-onboarding-temp="true"]
```

## 文件清单

- ✅ `frontend/js/modules/onboarding/onboarding-manager.js` - 主修复文件
- ✅ `test-onboarding-cleanup.js` - 完整测试套件
- ✅ `quick-test.js` - 快速测试脚本
- ✅ `test-onboarding-cleanup.html` - 独立测试页面
- ✅ `TEST_GUIDE.md` - 本文档
