# 快速开始指南

本指南将帮助你快速搭建 ThinkCraft 开发环境并开始开发。

## 环境要求

### 必需

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **浏览器**: Chrome/Edge/Safari (支持ES6+)

### 推荐

- **编辑器**: VS Code
- **Git**: 最新版本

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd ThinkCraft
```

### 2. 安装依赖

```bash
npm install
```

这将安装以下依赖：

- Jest - 测试框架
- @testing-library/dom - DOM测试工具
- @testing-library/jest-dom - Jest DOM匹配器
- ESLint - 代码规范检查

### 3. 配置开发环境

#### VS Code 推荐插件

- ESLint
- Prettier
- JavaScript (ES6) code snippets
- Path Intellisense

#### VS Code 设置

创建 `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript"],
  "files.associations": {
    "*.js": "javascript"
  }
}
```

### 4. 启动开发服务器

```bash
# 使用Python的简单HTTP服务器
python3 -m http.server 8000

# 或使用Node.js的http-server
npx http-server -p 8000
```

访问 http://localhost:8000 查看应用。

### 5. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- helpers.test.js

# 监听模式（自动重新运行）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 项目结构

```
ThinkCraft/
├── frontend/
│   ├── js/
│   │   ├── modules/          # 功能模块
│   │   │   ├── chat/         # 聊天模块
│   │   │   ├── report/       # 报告模块
│   │   │   └── ...
│   │   ├── utils/            # 工具函数
│   │   │   ├── dom.js
│   │   │   ├── format.js
│   │   │   ├── helpers.js
│   │   │   └── icons.js
│   │   ├── core/             # 核心模块
│   │   │   ├── state-manager.js
│   │   │   ├── api-client.js
│   │   │   └── storage-manager.js
│   │   └── app-boot.js       # 应用启动文件
│   └── css/                  # 样式文件
├── docs/                     # 文档
├── tests/                    # 测试文件
├── jest.config.js            # Jest配置
├── jest.setup.js             # Jest设置
├── .eslintrc.json            # ESLint配置
└── package.json              # 项目配置

```

## 开发工作流

### 1. 创建新分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 开发功能

#### 添加新模块

1. 在 `frontend/js/modules/` 创建新模块文件
2. 编写模块代码（使用ES6类）
3. 添加JSDoc注释
4. 在 `index.html` 中引入模块

#### 示例：创建新模块

```javascript
/**
 * 示例模块
 * @module ExampleModule
 */
class ExampleModule {
  constructor() {
    this.state = window.state;
  }

  /**
   * 示例方法
   * @param {string} param - 参数说明
   * @returns {string} 返回值说明
   */
  exampleMethod(param) {
    // 实现逻辑
    return `Result: ${param}`;
  }
}

// 创建全局实例
window.exampleModule = new ExampleModule();

// 暴露全局函数（向后兼容）
function exampleFunction(param) {
  return window.exampleModule.exampleMethod(param);
}
```

### 3. 编写测试

在模块同目录下创建 `.test.js` 文件：

```javascript
/**
 * example-module.test.js
 */
import { ExampleModule } from './example-module.js';

describe('ExampleModule', () => {
  let module;

  beforeEach(() => {
    module = new ExampleModule();
  });

  test('应该正确处理参数', () => {
    const result = module.exampleMethod('test');
    expect(result).toBe('Result: test');
  });
});
```

### 4. 运行测试

```bash
npm test -- example-module.test.js
```

### 5. 提交代码

```bash
git add .
git commit -m "feat: 添加示例模块"
git push origin feature/your-feature-name
```

## 常见任务

### 添加新的工具函数

1. 在 `frontend/js/utils/helpers.js` 添加函数
2. 添加JSDoc注释
3. 导出函数
4. 编写测试

```javascript
/**
 * 示例工具函数
 * @param {number} value - 输入值
 * @returns {number} 处理后的值
 */
export function exampleHelper(value) {
  return value * 2;
}
```

### 修改现有模块

1. 找到对应的模块文件
2. 修改代码
3. 更新JSDoc注释
4. 运行测试确保没有破坏现有功能
5. 如需要，添加新的测试用例

### 调试技巧

#### 1. 使用浏览器开发者工具

- 打开 Chrome DevTools (F12)
- 使用 Console 查看日志
- 使用 Sources 设置断点
- 使用 Network 查看API请求

#### 2. 添加调试日志

```javascript
console.log('[ModuleName] Debug info:', data);
console.error('[ModuleName] Error:', error);
console.warn('[ModuleName] Warning:', warning);
```

#### 3. 使用断点

```javascript
debugger; // 代码会在这里暂停
```

### 性能分析

#### 1. 使用Performance API

```javascript
const start = performance.now();
// 执行操作
const end = performance.now();
console.log(`操作耗时: ${end - start}ms`);
```

#### 2. 使用Chrome Performance工具

- 打开 DevTools > Performance
- 点击 Record
- 执行操作
- 停止录制并分析

## 代码规范

### JavaScript规范

#### 1. 命名规范

- 类名：PascalCase (`MessageHandler`)
- 函数名：camelCase (`sendMessage`)
- 常量：UPPER_SNAKE_CASE (`MAX_LENGTH`)
- 私有方法：前缀下划线 (`_privateMethod`)

#### 2. 注释规范

使用JSDoc格式：

```javascript
/**
 * 函数说明
 * @param {string} param1 - 参数1说明
 * @param {number} param2 - 参数2说明
 * @returns {boolean} 返回值说明
 */
function example(param1, param2) {
  // 实现
}
```

#### 3. 代码风格

- 使用2空格缩进
- 使用单引号
- 语句末尾加分号
- 每行最多80字符

### Git提交规范

使用约定式提交（Conventional Commits）：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）**:

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**:

```
feat(chat): 添加语音输入功能

- 集成Web Speech API
- 添加语音识别UI
- 支持中英文识别

Closes #123
```

## 常见问题

### Q: 测试失败怎么办？

A:

1. 检查错误信息
2. 确认测试环境配置正确
3. 运行 `npm test -- --verbose` 查看详细信息
4. 检查是否有未提交的更改

### Q: 如何添加新的依赖？

A:

```bash
# 生产依赖
npm install <package-name>

# 开发依赖
npm install --save-dev <package-name>
```

### Q: 如何更新文档？

A:

1. 修改对应的 `.md` 文件
2. 更新版本号和日期
3. 提交更改

### Q: 如何查看测试覆盖率？

A:

```bash
npm run test:coverage
# 打开 coverage/lcov-report/index.html 查看详细报告
```

## 下一步

- 阅读[架构设计](../architecture.md)了解系统架构
- 查看[模块文档](../modules/)了解各模块功能
- 学习[测试指南](./testing.md)编写测试
- 参考[添加新功能](./adding-features.md)开发新功能

## 获取帮助

- 查看[文档](../README.md)
- 提交[Issue](https://github.com/your-repo/issues)
- 加入讨论组

---

**最后更新**: 2026-01-30
**文档版本**: v1.0
