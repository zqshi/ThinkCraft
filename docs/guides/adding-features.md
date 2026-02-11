# 添加新功能指南

本指南将帮助你在ThinkCraft项目中添加新功能。

## 目录

1. [准备工作](#准备工作)
2. [创建新模块](#创建新模块)
3. [集成到主应用](#集成到主应用)
4. [添加测试](#添加测试)
5. [更新文档](#更新文档)
6. [提交代码](#提交代码)

---

## 准备工作

### 1. 了解项目结构

```
ThinkCraft/
├── frontend/
│   ├── js/
│   │   ├── app-boot.js          # 主应用入口
│   │   ├── modules/             # 功能模块
│   │   │   ├── chat/           # 聊天模块
│   │   │   ├── report/         # 报告模块
│   │   │   └── ...
│   │   └── utils/              # 工具函数
│   ├── css/                    # 样式文件
├── index.html                  # HTML入口（仓库根目录）
├── backend/                    # 后端代码
├── docs/                       # 文档
└── tests/                      # 测试
```

### 2. 设置开发环境

```bash
# 克隆项目
git clone <repository-url>
cd ThinkCraft

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test
```

### 3. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

---

## 创建新模块

### 步骤1: 创建模块文件

在`frontend/js/modules/`下创建新模块:

```bash
mkdir frontend/js/modules/your-module
touch frontend/js/modules/your-module/your-module.js
```

### 步骤2: 编写模块代码

```javascript
/**
 * YourModule - 模块描述
 *
 * @module YourModule
 * @description 详细描述模块功能
 */

/* eslint-disable no-unused-vars, no-undef */

class YourModule {
  /**
   * 创建YourModule实例
   * @constructor
   */
  constructor() {
    // 依赖注入
    this.state = window.state;
  }

  /**
   * 初始化模块
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // 初始化逻辑
      console.log('[YourModule] 初始化成功');
    } catch (error) {
      console.error('[YourModule] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 主要功能方法
   * @param {Object} params - 参数对象
   * @returns {Promise<Object>} 返回结果
   */
  async doSomething(params) {
    try {
      // 验证参数
      if (!params) {
        throw new Error('参数不能为空');
      }

      // 执行逻辑
      const result = await this._processData(params);

      // 返回结果
      return result;
    } catch (error) {
      console.error('[YourModule] 执行失败:', error);
      throw error;
    }
  }

  /**
   * 私有方法
   * @private
   * @param {Object} data - 数据
   * @returns {Promise<Object>} 处理结果
   */
  async _processData(data) {
    // 处理逻辑
    return data;
  }
}

// 导出模块(用于测试)
export { YourModule };
```

### 步骤3: 添加全局函数桥接

在模块文件末尾添加全局函数(向后兼容):

```javascript
// 全局实例
let yourModuleInstance = null;

/**
 * 获取YourModule实例
 * @returns {YourModule}
 */
function getYourModule() {
  if (!yourModuleInstance) {
    yourModuleInstance = new YourModule();
  }
  return yourModuleInstance;
}

/**
 * 全局函数: 执行某操作
 * @param {Object} params - 参数
 * @returns {Promise<Object>}
 */
async function doSomething(params) {
  return await getYourModule().doSomething(params);
}
```

---

## 集成到主应用

### 步骤1: 在index.html中引入模块

```html
<!-- 在其他模块之后引入 -->
<script src="frontend/js/modules/your-module/your-module.js"></script>
```

### 步骤2: 在app-boot.js中初始化

```javascript
// 在DOMContentLoaded事件中添加
document.addEventListener('DOMContentLoaded', async () => {
  // ... 其他初始化代码

  // 初始化YourModule
  try {
    const yourModule = getYourModule();
    await yourModule.init();
    console.log('[App] YourModule初始化成功');
  } catch (error) {
    console.error('[App] YourModule初始化失败:', error);
  }

  // ... 其他初始化代码
});
```

### 步骤3: 添加UI元素

在`index.html`中添加必要的UI元素:

```html
<!-- 在适当位置添加 -->
<div id="yourModuleContainer" class="your-module-container">
  <button id="yourModuleButton" class="btn">执行操作</button>
  <div id="yourModuleResult"></div>
</div>
```

### 步骤4: 添加事件监听

```javascript
// 在app-boot.js中添加事件监听
document.getElementById('yourModuleButton')?.addEventListener('click', async () => {
  try {
    const result = await doSomething({ param: 'value' });
    document.getElementById('yourModuleResult').textContent = JSON.stringify(result);
  } catch (error) {
    console.error('执行失败:', error);
    alert('操作失败,请重试');
  }
});
```

---

## 添加测试

### 步骤1: 创建测试文件

```bash
touch frontend/js/modules/your-module/your-module.test.js
```

### 步骤2: 编写单元测试

```javascript
/**
 * your-module.js 单元测试
 */

import { YourModule } from './your-module.js';

describe('YourModule', () => {
  let yourModule;

  beforeEach(() => {
    // 设置测试环境
    window.state = {
      // 模拟state对象
    };

    yourModule = new YourModule();
  });

  afterEach(() => {
    // 清理
    delete window.state;
  });

  describe('init', () => {
    test('应该成功初始化', async () => {
      await yourModule.init();
      // 验证初始化结果
      expect(yourModule.state).toBeDefined();
    });

    test('应该处理初始化错误', async () => {
      // 模拟错误
      window.state = null;

      await expect(yourModule.init()).rejects.toThrow();
    });
  });

  describe('doSomething', () => {
    test('应该成功执行', async () => {
      const params = { param: 'value' };
      const result = await yourModule.doSomething(params);

      expect(result).toBeDefined();
    });

    test('应该验证参数', async () => {
      await expect(yourModule.doSomething(null)).rejects.toThrow('参数不能为空');
    });

    test('应该处理错误', async () => {
      // 模拟错误场景
      const invalidParams = { invalid: true };

      await expect(yourModule.doSomething(invalidParams)).rejects.toThrow();
    });
  });
});
```

### 步骤3: 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- your-module.test.js

# 查看覆盖率
npm run test:coverage
```

### 步骤4: 确保测试覆盖率

目标覆盖率:

- 语句覆盖率: 80%+
- 分支覆盖率: 70%+
- 函数覆盖率: 80%+
- 行覆盖率: 80%+

---

## 更新文档

### 步骤1: 创建模块文档

```bash
touch docs/modules/your-module.md
```

### 步骤2: 编写模块文档

参考现有模块文档的结构:

```markdown
# YourModule 文档

## 概述

简要描述模块功能和用途。

## 主要功能

- 功能1
- 功能2
- 功能3

## API参考

### YourModule类

#### constructor()

创建实例...

#### doSomething(params)

执行某操作...

## 使用示例

\`\`\`javascript
const yourModule = new YourModule();
await yourModule.init();
const result = await yourModule.doSomething({ param: 'value' });
\`\`\`

## 最佳实践

1. ...
2. ...

## 常见问题

### Q: ...

A: ...
```

### 步骤3: 更新README

在项目README中添加新功能的说明:

```markdown
## 新功能: YourModule

简要描述...

详细文档: `docs/modules/your-module.md`
```

### 步骤4: 更新架构文档

在 `docs/architecture/ADR-001-modular-refactor.md` 的基础上补充新模块架构说明（或新增 ADR）。

---

## 提交代码

### 步骤1: 代码审查清单

- [ ] 代码符合项目规范
- [ ] 添加了完整的JSDoc注释
- [ ] 编写了单元测试
- [ ] 测试覆盖率达标
- [ ] 更新了文档
- [ ] 没有遗留console.log
- [ ] 没有遗留TODO注释
- [ ] 代码已格式化

### 步骤2: 运行完整测试

```bash
# 运行所有测试
npm test

# 检查代码规范
npm run lint

# 检查类型(如果使用TypeScript)
npm run type-check
```

### 步骤3: 提交代码

```bash
# 添加文件
git add .

# 提交(使用规范的提交信息)
git commit -m "feat: 添加YourModule功能

- 实现核心功能
- 添加单元测试
- 更新文档

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 推送到远程
git push origin feature/your-feature-name
```

### 步骤4: 创建Pull Request

1. 在GitHub上创建Pull Request
2. 填写PR描述:
   - 功能说明
   - 变更内容
   - 测试结果
   - 截图(如果有UI变更)
3. 请求代码审查
4. 根据反馈修改代码

---

## 提交信息规范

使用约定式提交(Conventional Commits):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型(type)**:

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式(不影响功能)
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**:

```
feat(chat): 添加语音输入功能

- 实现Web Speech API集成
- 添加语音识别UI
- 添加单元测试

Closes #123
```

---

## 最佳实践

### 1. 模块化设计

- 单一职责原则
- 低耦合高内聚
- 清晰的接口定义

### 2. 错误处理

```javascript
try {
  // 操作
} catch (error) {
  console.error('[YourModule] 错误:', error);
  // 显示用户友好的错误信息
  showError('操作失败,请重试');
  // 记录错误日志
  logError(error);
  throw error;
}
```

### 3. 性能优化

- 使用防抖/节流
- 懒加载
- 虚拟滚动
- 缓存机制

### 4. 用户体验

- 加载状态提示
- 错误提示
- 成功反馈
- 操作确认

---

## 常见问题

### Q: 如何调试新功能?

A: 使用浏览器开发者工具:

```javascript
console.log('[YourModule] 调试信息:', data);
debugger; // 设置断点
```

### Q: 如何处理异步操作?

A: 使用async/await:

```javascript
async function doSomething() {
  try {
    const result = await asyncOperation();
    return result;
  } catch (error) {
    console.error('异步操作失败:', error);
    throw error;
  }
}
```

### Q: 如何与其他模块交互?

A: 通过全局state或事件:

```javascript
// 通过state
window.state.yourData = data;

// 通过事件
window.dispatchEvent(
  new CustomEvent('your-event', {
    detail: { data }
  })
);
```

---

## 相关文档

- [架构 ADR](../architecture/ADR-001-modular-refactor.md)
- [测试指南](../guides/testing.md)
- [快速开始](getting-started.md)
- [代码规范](code-style.md)
