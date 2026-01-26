# 数据迁移工具

本目录包含ThinkCraft项目的数据迁移脚本，用于从内存存储迁移到MongoDB。

## 脚本说明

### 1. backup-data.js - 数据备份
将内存中的数据导出到JSON文件，作为迁移前的备份。

**使用方法：**
```bash
node scripts/backup-data.js
```

**输出：**
- 在 `backups/` 目录下生成带时间戳的JSON文件
- 文件名格式：`backup-YYYY-MM-DDTHH-MM-SS.json`

### 2. migrate-to-mongodb.js - 数据迁移
将内存数据迁移到MongoDB。

**使用方法：**
```bash
# 迁移数据（保留MongoDB现有数据）
node scripts/migrate-to-mongodb.js

# 清空MongoDB后再迁移
node scripts/migrate-to-mongodb.js --clear
```

**注意事项：**
- 确保MongoDB已启动并可连接
- 使用 `--clear` 参数会删除MongoDB中的所有现有数据
- 迁移过程中会显示每个用户的迁移状态

### 3. verify-migration.js - 数据验证
验证MongoDB中的数据与内存数据是否一致。

**使用方法：**
```bash
node scripts/verify-migration.js
```

**验证内容：**
- 用户数量是否一致
- 每个用户的关键字段是否匹配（ID、用户名、邮箱、密码哈希、状态）
- 生成详细的验证报告

### 4. restore-data.js - 数据恢复
从JSON备份文件恢复数据到MongoDB。

**使用方法：**
```bash
node scripts/restore-data.js <backup-file>
```

**示例：**
```bash
node scripts/restore-data.js backups/backup-2026-01-26T10-30-00.json
```

## 完整迁移流程

### 步骤1：备份数据
```bash
node scripts/backup-data.js
```

### 步骤2：启动MongoDB
```bash
# 使用Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# 或使用本地MongoDB
mongod --dbpath /path/to/data
```

### 步骤3：配置环境变量
创建 `.env` 文件：
```bash
MONGODB_URI=mongodb://localhost:27017/thinkcraft
DB_TYPE=mongodb
```

### 步骤4：执行迁移
```bash
node scripts/migrate-to-mongodb.js
```

### 步骤5：验证数据
```bash
node scripts/verify-migration.js
```

### 步骤6：切换到MongoDB存储
修改 `.env` 文件：
```bash
DB_TYPE=mongodb
```

重启应用后，系统将使用MongoDB作为数据存储。

## 回滚方案

如果迁移出现问题，可以使用备份文件恢复：

```bash
# 1. 清空MongoDB
mongo thinkcraft --eval "db.dropDatabase()"

# 2. 从备份恢复
node scripts/restore-data.js backups/backup-YYYY-MM-DDTHH-MM-SS.json

# 3. 验证数据
node scripts/verify-migration.js
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| MONGODB_URI | MongoDB连接字符串 | mongodb://localhost:27017/thinkcraft |
| DB_TYPE | 存储类型 | memory |
| REDIS_HOST | Redis主机 | localhost |
| REDIS_PORT | Redis端口 | 6379 |

## 注意事项

1. **迁移前务必备份**：使用 `backup-data.js` 创建备份
2. **测试环境先行**：在测试环境验证迁移流程后再在生产环境执行
3. **数据一致性**：迁移后使用 `verify-migration.js` 验证数据完整性
4. **停机迁移**：建议在维护窗口期间停止应用服务后再执行迁移
5. **保留备份**：迁移成功后保留备份文件至少7天

## 故障排查

### MongoDB连接失败
```
错误: MongoServerError: connect ECONNREFUSED
解决: 检查MongoDB是否启动，端口是否正确
```

### 数据验证失败
```
错误: 用户数量不一致
解决: 重新执行迁移，使用 --clear 参数清空后再迁移
```

### 权限错误
```
错误: EACCES: permission denied
解决: 确保有写入 backups/ 目录的权限
```

## 扩展

当前脚本仅支持用户数据迁移。如需迁移其他实体（项目、聊天、商业计划书等），需要：

1. 在各脚本中添加对应的迁移函数
2. 创建对应实体的MongoDB模型和仓库
3. 更新备份数据结构

示例：
```javascript
// 在 migrate-to-mongodb.js 中添加
async function migrateProjects() {
  // 实现项目迁移逻辑
}

// 在 main() 函数中调用
const projectStats = await migrateProjects();
```
