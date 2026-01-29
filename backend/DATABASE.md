# 数据库集成指南

本文档说明如何在ThinkCraft项目中配置和使用数据库。

## 支持的存储类型

ThinkCraft支持两种存储类型：

1. **内存存储（Memory）**：默认选项，数据存储在内存中，重启后丢失
2. **MongoDB存储**：持久化存储，适用于生产环境

## 快速开始

### 1. 使用内存存储（默认）

无需额外配置，直接启动服务器即可：

```bash
npm start
```

### 2. 使用MongoDB存储

#### 步骤1：启动MongoDB

**使用Docker（推荐）：**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7
```

**或使用本地MongoDB：**
```bash
mongod --dbpath /path/to/data
```

#### 步骤2：配置环境变量

复制 `.env.example` 到 `.env`：
```bash
cp .env.example .env
```

编辑 `.env` 文件，设置数据库类型：
```bash
DB_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/thinkcraft
```

#### 步骤3：启动服务器

```bash
npm start
```

服务器启动时会自动连接MongoDB。

## 数据迁移

如果你已经在使用内存存储并有数据，可以使用迁移工具将数据迁移到MongoDB。

### 迁移流程

#### 1. 备份现有数据

```bash
node scripts/backup-data.js
```

这会在 `backups/` 目录下创建一个带时间戳的JSON备份文件。

#### 2. 启动MongoDB

确保MongoDB已启动并可连接。

#### 3. 执行迁移

```bash
# 迁移数据（保留MongoDB现有数据）
node scripts/migrate-to-mongodb.js

