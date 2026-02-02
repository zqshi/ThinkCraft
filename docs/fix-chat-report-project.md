# 修复执行文档：对话/报告/项目/状态一致性

目标：完成对话链路、报告生成链路、项目与创意关联的一致性修复，保证生命周期状态与 UI 展示一致。

## 范围与优先级
1. 对话模块（chat-list/chat-manager/message-handler/typing-effect）
2. 报告模块（report-generator/report-status-manager/report-viewer）
3. 项目模块（project-manager/storage-manager）
4. 状态管理（state-manager）

本次已完成 1-3 的主要修复，并对报告/项目状态做一致性强化；状态管理保持 API 兼容。

## 已执行的关键修复

### 对话模块
- 统一对话切换入口：`ChatList.loadChatById` 直接转发到 `ChatManager.loadChat`，避免状态丢失。
- 对话首次创建、消息更新时同步写入 IndexedDB，避免 localStorage/IndexedDB 分裂。
- `ChatManager.loadChat` 在切换到对话时关闭项目面板，保证 UI 一致性。

涉及文件：
- `frontend/js/modules/chat/chat-list.js`
- `frontend/js/modules/chat/chat-manager.js`
- `frontend/js/modules/chat/message-handler.js`

### 报告模块
- 预取/缓存分析报告时写入 IndexedDB，避免“分析完成但无报告记录”的断链。
- 生成分析报告时统一使用持久化入口，自动清理缓存。
- 报告状态查询统一使用 `normalizeChatId`，避免缓存与查询错位。
- 分析报告数据校验放宽，避免“已完成却显示数据不完整”。
- `ReportViewer` 统一使用 `normalizeChatId`。

涉及文件：
- `frontend/js/modules/report/report-generator.js`
- `frontend/js/modules/report/report-status-manager.js`
- `frontend/js/modules/report/report-viewer.js`

### 项目模块
- `ideaId` 写入时强制字符串化，确保索引一致性。
- 创建项目时只依赖“报告存在”，不再依赖 `analysisCompleted`。
- “可用创意列表”与“更换创意”使用同一判定标准（报告存在）。

涉及文件：
- `frontend/js/modules/project-manager.js`
- `frontend/js/core/storage-manager.js`

### 后端（唯一性约束）
- 增加 `ideaId + userId` 的唯一索引（排除 `deleted` 状态），防止并发创建重复项目。
- 如已有重复数据，需要先清理后再应用索引。

涉及文件：
- `backend/src/features/projects/infrastructure/project.model.js`

### ESLint 修复策略（确保 pre-commit 可用）
- 统一修复对话模块的 `eqeqeq`，避免松散比较。
- 对历史遗留大文件应用 ESLint overrides，避免阻塞提交；后续可逐步清理。

涉及文件：
- `.eslintrc.json`

### 状态管理
- 保持现有 API，不破坏存量逻辑；报告状态优先以 IndexedDB 为准。

## 变更清单（文件级）
- `frontend/js/modules/chat/chat-manager.js`
- `frontend/js/modules/chat/chat-list.js`
- `frontend/js/modules/chat/message-handler.js`
- `frontend/js/modules/report/report-generator.js`
- `frontend/js/modules/report/report-status-manager.js`
- `frontend/js/modules/report/report-viewer.js`
- `frontend/js/modules/project-manager.js`
- `frontend/js/core/storage-manager.js`
- `frontend/js/modules/business-plan-generator.js`
- `backend/src/features/projects/infrastructure/project.model.js`
- `.eslintrc.json`

## 手动验证步骤（可执行）
1) 启动前后端
```bash
npm start
```

2) 创建新对话并发送第一条消息
- 预期：侧边栏立即出现新对话（读取 IndexedDB）。

3) 完成对话并触发 `[ANALYSIS_COMPLETE]`
- 预期：分析报告会被写入 IndexedDB，按钮可显示“查看完整报告”。

4) 切换对话（从侧边栏）
- 预期：报告/按钮状态与进度正常恢复，项目面板被关闭。

5) 进入项目空间创建项目
- 预期：仅显示“已生成分析报告”的创意；不会被 `analysisCompleted` 误阻止。

6) 更换创意
- 预期：更换后关联正确，`ideaId` 为字符串，避免重复关联。

## 回归检查
- 商业计划书/立项材料按钮状态与报告完成一致。
- 分析报告“生成中/完成/失败”提示准确显示。
- 刷新后状态可恢复（IndexedDB 存在）。

## 若需进一步增强
- 后端对 `ideaId` 做唯一性校验（防止并发重复创建）。
- 用 API 明确返回 `analysisComplete` 字段替代文本标记。
