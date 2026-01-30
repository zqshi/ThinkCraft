# 投产前数据清理指南

## 概述

本文档提供了ThinkCraft项目投产前的完整数据清理流程，确保所有Mock数据和测试数据被彻底清除。

## 数据存储位置

### 1. 后端数据（MongoDB）

- **projects** - 项目数据
- **chats** - 对话数据
- **business_plans** - 商业计划书
- **analysis_reports** - 分析报告
- **users** - 用户数据

### 2. 前端数据（浏览器）

#### IndexedDB (ThinkCraft数据库)
- **chats** - 对话历史
- **reports** - 报告缓存
- **projects** - 项目缓存
- **inspirations** - 灵感收件箱
- **knowledge** - 知识库
- **artifacts** - 工作流交付物
- **settings** - 用户设置

#### localStorage
- `thinkcraft_*` - 各种临时数据和配置

## 清理步骤

### 步骤1：清理后端数据（MongoDB）

**方式一：使用清理脚本（推荐）**

```bash
# 在项目根目录执行
node backend/scripts/clear-project-space.js
```

脚本会：
1. 统计当前数据量
2. 显示即将删除的记录数
3. 清理所有集合
4. 显示清理结果

**方式二：手动清理**

```bash
# 连接到MongoDB
mongosh

# 切换到数据库
use thinkcraft

# 清理各个集合
db.projects.deleteMany({})
db.chats.deleteMany({})
db.business_plans.deleteMany({})
db.analysis_reports.deleteMany({})
db.users.deleteMany({})

# 验证清理结果
db.projects.countDocuments()
db.chats.countDocuments()
db.business_plans.countDocuments()
db.analysis_reports.countDocuments()
db.users.countDocuments()
```

### 步骤2：清理前端数据（浏览器）

**方式一：使用清理页面（推荐）**

1. 在浏览器中打开 `clear-frontend-data.html`
2. 点击"扫描数据"查看当前数据量
3. 点击"清理所有数据"执行清理
4. 确认清理完成后刷新页面

**方式二：浏览器开发者工具**

1. 打开浏览器开发者工具（F12）
2. 进入 Application/应用 标签
3. 清理IndexedDB：
   - 找到 "IndexedDB" → "ThinkCraft"
   - 右键点击 → "Delete database"
4. 清理localStorage：
   - 找到 "Local Storage"
   - 右键点击 → "Clear"
5. 清理所有站点数据：
   - 点击 "Clear site data" 按钮

**方式三：使用浏览器控制台**

```javascript
// 打开浏览器控制台（F12），执行以下代码

// 清理IndexedDB
indexedDB.deleteDatabase('ThinkCraft');

// 清理localStorage
localStorage.clear();

// 清理sessionStorage
sessionStorage.clear();

console.log('前端数据已清理完成！');
```

### 步骤3：验证清理结果

#### 验证后端数据

```bash
# 执行清理脚本会自动显示清理结果
# 或手动验证
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/thinkcraft').then(async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(\`\${col.name}: \${count}\`);
  }
  process.exit(0);
});
"
```

#### 验证前端数据

1. 打开应用主页
2. 检查项目列表是否为空
3. 检查对话历史是否为空
4. 打开浏览器开发者工具，确认IndexedDB和localStorage已清空

### 步骤4：重启服务

```bash
# 停止后端服务
# Ctrl+C 或 kill进程

# 重启后端服务
npm start
# 或
node backend/server.js
```

## 清理检查清单

投产前请确认以下项目已完成：

- [ ] MongoDB数据已清空
  - [ ] projects集合
  - [ ] chats集合
  - [ ] business_plans集合
  - [ ] analysis_reports集合
  - [ ] users集合

- [ ] 前端IndexedDB已清空
  - [ ] chats存储
  - [ ] reports存储
  - [ ] projects存储
  - [ ] inspirations存储
  - [ ] knowledge存储
  - [ ] artifacts存储

- [ ] localStorage已清空

- [ ] 应用重启后运行正常

- [ ] 新建项目功能正常

- [ ] 无残留Mock数据

## 注意事项

1. **备份重要数据**：清理前请确认没有需要保留的数据，或已做好备份

2. **生产环境谨慎操作**：本清理脚本会删除所有数据，请确保在正确的环境中执行

3. **清理顺序**：建议先清理前端数据，再清理后端数据，最后重启服务

4. **验证清理结果**：清理后务必验证数据已完全清空，避免残留Mock数据

5. **用户数据**：如果有真实用户数据需要保留，请修改清理脚本，排除这些数据

## 常见问题

### Q1: 清理后应用无法正常启动？

**A:** 检查数据库连接配置，确保MongoDB服务正常运行。

### Q2: 前端仍显示旧数据？

**A:** 清空浏览器缓存并强制刷新（Ctrl+Shift+R 或 Cmd+Shift+R）。

### Q3: 需要保留某些测试数据？

**A:** 修改清理脚本，添加过滤条件排除需要保留的数据。例如：

```javascript
// 只删除测试用户的数据
await ProjectModel.deleteMany({ userId: { $regex: /^test_/ } });
```

### Q4: 如何只清理特定类型的数据？

**A:** 使用MongoDB查询条件：

```javascript
// 只删除某个时间之前的数据
await ChatModel.deleteMany({
  createdAt: { $lt: new Date('2024-01-01') }
});

// 只删除特定状态的项目
await ProjectModel.deleteMany({
  status: 'deleted'
});
```

## 自动化清理

如果需要定期清理测试数据，可以创建定时任务：

```bash
# 添加到crontab（每天凌晨2点清理）
0 2 * * * cd /path/to/ThinkCraft && node backend/scripts/clear-project-space.js >> /var/log/thinkcraft-cleanup.log 2>&1
```

## 联系支持

如果在清理过程中遇到问题，请联系技术支持团队。

---

**最后更新**: 2026-01-30
**版本**: 1.0.0
