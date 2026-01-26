# ThinkCraft Architecture (DDD Refactor)

本次重构目标：在不改变前后端样式与对外接口的前提下，引入 DDD 分层结构，提升可维护性与未来迭代效率。

## 后端分层（backend/src）

```
backend/src/
  features/
    <feature>/
      domain/         # 领域模型/规则（目前为预留）
      application/    # 应用服务（用例/业务流程）
      interfaces/     # 接口适配（路由/控制器）
  infrastructure/
    ai/               # 第三方服务封装（DeepSeek）
  shared/             # 通用结果/错误结构
```

### 兼容策略

- `backend/routes/*` 保持不变（对外 API 不变）。
- 路由文件改为“适配层”，转发至 `backend/src/features/*/interfaces`。
- `backend/config/deepseek.js` 仍可被旧代码引用，但内部转发到 `backend/src/infrastructure/ai`。

## 前端分层（规划中）

前端目前仍是脚本级结构（`index.html` + `frontend/js/*`），将按以下顺序迁移：

```
frontend/src/
  domain/       # 领域模型/聚合（chat, report, project...）
  application/  # 用例（send message, generate report...）
  adapters/     # API、存储、DOM 适配
  ui/           # 视图与交互
```

为保证样式不变，HTML/CSS 不做结构性调整，仅重定向脚本入口。

## 当前完成的迁移

- Chat：`backend/src/features/chat/*`
- Report：`backend/src/features/report/*`
- DeepSeek client：`backend/src/infrastructure/ai/deepseek-client.js`

## 注意

- 所有外部 URL、请求/响应格式保持不变。
- 前端脚本迁移将以“替换内部实现 + 保持全局函数”方式推进。
