# ReportGenerator API 文档

> 文件位置：`frontend/js/modules/report/report-generator.js`

## 概述

`ReportGenerator` 负责报告生成、缓存获取与预取逻辑，面向前端调用。

## 初始化

该模块由懒加载管理器创建实例：

```js
const reportGenerator = await window.moduleLazyLoader.load('reportGenerator');
```

## 常用方法

- `prefetchAnalysisReport()`：后台预取分析报告（静默缓存）
- `fetchCachedAnalysisReport()`：从后端缓存获取报告并渲染
- `getAnalysisReportKey()`：基于当前对话消息生成缓存 Key

## 依赖

- `window.state`：全局状态
- `window.apiClient`：API 客户端
- `window.storageManager`：本地持久化
- `window.reportViewer`：报告渲染

## 相关文档

- `docs/modules/report.md`
- `docs/architecture/ADR-001-modular-refactor.md`
