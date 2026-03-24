#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="${ROOT_DIR}/logs"
RUN_DIR="${ROOT_DIR}/run"
mkdir -p "$LOG_DIR" "$RUN_DIR"

BACKEND_URL="http://127.0.0.1:3000"
FRONTEND_URL="http://127.0.0.1:5173"
START_MODE="${START_MODE:-background}"

while [[ $# -gt 0 ]]; do
  case "$1" in
  --pm2|--daemon)
    START_MODE="pm2"
    shift
    ;;
  --background)
    START_MODE="background"
    shift
    ;;
  -h|--help)
    echo "用法: ./start-all.sh [--background|--pm2]"
    echo "  --background  默认模式，启动后返回终端"
    echo "  --pm2         使用 PM2 托管前后端（需本机已安装 pm2）"
    exit 0
    ;;
  *)
    echo "[ERROR] 不支持的参数: $1"
    echo "使用 ./start-all.sh --help 查看可用参数"
    exit 1
    ;;
  esac
done

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
  require_cmd "curl"
  require_cmd "lsof"
  require_cmd "node" "请安装 Node.js 20.19+ 或 22.12+"
  require_cmd "npm" "请安装 npm（通常随 Node.js 提供）"
}

ensure_supported_node_version() {
  local version
  version="$(node -p "process.versions.node" 2>/dev/null || true)"
  if [[ -z "$version" ]]; then
    echo "[ERROR] 无法检测 Node.js 版本"
    exit 1
  fi

  if ! node -e "
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const ok = (major === 20 && (minor > 19 || (minor === 19 && patch >= 0))) || major >= 22;
process.exit(ok ? 0 : 1);
" >/dev/null 2>&1; then
    echo "[ERROR] 当前 Node.js 版本不受支持: ${version}"
    echo "[ERROR] 请使用 Node.js 20.19+ 或 22.12+ 后重试"
    exit 1
  fi
}

ensure_node_dependencies() {
  local app_dir="$1"
  local app_name="$2"
  if [[ ! -f "${app_dir}/package.json" ]]; then
    return 0
  fi
  if [[ -d "${app_dir}/node_modules" ]]; then
    echo "[OK] ${app_name} 依赖已存在"
    return 0
  fi

  echo "[INFO] ${app_name} 缺少 node_modules，开始安装依赖"
  if [[ -f "${app_dir}/package-lock.json" ]]; then
    (cd "$app_dir" && npm ci) || {
      echo "[ERROR] ${app_name} 依赖安装失败（npm ci）"
      exit 1
    }
  else
    (cd "$app_dir" && npm install) || {
      echo "[ERROR] ${app_name} 依赖安装失败（npm install）"
      exit 1
    }
  fi
  echo "[OK] ${app_name} 依赖安装完成"
}

read_env_value() {
  local key="$1"
  local env_file="$2"
  local default_value="${3:-}"

  if [[ ! -f "$env_file" ]]; then
    echo "$default_value"
    return 0
  fi

  local line
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    echo "$default_value"
    return 0
  fi

  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  echo "$value"
}

