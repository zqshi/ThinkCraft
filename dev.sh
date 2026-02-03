#!/bin/bash

# ThinkCraft 开发环境启动脚本
# 自动启动前端、后端和CSS同步

echo "🚀 启动 ThinkCraft 开发环境..."
echo ""

# 停止旧进程
echo "🧹 清理旧进程..."
lsof -ti:3000,5173 | xargs kill -9 2>/dev/null
pkill -f "sync-css.js" 2>/dev/null
sleep 1

# 启动CSS同步（后台）
echo "📦 启动CSS自动同步..."
node scripts/sync-css.js > css-sync.log 2>&1 &
CSS_PID=$!
echo $CSS_PID > css-sync.pid
echo "   PID: $CSS_PID"

# 启动后端（后台）
echo "🔧 启动后端服务..."
cd backend && npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
cd ..
echo "   PID: $BACKEND_PID"

# 启动前端（后台）
echo "🎨 启动前端服务..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid
echo "   PID: $FRONTEND_PID"

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 3

# 检查服务状态
echo ""
echo "📊 服务状态："
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "   ✅ 后端: http://localhost:3000"
else
  echo "   ❌ 后端启动失败，查看 backend.log"
fi

if lsof -ti:5173 > /dev/null 2>&1; then
  echo "   ✅ 前端: http://localhost:5173"
else
  echo "   ❌ 前端启动失败，查看 frontend.log"
fi

if ps -p $CSS_PID > /dev/null 2>&1; then
  echo "   ✅ CSS同步: 运行中"
else
  echo "   ❌ CSS同步失败，查看 css-sync.log"
fi

echo ""
echo "🎉 开发环境已启动！"
echo ""
echo "📝 日志文件："
echo "   - 前端: frontend.log"
echo "   - 后端: backend.log"
echo "   - CSS同步: css-sync.log"
echo ""
echo "🛑 停止服务："
echo "   kill \$(cat frontend.pid backend.pid css-sync.pid)"
echo ""

# 打开浏览器
sleep 1
open http://localhost:5173
