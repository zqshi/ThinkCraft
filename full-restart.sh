#!/bin/bash

# ThinkCraft 完全重启脚本
# 清理所有数据并重启前后端服务

set -e

echo "=========================================="
echo "🧹 ThinkCraft 完全重启脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 步骤 1: 停止所有服务
echo -e "${BLUE}[1/6] 停止所有服务...${NC}"
lsof -ti:3000,5000,8000 | xargs kill -9 2>/dev/null || echo "  没有运行中的服务"
echo -e "${GREEN}✓ 服务已停止${NC}"
echo ""

# 步骤 2: 清理后端缓存
echo -e "${BLUE}[2/6] 清理后端缓存...${NC}"
find backend -name "*.pyc" -delete 2>/dev/null || true
find backend -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find backend -name "node_modules/.cache" -type d -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}✓ 后端缓存已清理${NC}"
echo ""

# 步骤 3: 清理 MongoDB 数据（可选）
echo -e "${BLUE}[3/6] 清理数据库...${NC}"
read -p "是否清理 MongoDB 数据？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v mongosh &> /dev/null; then
        mongosh thinkcraft --eval "db.dropDatabase()" 2>/dev/null || echo "  MongoDB 未运行或连接失败"
        echo -e "${GREEN}✓ MongoDB 数据已清理${NC}"
    else
        echo -e "${YELLOW}⚠ mongosh 未安装，跳过数据库清理${NC}"
    fi
else
    echo -e "${YELLOW}⊘ 跳过数据库清理${NC}"
fi
echo ""

# 步骤 4: 清理 Redis 缓存（可选）
echo -e "${BLUE}[4/6] 清理 Redis 缓存...${NC}"
if command -v redis-cli &> /dev/null; then
    redis-cli FLUSHALL 2>/dev/null || echo "  Redis 未运行"
    echo -e "${GREEN}✓ Redis 缓存已清理${NC}"
else
    echo -e "${YELLOW}⚠ redis-cli 未安装，跳过 Redis 清理${NC}"
fi
echo ""

# 步骤 5: 启动后端服务
echo -e "${BLUE}[5/6] 启动后端服务...${NC}"
cd backend

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ 未找到 .env 文件，从 .env.example 复制...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ 已创建 .env 文件，请配置 API 密钥${NC}"
    else
        echo -e "${RED}✗ 未找到 .env.example 文件${NC}"
        exit 1
    fi
fi

# 检查依赖
if [ ! -d node_modules ]; then
    echo "  安装后端依赖..."
    npm install
fi

# 启动后端（后台运行）
echo "  启动后端服务 (端口 3000)..."
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"

# 等待后端启动
echo "  等待后端启动..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务已启动${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ 后端启动超时${NC}"
        echo "  查看日志: tail -f backend.log"
        exit 1
    fi
    sleep 1
done

cd ..
echo ""

# 步骤 6: 启动前端服务
echo -e "${BLUE}[6/6] 启动前端服务...${NC}"
echo "  启动前端服务 (端口 8000)..."
python3 -m http.server 8000 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID"

# 等待前端启动
sleep 2
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 前端服务已启动${NC}"
else
    echo -e "${RED}✗ 前端启动失败${NC}"
    exit 1
fi
echo ""

# 完成
echo "=========================================="
echo -e "${GREEN}✅ 所有服务已启动！${NC}"
echo "=========================================="
echo ""
echo "📝 服务信息："
echo "  • 前端: http://localhost:8000"
echo "  • 后端: http://localhost:3000"
echo "  • 后端健康检查: http://localhost:3000/health"
echo ""
echo "🧹 浏览器数据清理："
echo "  1. 访问: http://localhost:8000/clear-all-browser-data.html"
echo "  2. 点击「清理所有数据」按钮"
echo "  3. 清理完成后返回首页"
echo ""
echo "📋 进程管理："
echo "  • 后端 PID: $BACKEND_PID"
echo "  • 前端 PID: $FRONTEND_PID"
echo "  • 停止服务: kill $BACKEND_PID $FRONTEND_PID"
echo "  • 查看后端日志: tail -f backend.log"
echo "  • 查看前端日志: tail -f frontend.log"
echo ""
echo "🎉 现在可以打开浏览器访问应用了！"
echo ""