wait_for_http() {
  local url="$1"
  local seconds="$2"
  local label="$3"
  for ((i = 0; i < seconds; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[OK] ${label}: ${url}"
      return 0
    fi
    sleep 1
  done
  echo "[WARN] ${label} 未在 ${seconds}s 内就绪: ${url}"
  return 1
}

wait_for_port() {
  local port="$1"
  local seconds="$2"
  local label="$3"
  for ((i = 0; i < seconds; i++)); do
    if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "[OK] ${label}: 127.0.0.1:${port}"
      return 0
    fi
    sleep 1
  done
  echo "[WARN] ${label} 端口未在 ${seconds}s 内就绪: ${port}"
  return 1
}

pidfile_path() {
  local name="$1"
  echo "${RUN_DIR}/${name}.pid"
}

read_pidfile() {
  local name="$1"
  local file
  file="$(pidfile_path "$name")"
  if [[ -f "$file" ]]; then
    cat "$file" 2>/dev/null || true
  fi
}

is_pid_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && ps -p "$pid" >/dev/null 2>&1
}

show_log_tail() {
  local name="$1"
  local logfile="${LOG_DIR}/${name}.log"
  if [[ -f "$logfile" ]]; then
    echo "[INFO] ${name} 最近日志（${logfile}）:"
    tail -n 40 "$logfile" || true
  else
    echo "[INFO] 未找到 ${name} 日志文件: ${logfile}"
  fi
}

fail_service_start() {
  local name="$1"
  local reason="$2"
  local pid
  pid="$(read_pidfile "$name")"
  echo "[ERROR] ${name} 启动失败: ${reason}"
  if [[ -n "$pid" ]]; then
    echo "[ERROR] ${name} PID: ${pid}"
  fi
  show_log_tail "$name"
  exit 1
}

assert_pid_running() {
  local name="$1"
  local pid
  pid="$(read_pidfile "$name")"
  if ! is_pid_alive "$pid"; then
    fail_service_start "$name" "进程已退出"
  fi
}

assert_http_service() {
  local name="$1"
  local url="$2"
  local seconds="$3"
  local label="${4:-$name}"
  assert_pid_running "$name"
  if ! wait_for_http "$url" "$seconds" "$label"; then
    assert_pid_running "$name"
    fail_service_start "$name" "HTTP 探活失败: ${url}"
  fi
  assert_pid_running "$name"
}

assert_port_service() {
  local name="$1"
  local port="$2"
  local seconds="$3"
  local label="${4:-$name}"
  assert_pid_running "$name"
  if ! wait_for_port "$port" "$seconds" "$label"; then
    assert_pid_running "$name"
    fail_service_start "$name" "端口未监听: ${port}"
  fi
  assert_pid_running "$name"
}

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "[INFO] 清理端口 ${port}: ${pids}"
    kill -9 $pids 2>/dev/null || true
  fi
}

kill_by_pattern() {
  local pattern="$1"
  if [[ -z "$pattern" ]]; then
    return 0
  fi
  pkill -f "$pattern" 2>/dev/null || true
}

kill_pidfile() {
  local name="$1"
  local file
  file="$(pidfile_path "$name")"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && ps -p "$pid" >/dev/null 2>&1; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      if ps -p "$pid" >/dev/null 2>&1; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$file"
  fi
}

start_bg() {
  local name="$1"
  local command="$2"
  local logfile="${LOG_DIR}/${name}.log"

  if command -v setsid >/dev/null 2>&1; then
    nohup setsid /bin/bash -lc "$command" >"$logfile" 2>&1 < /dev/null &
  else
    nohup /bin/bash -lc "$command" >"$logfile" 2>&1 < /dev/null &
  fi
  local pid=$!
  disown "$pid" 2>/dev/null || true
  echo "$pid" >"${RUN_DIR}/${name}.pid"
  echo "[INFO] ${name} 已启动，PID=${pid}，日志=${logfile}"
}

ensure_env_file() {
  local env_file="${ROOT_DIR}/backend/.env"
  local example_file="${ROOT_DIR}/backend/.env.example"
  if [[ ! -f "$env_file" && -f "$example_file" ]]; then
    cp "$example_file" "$env_file"
    echo "[INFO] 已创建 backend/.env（来自 .env.example）"
  fi
}

ensure_datastore_services() {
  local env_file="${ROOT_DIR}/backend/.env"
  local db_type
  db_type="$(read_env_value "DB_TYPE" "$env_file" "memory")"
  db_type="$(printf '%s' "$db_type" | tr '[:upper:]' '[:lower:]')"

  if [[ "$db_type" != "mongodb" ]]; then
    echo "[INFO] DB_TYPE=${db_type:-memory}，跳过 MongoDB/Redis 自动拉起"
    return 0
  fi

  if ! lsof -tiTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[WARN] DB_TYPE=mongodb，但未检测到 MongoDB 监听 27017"
    echo "[WARN] 开发环境建议先改回 DB_TYPE=memory；如需持久化，请先手动启动 MongoDB"
    return 0
  fi

  echo "[OK] 已检测到 MongoDB 运行在 127.0.0.1:27017"

  if lsof -tiTCP:6379 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[OK] 已检测到 Redis 运行在 127.0.0.1:6379"
  else
    echo "[INFO] Redis 未监听 6379；当前将继续以无缓存模式启动"
  fi
}

