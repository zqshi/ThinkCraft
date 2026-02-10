#!/bin/bash

# ThinkCraft 开发环境启动脚本
# 自动启动前端、后端和CSS同步

echo "🚀 启动 ThinkCraft 开发环境..."
echo ""

# 准备日志/运行目录
ROOT_DIR="$(pwd)"
LOG_DIR="${ROOT_DIR}/logs"
RUN_DIR="${ROOT_DIR}/run"
mkdir -p "$LOG_DIR" "$RUN_DIR"

# 日志轮转（避免日志无限增长）
if [ -x "${ROOT_DIR}/scripts/rotate-logs.sh" ]; then
  LOG_DIR="$LOG_DIR" "${ROOT_DIR}/scripts/rotate-logs.sh" 5242880 3
fi

# 停止旧进程
echo "🧹 清理旧进程..."
lsof -ti:3000,5173 | xargs kill -9 2>/dev/null
pkill -f "sync-css.js" 2>/dev/null
sleep 1

# 启动CSS同步（后台，防止脚本退出导致进程被挂起）
echo "📦 启动CSS自动同步..."
nohup node scripts/sync-css.js > "$LOG_DIR/css-sync.log" 2>&1 &
CSS_PID=$!
echo $CSS_PID > "$RUN_DIR/css-sync.pid"
echo "   PID: $CSS_PID"

# 启动后端（后台，防止脚本退出导致进程被挂起）
echo "🔧 启动后端服务..."
(cd "${ROOT_DIR}/backend" && nohup npm run dev > "${LOG_DIR}/backend.log" 2>&1) &
BACKEND_PID=$!
echo $BACKEND_PID > "${RUN_DIR}/backend.pid"
echo "   PID: $BACKEND_PID"

# 启动前端（后台，防止脚本退出导致进程被挂起）
echo "🎨 启动前端服务..."
(cd "${ROOT_DIR}" && nohup npm run dev > "${LOG_DIR}/frontend.log" 2>&1) &
FRONTEND_PID=$!
echo $FRONTEND_PID > "${RUN_DIR}/frontend.pid"
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
echo "   ❌ 后端启动失败，查看 ${LOG_DIR}/backend.log"
fi

if lsof -ti:5173 > /dev/null 2>&1; then
  echo "   ✅ 前端: http://localhost:5173"
else
echo "   ❌ 前端启动失败，查看 ${LOG_DIR}/frontend.log"
fi

if ps -p $CSS_PID > /dev/null 2>&1; then
  echo "   ✅ CSS同步: 运行中"
else
echo "   ❌ CSS同步失败，查看 ${LOG_DIR}/css-sync.log"
fi

echo ""
echo "🎉 开发环境已启动！"
echo ""
echo "📝 日志文件："
echo "   - 前端: ${LOG_DIR}/frontend.log"
echo "   - 后端: ${LOG_DIR}/backend.log"
echo "   - CSS同步: ${LOG_DIR}/css-sync.log"
echo ""
echo "🛑 停止服务："
echo "   kill \$(cat ${RUN_DIR}/frontend.pid ${RUN_DIR}/backend.pid ${RUN_DIR}/css-sync.pid)"
echo ""

# 打开浏览器（可通过 AUTO_OPEN=0 禁用）
AUTO_OPEN=${AUTO_OPEN:-1}
if [ "$AUTO_OPEN" = "1" ]; then
  sleep 1
  if ! open http://localhost:5173 >/dev/null 2>&1; then
    echo "⚠️  无法自动打开浏览器，请手动访问: http://localhost:5173"
  fi
fi
