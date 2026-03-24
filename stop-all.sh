#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="${ROOT_DIR}/run"
DATASTORE_MANAGER_FILE="${RUN_DIR}/datastore.manager"

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

compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
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

kill_pidfile "frontend"
kill_pidfile "backend"
kill_pidfile "css-sync"
kill_pidfile "deep-research"

# 兜底清理：处理非 pidfile 管理的残留进程
kill_by_pattern "npm run dev:frontend"
kill_by_pattern "node .*node_modules/.bin/vite"
kill_by_pattern "npm run dev:css"
kill_by_pattern "node scripts/sync-css.js"
kill_by_pattern "NODE_ENV=development node server.js"
kill_by_pattern "backend/services/deep-research/start.sh"
kill_by_pattern "backend/services/deep-research/app.py"

kill_port 5173
kill_port 3000
kill_port 5001

if [[ -f "$DATASTORE_MANAGER_FILE" ]]; then
  manager="$(cat "$DATASTORE_MANAGER_FILE" 2>/dev/null || true)"
  if [[ "$manager" == "docker-compose" ]]; then
    compose="$(compose_cmd)"
    if [[ -n "$compose" ]]; then
      (cd "$ROOT_DIR" && $compose stop mongodb redis) >/dev/null 2>&1 || true
      echo "[OK] 已停止 MongoDB/Redis（docker compose）"
    fi
  elif [[ "$manager" == "brew" ]] && command -v brew >/dev/null 2>&1; then
    brew services stop mongodb-community@7 >/dev/null 2>&1 || \
      brew services stop mongodb-community >/dev/null 2>&1 || true
    brew services stop redis >/dev/null 2>&1 || true
    echo "[OK] 已停止 MongoDB/Redis（brew services）"
  fi
  rm -f "$DATASTORE_MANAGER_FILE"
fi

echo "[INFO] 已完成停止"
