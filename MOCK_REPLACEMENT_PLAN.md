# Mock 数据替换方案

## 📊 Mock 数据分类

### 1. 测试专用 Mock（✅ 保留）
这些 mock 数据仅用于自动化测试，**不会影响生产环境**，应当保留：

- ✅ `backend/tests/mocks/mockAIService.js` - AI 服务 Mock
- ✅ `backend/tests/helpers/DeepSeekMockServer.js` - DeepSeek Mock 服务器
- ✅ `backend/tests/` 目录下所有测试文件

**处理：** 不需要修改，继续用于测试

---

### 2. 演示数据 Mock（⚠️ 标记为演示模式专用）
这些数据用于演示应用功能，应该：
- 在演示模式（DEMO_MODE）下使用
- 在生产模式下替换为真实 API

**文件列表：**
- ⚠️ `tests/fixtures/mock-data.js` - 完整的演示对话数据（19KB）
  - 包含：健身 APP 创意验证对话、演示报告、其他示例会话
  - **处理：** 添加环境判断，仅在 DEMO_MODE 下加载

- ⚠️ `frontend/js/app-config.js` - 前端配置
  - 包含：DEMO_TYPES, DEMO_FEATURES, MOCK_CHAPTERS
  - **处理：** 标记为演示配置，添加注释

---

### 3. 硬编码数据（🔴 需要替换为 API）
这些数据应该从后端 API 动态获取：

#### 前端代码中的硬编码：
- 🔴 `frontend/js/app-main.js:214` - 硬编码的 mock chat IDs
  ```javascript
  const mockChatIds = ['demo_fitness_app', 'chat_001', 'chat_002'];
  ```
  **处理：** 从 `/api/conversations` 获取用户的真实会话列表

- 🔴 `frontend/js/app-main.js:768-770` - 加载 MOCK_DATA
  ```javascript
  const demoChat = JSON.parse(JSON.stringify(window.MOCK_DATA.chat));
  ```
  **处理：** 从 `/api/conversations/:id` 获取具体会话

- 🔴 `frontend/js/app-main.js:1152` - 硬编码的演示报告
  ```javascript
  renderAIReport(window.MOCK_DATA.demoReport);
  ```
  **处理：** 从 `/api/report/:conversationId` 获取真实报告

---

## 🔄 替换实施计划

### 步骤 1: 标记演示模式文件
为 mock-data.js 添加环境判断，只在演示模式加载

### 步骤 2: 替换会话列表加载
将硬编码的 mockChatIds 替换为 API 调用：
- 新建 API: `GET /api/conversations/user/:userId`
- 返回用户的所有会话列表

### 步骤 3: 替换会话详情加载
将 MOCK_DATA.chat 替换为 API 调用：
- 现有 API: `GET /api/conversations/:id`
- 返回单个会话的完整信息

### 步骤 4: 替换报告数据加载
将 MOCK_DATA.demoReport 替换为 API 调用：
- 现有 API: `POST /api/report/generate`
- 或者新建: `GET /api/report/:conversationId`（获取已生成的报告）

---

## 📝 API 对应关系

| 前端需求 | 原始 Mock 数据 | 替换为 API |
|---------|---------------|-----------|
| 会话列表 | `mockChatIds` | `GET /api/conversations/user/:userId` |
| 会话详情 | `MOCK_DATA.chat` | `GET /api/conversations/:id` |
| 演示报告 | `MOCK_DATA.demoReport` | `GET /api/report/:conversationId` |
| 用户信息 | 硬编码 | `GET /api/auth/me` (已实现) |

---

## ✅ 已完成的工作

1. ✅ 创建了认证 API (`/api/auth/*`)
2. ✅ 前端已连接认证 API
3. ✅ 环境配置系统已建立

---

## 🎯 接下来的工作

1. 为演示数据添加环境判断
2. 实现会话列表 API（如果不存在）
3. 更新前端代码，从 API 加载数据而非 mock
4. 测试真实数据流程
