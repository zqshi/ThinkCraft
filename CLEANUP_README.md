# 🧹 ThinkCraft 数据清理工具

投产前一键清理所有Mock数据和测试数据。

## 快速开始

### 方式一：一键清理（推荐）

```bash
# 执行交互式清理脚本
./cleanup.sh
```

这个脚本会：
1. ✅ 自动清理MongoDB数据
2. 📋 提示清理前端数据的步骤
3. ✅ 验证清理结果

### 方式二：分步清理

#### 步骤1：清理后端数据

```bash
# 使用npm命令
npm run cleanup

# 或直接执行脚本
node backend/scripts/clear-project-space.js
```

#### 步骤2：清理前端数据

在浏览器中打开 `clear-frontend-data.html`，点击"清理所有数据"。

#### 步骤3：验证清理结果

```bash
npm run cleanup:verify
```

## 清理内容

### 后端数据（MongoDB）
- ✅ projects - 项目数据
- ✅ chats - 对话数据
- ✅ business_plans - 商业计划书
- ✅ analysis_reports - 分析报告
- ✅ users - 用户数据

### 前端数据（浏览器）
- 📦 IndexedDB (ThinkCraft数据库)
  - chats, reports, projects
  - inspirations, knowledge, artifacts
- 📦 localStorage
  - thinkcraft_* 相关数据

## 工具说明

### 1. cleanup.sh
交互式Shell脚本，提供完整的清理流程。

**特点**：
- 需要确认才执行
- 自动清理后端数据
- 提供前端清理指引
- 验证清理结果

**使用**：
```bash
chmod +x cleanup.sh
./cleanup.sh
```

### 2. clear-project-space.js
后端数据清理脚本，清理MongoDB中的所有数据。

**特点**：
- 显示清理前数据统计
- 批量删除所有集合
- 显示清理结果

**使用**：
```bash
node backend/scripts/clear-project-space.js
```

### 3. clear-frontend-data.html
前端数据清理页面，可视化清理工具。

**特点**：
- 扫描当前数据量
- 一键清理IndexedDB和localStorage
- 实时显示清理日志
- 美观的UI界面

**使用**：
在浏览器中打开该文件即可。

### 4. npm scripts
在package.json中定义的快捷命令。

```bash
# 清理后端数据
npm run cleanup

# 验证清理结果
npm run cleanup:verify
```

## 清理流程

```
┌─────────────────────────────────────┐
│  1. 执行 ./cleanup.sh               │
│     或 npm run cleanup              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. 清理MongoDB数据                 │
│     - projects                      │
│     - chats                         │
│     - business_plans                │
│     - analysis_reports              │
│     - users                         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. 清理前端数据                    │
│     打开 clear-frontend-data.html   │
│     点击"清理所有数据"              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. 验证清理结果                    │
│     npm run cleanup:verify          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. 重启服务并测试                  │
│     确认无残留数据                  │
└─────────────────────────────────────┘
```

## 安全提示

⚠️ **警告**：清理操作不可逆！

- 清理前请确认没有需要保留的数据
- 建议先在开发环境测试
- 生产环境操作前务必备份数据

### 数据备份

```bash
# 备份MongoDB
mongodump --db thinkcraft --out ./backup/$(date +%Y%m%d)

# 恢复数据
mongorestore --db thinkcraft ./backup/20260130/thinkcraft
```

## 常见问题

### Q: 清理后应用无法启动？
**A**: 检查MongoDB连接配置，确保数据库服务正常运行。

### Q: 前端仍显示旧数据？
**A**: 清空浏览器缓存并强制刷新（Ctrl+Shift+R）。

### Q: 只想清理特定数据？
**A**: 修改清理脚本，添加过滤条件。例如：
```javascript
// 只删除测试用户的数据
await ProjectModel.deleteMany({ userId: { $regex: /^test_/ } });
```

### Q: 如何定期自动清理？
**A**: 使用cron定时任务：
```bash
# 每天凌晨2点清理
0 2 * * * cd /path/to/ThinkCraft && npm run cleanup
```

## 文档

- 📖 [详细清理指南](./DATA_CLEANUP_GUIDE.md)
- 📊 [清理完成报告](./CLEANUP_REPORT.md)

## 检查清单

投产前请确认：

- [ ] MongoDB数据已清空
- [ ] 前端IndexedDB已清空
- [ ] localStorage已清空
- [ ] 应用重启后运行正常
- [ ] 新建项目功能正常
- [ ] 无残留Mock数据

## 技术支持

如有问题，请查看详细文档或联系技术团队。

---

**版本**: 1.0.0
**更新时间**: 2026-01-30
