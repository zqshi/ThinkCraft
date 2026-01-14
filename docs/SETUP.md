# ThinkCraft 项目设置指南

## 环境要求
- Node.js 18+
- PostgreSQL 15+（未来版本需要）
- Redis 7+（未来版本需要）

## 当前快速启动（开发环境）

### 1. 克隆仓库
```bash
git clone <repository-url>
cd ThinkCraft
```

### 2. 安装依赖
```bash
cd backend
npm install
```

### 3. 配置环境变量
```bash
cp backend/.env.example backend/.env
# 编辑.env文件，配置DeepSeek API Key
```

### 4. 启动后端服务
```bash
cd backend
npm start
```

后端服务将在 http://localhost:3000 启动

### 5. 访问前端
直接用浏览器打开 `index.html` 或使用静态服务器：
```bash
python3 -m http.server 8080
```

然后访问 http://localhost:8080

## 未来版本（完整重构后）

完整的DDD重构后，设置步骤将包括：

1. 安装PostgreSQL和Redis
2. 执行数据库迁移：`npm run migrate`
3. 启动所有服务：`docker-compose up`

详见 [ARCHITECTURE.md](ARCHITECTURE.md) 了解完整架构设计