sync_css_assets() {
  local logfile="${LOG_DIR}/css-sync.log"
  echo "[INFO] 同步前端 CSS 资源"
  if ! (cd "${ROOT_DIR}" && node scripts/sync-css.js --once >"$logfile" 2>&1); then
    echo "[ERROR] CSS 资源同步失败"
    show_log_tail "css-sync"
    exit 1
  fi
  echo "[OK] CSS 资源同步完成"
}

pm2_delete_if_exists() {
  local name="$1"
  if ! command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  pm2 describe "$name" >/dev/null 2>&1 || return 0
  pm2 delete "$name" >/dev/null 2>&1 || true
}

start_with_pm2() {
  require_cmd "pm2" "如不想安装 PM2，请直接执行 ./start-all.sh"

  echo "[INFO] 使用 PM2 托管前后端服务"
  pm2_delete_if_exists "thinkcraft-backend"
  pm2_delete_if_exists "thinkcraft-frontend"

  pm2 start npm --name thinkcraft-backend --cwd "${ROOT_DIR}/backend" -- run start >/dev/null
  if ! wait_for_http "${BACKEND_URL}/health" 45 "后端"; then
    echo "[ERROR] PM2 后端启动失败"
    pm2 logs thinkcraft-backend --lines 40 --nostream || true
    exit 1
  fi
  if ! wait_for_http "${BACKEND_URL}/ready" 30 "后端就绪"; then
    echo "[ERROR] PM2 后端就绪检查失败"
    pm2 logs thinkcraft-backend --lines 40 --nostream || true
    exit 1
  fi

  pm2 start npm --name thinkcraft-frontend --cwd "${ROOT_DIR}" -- run dev:frontend -- --host 127.0.0.1 --port 5173 >/dev/null
  if ! wait_for_port 5173 30 "前端"; then
    echo "[ERROR] PM2 前端启动失败"
    pm2 logs thinkcraft-frontend --lines 40 --nostream || true
    exit 1
  fi
}

echo "[INFO] 启动 ThinkCraft 全栈服务"

ensure_runtime_tools
ensure_supported_node_version
ensure_node_dependencies "$ROOT_DIR" "前端/根项目"
ensure_node_dependencies "${ROOT_DIR}/backend" "后端"

# 统一清理旧进程（不改端口号，仅清理冲突占用）
kill_pidfile "frontend"
kill_pidfile "backend"
kill_by_pattern "npm run dev:frontend"
kill_by_pattern "node .*node_modules/.bin/vite"
kill_by_pattern "NODE_ENV=development node server.js"

kill_port 5173
kill_port 3000

if [[ -x "${ROOT_DIR}/scripts/rotate-logs.sh" ]]; then
  LOG_DIR="$LOG_DIR" "${ROOT_DIR}/scripts/rotate-logs.sh" 5242880 3 || true
fi

ensure_env_file
ensure_datastore_services

sync_css_assets
if [[ "$START_MODE" == "pm2" ]]; then
  start_with_pm2
else
  start_bg "backend" "cd '${ROOT_DIR}/backend' && exec npm run start"
  assert_http_service "backend" "${BACKEND_URL}/health" 45 "后端"
  assert_http_service "backend" "${BACKEND_URL}/ready" 30 "后端就绪"

  start_bg "frontend" "cd '${ROOT_DIR}' && exec npm run dev:frontend"
  assert_port_service "frontend" 5173 30 "前端"
fi

# AgentScope 当前为后端内置能力，仅做接口可达性检查
agent_status="$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/agents/types" || true)"
if [[ "$agent_status" == "200" || "$agent_status" == "401" || "$agent_status" == "403" ]]; then
  echo "[OK] AgentScope 接口可达（HTTP ${agent_status}）"
else
  echo "[WARN] AgentScope 接口暂不可达（HTTP ${agent_status}）"
fi

echo "[INFO] 启动完成"
echo "[INFO] 前端: ${FRONTEND_URL}"
echo "[INFO] 后端: ${BACKEND_URL}"
if [[ "$START_MODE" == "pm2" ]]; then
  echo "[INFO] 运行模式: PM2 托管"
else
  echo "[INFO] 运行模式: 本地后台进程"
fi
echo "[INFO] 后端日志: ${LOG_DIR}/backend.log"
echo "[INFO] 前端日志: ${LOG_DIR}/frontend.log"
