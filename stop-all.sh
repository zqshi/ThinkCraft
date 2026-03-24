#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="${ROOT_DIR}/run"

require_cmd() {
  local name="$1"
  local hint="${2:-}"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "[ERROR] 缺少命令依赖: ${name}"
    if [[ -n "$hint" ]]; then
      echo "[ERROR] 安装建议: ${hint}"
    fi
    exit 1
  fi
}

ensure_runtime_tools() {
  require_cmd "bash"
  require_cmd "lsof"
}

pm2_stop_if_exists() {
  local name="$1"
  if ! command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  pm2 describe "$name" >/dev/null 2>&1 || return 0
  pm2 delete "$name" >/dev/null 2>&1 || true
  echo "[OK] 已停止 ${name}（PM2）"
}

kill_pidfile() {
  local name="$1"
  local file="${RUN_DIR}/${name}.pid"

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$file" 2>/dev/null || true)"

  if [[ -n "$pid" ]] && ps -p "$pid" >/dev/null 2>&1; then
    kill "$pid" 2>/dev/null || true
    sleep 1
    if ps -p "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    echo "[OK] 已停止 ${name} (PID=${pid})"
  fi

  rm -f "$file"
}

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill -9 $pids 2>/dev/null || true
    echo "[OK] 已清理端口 ${port}: ${pids}"
  fi
}

kill_by_pattern() {
  local pattern="$1"
  if [[ -z "$pattern" ]]; then
    return 0
  fi
  pkill -f "$pattern" 2>/dev/null || true
}

echo "[INFO] 停止 ThinkCraft 全栈服务"
ensure_runtime_tools

pm2_stop_if_exists "thinkcraft-frontend"
pm2_stop_if_exists "thinkcraft-backend"

kill_pidfile "frontend"
kill_pidfile "backend"

kill_by_pattern "npm run dev:frontend"
kill_by_pattern "node .*node_modules/.bin/vite"
kill_by_pattern "NODE_ENV=development node server.js"

kill_port 5173
kill_port 3000

echo "[INFO] 已完成停止"
