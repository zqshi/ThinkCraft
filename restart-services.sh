#!/bin/bash

# ThinkCraft 服务重启脚本
# 用于快速重启前后端服务

set -e

PROJECT_DIR="/Users/zqs/Downloads/project/ThinkCraft"
FRONTEND_LOG="/tmp/thinkcraft-frontend.log"
BACKEND_LOG="/tmp/thinkcraft-backend.log"

echo "========================================="
echo "  ThinkCraft 服务重启脚本"
echo "========================================="
echo ""

# 停止现有服务
echo "🛑 正在停止现有服务..."

# 停止前端服务 (8000端口)
FRONTEND_PID=$(lsof -ti:8000 2>/dev/null || echo "")
if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
    echo "  ✅ 前端服务已停止 (PID: $FRONTEND_PID)"
else
    echo "  ℹ️  前端服务未运行"
fi

# 停止后端服务 (3000端口)
BACKEND_PID=$(lsof -ti:3000 2>/dev/null || echo "")
if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null || true
    echo "  ✅ 后端服务已停止 (PID: $BACKEND_PID)"
else
    echo "  ℹ️  后端服务未运行"
fi

sleep 1
echo ""

# 启动前端服务
echo "🚀 正在启动前端服务..."
cd "$PROJECT_DIR"
nohup python3 -m http.server 8000 > "$FRONTEND_LOG" 2>&1 &
FRONTEND_NEW_PID=$!
echo "  ✅ 前端服务已启动 (PID: $FRONTEND_NEW_PID)"
echo "  📝 日志: $FRONTEND_LOG"
echo ""

# 启动后端服务
echo "🚀 正在启动后端服务..."
cd "$PROJECT_DIR/backend"
nohup npm start > "$BACKEND_LOG" 2>&1 &
BACKEND_NEW_PID=$!
echo "  ✅ 后端服务已启动 (PID: $BACKEND_NEW_PID)"
echo "  📝 日志: $BACKEND_LOG"
echo ""

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 验证服务状态
echo ""
echo "========================================="
echo "  服务状态检查"
echo "========================================="
echo ""

# 检查前端
if lsof -i:8000 | grep -q LISTEN; then
    echo "✅ 前端服务运行正常"
    echo "   访问地址: http://localhost:8000"
else
    echo "❌ 前端服务启动失败"
    echo "   查看日志: tail -f $FRONTEND_LOG"
fi

echo ""

# 检查后端
if lsof -i:3000 | grep -q LISTEN; then
    echo "✅ 后端服务运行正常"
    echo "   访问地址: http://localhost:3000"
    echo "   健康检查: curl http://localhost:3000/api/health"
else
    echo "❌ 后端服务启动失败"
    echo "   查看日志: tail -f $BACKEND_LOG"
fi

echo ""
echo "========================================="
echo "  重启完成！"
echo "========================================="
echo ""
echo "💡 提示："
echo "  - 查看前端日志: tail -f $FRONTEND_LOG"
echo "  - 查看后端日志: tail -f $BACKEND_LOG"
echo "  - 停止所有服务: kill \$(lsof -ti:8000,3000)"
echo ""
