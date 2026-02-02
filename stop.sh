#!/bin/bash

# 停止所有ThinkCraft开发服务

echo "🛑 停止 ThinkCraft 开发环境..."
echo ""

# 停止前端
if [ -f frontend.pid ]; then
  FRONTEND_PID=$(cat frontend.pid)
  if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ 已停止前端服务 (PID: $FRONTEND_PID)"
  fi
  rm frontend.pid
fi

# 停止后端
if [ -f backend.pid ]; then
  BACKEND_PID=$(cat backend.pid)
  if ps -p $BACKEND_PID > /dev/null 2>&1; then
    kill $BACKEND_PID 2>/dev/null
    echo "✅ 已停止后端服务 (PID: $BACKEND_PID)"
  fi
  rm backend.pid
fi

# 停止CSS同步
if [ -f css-sync.pid ]; then
  CSS_PID=$(cat css-sync.pid)
  if ps -p $CSS_PID > /dev/null 2>&1; then
    kill $CSS_PID 2>/dev/null
    echo "✅ 已停止CSS同步 (PID: $CSS_PID)"
  fi
  rm css-sync.pid
fi

# 强制清理端口
lsof -ti:3000,8000 | xargs kill -9 2>/dev/null
pkill -f "sync-css.js" 2>/dev/null

echo ""
echo "✅ 所有服务已停止"