# 或清空MongoDB后再迁移
node scripts/migrate-to-mongodb.js --clear
```

#### 4. 验证数据

```bash
node scripts/verify-migration.js
```

验证脚本会检查：
- 用户数量是否一致
- 每个用户的关键字段是否匹配
- 生成详细的验证报告

#### 5. 切换到MongoDB

编辑 `.env` 文件：
```bash
DB_TYPE=mongodb
```

重启服务器。

### 从备份恢复

如果迁移出现问题，可以从备份文件恢复：

```bash
node scripts/restore-data.js backups/backup-2026-01-26T10-30-00.json
```

## Redis缓存（可选）

ThinkCraft支持使用Redis作为缓存层，提升性能。

### 启动Redis

**使用Docker（推荐）：**
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 配置Redis

编辑 `.env` 文件：
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 缓存策略

| 实体类型 | 缓存前缀 | TTL |
|---------|---------|-----|
| 用户 | user: | 1小时 |
| 会话 | session: | 1小时 |
| 项目 | project: | 5分钟 |
| 聊天 | chat: | 10分钟 |
| 商业计划书 | business_plan: | 1小时 |
| 速率限制 | rate_limit: | 1分钟 |
| 短信验证码 | sms:code: | 10分钟 |
| 短信发送频率 | sms:rate: | 60秒 |
| 短信失败计数 | sms:fail: | 10分钟 |
| 短信每日上限 | sms:daily: | 24小时 |

## 环境变量说明

### 数据库配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| DB_TYPE | 存储类型（memory/mongodb） | memory | 否 |
| MONGODB_URI | MongoDB连接字符串 | mongodb://localhost:27017/thinkcraft | 当DB_TYPE=mongodb时必需 |

### Redis配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| REDIS_HOST | Redis主机地址 | localhost | 否 |
| REDIS_PORT | Redis端口 | 6379 | 否 |
| REDIS_PASSWORD | Redis密码 | - | 否 |
| REDIS_DB | Redis数据库编号 | 0 | 否 |

### 短信配置（投产前必须确认）

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| SMS_PROVIDER | 短信服务商（aliyun/tencent） | - | 是 |
| ALIYUN_ACCESS_KEY_ID | 阿里云短信AccessKey ID | - | 当SMS_PROVIDER=aliyun时必需 |
| ALIYUN_ACCESS_KEY_SECRET | 阿里云短信AccessKey Secret | - | 当SMS_PROVIDER=aliyun时必需 |
| ALIYUN_SMS_SIGN_NAME | 阿里云短信签名 | - | 当SMS_PROVIDER=aliyun时必需 |
| TENCENT_SECRET_ID | 腾讯云SecretId | - | 当SMS_PROVIDER=tencent时必需 |
| TENCENT_SECRET_KEY | 腾讯云SecretKey | - | 当SMS_PROVIDER=tencent时必需 |
| TENCENT_SMS_APP_ID | 腾讯云短信AppId | - | 当SMS_PROVIDER=tencent时必需 |
| TENCENT_SMS_SIGN | 腾讯云短信签名 | - | 当SMS_PROVIDER=tencent时必需 |

## 数据模型

### 用户集合（users）

```javascript
{
  _id: ObjectId,
  userId: String,           // 业务ID（唯一）
  phone: String,            // 手机号（唯一）
  phoneVerified: Boolean,   // 手机号是否已验证
  status: String,           // 状态：active/inactive/suspended
  lastLoginAt: Date,        // 最后登录时间
  loginAttempts: Number,    // 登录失败次数
  lockedUntil: Date,        // 账户锁定截止时间
  loginHistory: [{
    timestamp: Date,
    ip: String,
    userAgent: String,
    success: Boolean
  }],
  preferences: {
    language: String,
    theme: String,
    notifications: {
      sms: Boolean,
      push: Boolean
    }
  },
  deletedAt: Date,          // 软删除标记
  createdAt: Date,
  updatedAt: Date
}
```

### 索引策略

- `userId`: 唯一索引
- `phone`: 唯一索引
- `status`: 普通索引
- `{status, deletedAt}`: 复合索引
- `createdAt`: 降序索引

## 故障排查

### MongoDB连接失败

**错误信息：**
```
MongoServerError: connect ECONNREFUSED
```

**解决方案：**
1. 检查MongoDB是否已启动
2. 检查端口是否正确（默认27017）
3. 检查防火墙设置
4. 验证MONGODB_URI配置

### Redis连接失败

**错误信息：**
```
Error: Redis connection failed
```

**解决方案：**
1. 检查Redis是否已启动
2. 检查端口是否正确（默认6379）
3. 如果设置了密码，确保REDIS_PASSWORD正确
4. Redis连接失败不会影响应用启动，只是缓存功能不可用

### 数据迁移失败

**错误信息：**
```
用户数量不一致
```

**解决方案：**
1. 使用 `--clear` 参数清空MongoDB后重新迁移
2. 检查MongoDB连接是否稳定
3. 查看迁移日志中的具体错误信息

## 性能优化建议

### MongoDB优化

1. **连接池配置**：
   ```javascript
   maxPoolSize: 10,
   minPoolSize: 2
   ```

2. **索引优化**：
   - 为常用查询字段创建索引
   - 使用复合索引优化多字段查询
   - 定期分析慢查询日志

3. **查询优化**：
   - 使用投影减少返回字段
   - 避免全表扫描
   - 使用聚合管道优化复杂查询

### Redis优化

1. **缓存策略**：
   - 为不同类型的数据设置合适的TTL
   - 使用缓存预热提升首次访问速度
   - 实现缓存失效策略

2. **内存管理**：
   - 设置maxmemory限制
   - 配置合适的淘汰策略（如allkeys-lru）

## 生产环境建议

1. **数据库配置**：
   - 使用MongoDB副本集提高可用性
   - 配置定期备份策略
   - 启用MongoDB认证

2. **Redis配置**：
   - 使用Redis Sentinel或Cluster提高可用性
   - 启用持久化（AOF或RDB）
   - 配置密码认证

3. **监控**：
   - 监控数据库连接数
   - 监控查询性能
   - 监控缓存命中率
   - 设置告警规则

4. **安全**：
   - 使用强密码
   - 限制数据库访问IP
   - 定期更新数据库版本
   - 加密敏感数据

## 相关文档

- [数据迁移工具使用指南](./scripts/README.md)
- [MongoDB官方文档](https://docs.mongodb.com/)
- [Redis官方文档](https://redis.io/documentation)
- [Mongoose文档](https://mongoosejs.com/docs/)
