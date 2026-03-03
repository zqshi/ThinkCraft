# Project Manager Refactor Index

## Goal

将超大文件 `frontend/js/modules/project-manager.js` 拆分为职责清晰的子模块，保持业务逻辑不变，仅做结构治理与可维护性提升。

## Current Entry

- Main orchestrator: `frontend/js/modules/project-manager.js`
- Role: 状态持有 + 对外 API + 批量 delegate 注册（按模块注入 prototype 转发，减少壳方法重复）。

## Split Modules

- `frontend/js/modules/project-manager-setup.js`
  - 初始化与工作流目录加载：`init/loadProjects/getWorkflowCatalog/...`
- `frontend/js/modules/project-manager-data.js`
  - 项目数据访问：`createProject/getProject/updateProject/...`
- `frontend/js/modules/project-manager-sync.js`
  - 状态同步与工件轮询：`mergeExecutionState/pollProjectArtifacts/...`
- `frontend/js/modules/project-manager-entrypoints.js`
  - 入口交互：`openProject/openCollaborationMode/openProjectKnowledgePanel`
- `frontend/js/modules/project-manager-project-list.js`
  - 项目列表渲染：`renderProjectList/renderProjectCard`
- `frontend/js/modules/project-manager-panel-renderer.js`
  - 项目面板主渲染与阶段区域渲染
- `frontend/js/modules/project-manager-panel-content.js`
  - 项目面板内容区：成员/创意/知识摘要/报告索引
- `frontend/js/modules/project-manager-workflow-runner.js`
  - 工作流详情与执行入口
- `frontend/js/modules/project-manager-deliverables.js`
  - 交付物选择、缺失判断、生成与重试
- `frontend/js/modules/project-manager-artifacts-view.js`
  - 交付物 tab/内容显示与知识查看
- `frontend/js/modules/project-manager-artifact-preview.js`
  - 交付物预览面板相关
- `frontend/js/modules/project-manager-members.js`
  - 成员市场、雇佣/解雇、推荐成员映射
- `frontend/js/modules/project-manager-idea-flow.js`
  - 创意选择、更换创意、创建项目流程
- `frontend/js/modules/project-manager-collaboration.js`
  - 协同建议应用与阶段编排
- `frontend/js/modules/project-manager-report-preview.js`
  - 报告预览渲染（analysis/business/proposal）
- `frontend/js/modules/project-manager-stage-utils.js`
  - 阶段状态与类型映射工具
- `frontend/js/modules/project-manager-core-utils.js`
  - 通用工具：`formatTimeAgo/escapeHtml/mergeArtifacts`
- `frontend/js/modules/project-manager-ui-utils.js`
  - 轻量 UI 行为：阶段切换/步骤选中/占位操作提示
- `frontend/js/modules/project-manager-project-actions.js`
  - 项目操作：删除/改名/跳转对话
- `frontend/js/modules/project-manager-legacy-compat.js`
  - 旧版兼容入口

## Script Load Order

`index.html` 中 `project-manager.js` 之后加载各委托模块，使用统一 cache-bust 版本号（当前 `v=20260211-refactor-lite18`）。

## Validation Checklist

- `node --check frontend/js/modules/project-manager.js`
- `node --check frontend/js/modules/project-manager-*.js`
- `curl http://127.0.0.1:3000/api/health`
- 打开 `http://127.0.0.1:5173`，验证项目面板关键路径：
  - 新建项目/更换创意
  - 协同模式弹窗
  - 阶段执行与追加生成
  - 知识库入口与文件树
