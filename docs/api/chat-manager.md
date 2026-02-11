# ChatManager API 文档

> 文件位置：`frontend/js/modules/chat/chat-manager.js`

## 概述

`ChatManager` 负责对话的保存、加载与列表交互逻辑。

## 初始化

该模块由应用启动或懒加载系统创建实例。

## 常用方法

- `saveCurrentChat()`：保存当前对话到本地存储
- `loadChat(chatId)`：加载指定对话并刷新 UI
- `getActiveInputValue()`：获取当前输入框内容
- `applyInputDraft(chatId)`：应用输入草稿

## 依赖

- `window.state`：全局状态
- `window.storageManager`：本地持久化
- `loadChats()`：对话列表刷新

## 相关文档

- `docs/modules/chat.md`
- `docs/architecture/ADR-001-modular-refactor.md`
