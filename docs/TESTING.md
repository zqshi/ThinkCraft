# ThinkCraft 单元测试指南

## 测试框架

项目使用 **Jest** + **Testing Library** 进行单元测试。

### 已安装的依赖

- `jest` - 测试框架
- `jest-environment-jsdom` - 浏览器环境模拟
- `@testing-library/dom` - DOM测试工具
- `@testing-library/jest-dom` - Jest DOM匹配器
- `jsdom` - DOM实现

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- format.test.js

# 监听模式（自动重新运行）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 测试文件结构

```
frontend/js/
├── utils/
│   ├── format.js
│   ├── format.test.js          # 格式化工具测试
│   ├── dom.js
│   ├── dom.test.js             # DOM工具测试
│   └── jest-config.test.js     # Jest配置验证测试
├── modules/
│   ├── chat/
│   │   ├── typing-effect.js
│   │   └── typing-effect.test.js
│   └── ...
```

## 编写测试

### 基本测试结构

```javascript
describe('功能模块名称', () => {
  test('应该做某事', () => {
    // 准备
    const input = 'test';

    // 执行
    const result = someFunction(input);

    // 断言
    expect(result).toBe('expected');
  });
});
```

### DOM测试示例

```javascript
test('应该创建按钮元素', () => {
  const button = document.createElement('button');
  button.textContent = '点击';
  button.onclick = () => console.log('clicked');

  expect(button.textContent).toBe('点击');
  expect(button.onclick).toBeDefined();
});
```

### 异步测试示例

```javascript
test('应该异步加载数据', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

## 测试覆盖率目标

根据优化计划，我们的覆盖率目标是：

- **工具函数（utils/）**: 100%覆盖率
- **核心模块（modules/）**: 80%以上覆盖率
- **UI组件**: 60%以上覆盖率

## 当前状态

### ✅ 已完成

1. Jest测试框架配置
2. Testing Library集成
3. Jest配置验证测试（9个测试用例全部通过）
4. 测试脚本配置（test, test:watch, test:coverage）

### ⏳ 待完成

1. 为工具函数添加完整测试
   - format.js（格式化工具）
   - dom.js（DOM操作工具）
   - icons.js（图标工具）
   - helpers.js（辅助函数）

2. 为核心模块添加测试
   - message-handler.js（消息处理）
   - chat-list.js（对话列表）
   - report-generator.js（报告生成）
   - report-viewer.js（报告查看）

3. 集成测试
   - 完整的聊天流程测试
   - 报告生成流程测试

## 注意事项

### 浏览器全局函数测试

ThinkCraft的许多函数是浏览器全局函数（直接在window作用域定义），这些函数需要特殊处理才能测试：

1. **方案A**：重构为ES模块（推荐）

   ```javascript
   // 从全局函数改为导出函数
   export function formatTime(timestamp) { ... }
   ```

2. **方案B**：在测试中加载全局脚本

   ```javascript
   // 在测试文件中
   import './format.js';
   const { formatTime } = global;
   ```

3. **方案C**：使用jsdom加载完整HTML
   ```javascript
   // 加载index.html并测试
   ```

### 模块依赖

某些模块依赖全局状态（如`window.state`），测试时需要模拟：

```javascript
beforeEach(() => {
  global.window.state = {
    currentChat: null,
    messages: [],
    settings: { saveHistory: true }
  };
});
```

## 下一步

1. 将现有的浏览器全局函数重构为ES模块
2. 为每个工具函数编写完整测试
3. 为核心模块编写测试
4. 达到覆盖率目标

## 参考资料

- [Jest官方文档](https://jestjs.io/)
- [Testing Library文档](https://testing-library.com/)
- [Jest DOM匹配器](https://github.com/testing-library/jest-dom)
