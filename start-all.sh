#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="${ROOT_DIR}/logs"
RUN_DIR="${ROOT_DIR}/run"
mkdir -p "$LOG_DIR" "$RUN_DIR"

BACKEND_URL="http://127.0.0.1:3000"
FRONTEND_URL="http://127.0.0.1:5173"
DEEP_RESEARCH_URL="http://127.0.0.1:5001"
DATASTORE_MANAGER_FILE="${RUN_DIR}/datastore.manager"

compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
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

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "[INFO] 清理端口 ${port}: ${pids}"
    kill -9 $pids 2>/dev/null || true
  fi
}

kill_pidfile() {
  local name="$1"
  local file="${RUN_DIR}/${name}.pid"
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

  nohup /bin/bash -lc "$command" >"$logfile" 2>&1 &
  local pid=$!
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
  local compose
  compose="$(compose_cmd)"
  local manager=""
  local mongo_ready redis_ready
  mongo_ready="false"
  redis_ready="false"

  if lsof -tiTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
    mongo_ready="true"
  fi
  if lsof -tiTCP:6379 -sTCP:LISTEN >/dev/null 2>&1; then
    redis_ready="true"
  fi

  if [[ "$mongo_ready" == "true" && "$redis_ready" == "true" ]]; then
    rm -f "$DATASTORE_MANAGER_FILE"
    echo "[OK] MongoDB/Redis 已在运行"
    return 0
  fi

  if [[ -n "$compose" ]]; then
    echo "[INFO] MongoDB/Redis 未完全就绪，尝试使用 Docker Compose 启动依赖"
    if (cd "$ROOT_DIR" && $compose up -d mongodb redis); then
      manager="docker-compose"
    fi
  fi

  if [[ -z "$manager" ]] && command -v brew >/dev/null 2>&1; then
    echo "[INFO] Docker Compose 不可用，尝试使用 brew services 启动依赖"
    if [[ "$mongo_ready" != "true" ]]; then
      brew services start mongodb-community@7 >/dev/null 2>&1 || \
        brew services start mongodb-community >/dev/null 2>&1 || true
    fi
    if [[ "$redis_ready" != "true" ]]; then
      brew services start redis >/dev/null 2>&1 || true
    fi
    manager="brew"
  fi

  if [[ -n "$manager" ]]; then
    echo "$manager" >"$DATASTORE_MANAGER_FILE"
  else
    rm -f "$DATASTORE_MANAGER_FILE"
    echo "[WARN] 未检测到可用依赖管理器（Docker Compose / brew），请手动启动 MongoDB/Redis"
  fi

  wait_for_port 27017 30 "MongoDB" || true
  wait_for_port 6379 20 "Redis" || true
}

start_deep_research_if_possible() {
  if lsof -tiTCP:5001 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[OK] DeepResearch 已在运行 (${DEEP_RESEARCH_URL})"
    return 0
  fi

  local dr_dir="${ROOT_DIR}/backend/services/deep-research"
  local dr_env="${dr_dir}/.env"

  if [[ ! -d "$dr_dir" ]]; then
    echo "[WARN] 未找到 DeepResearch 服务目录，跳过"
    return 0
  fi

  if [[ ! -f "$dr_env" ]]; then
    echo "[WARN] 缺少 ${dr_env}，跳过自动启动 DeepResearch"
    return 0
  fi

  if ! grep -Eq "^OPENROUTER_API_KEY=sk-" "$dr_env"; then
    echo "[WARN] DeepResearch API Key 未配置，跳过自动启动 DeepResearch"
    return 0
  fi

  start_bg "deep-research" "cd '${dr_dir}' && exec ./start.sh"
  wait_for_http "${DEEP_RESEARCH_URL}/health" 45 "DeepResearch" || true
}

echo "[INFO] 启动 ThinkCraft 全栈服务"

# 统一清理旧进程（不改端口号，仅清理冲突占用）
kill_pidfile "frontend"
kill_pidfile "backend"
kill_pidfile "css-sync"
kill_pidfile "deep-research"
kill_port 5173
kill_port 3000
kill_port 5001
pkill -f "sync-css.js" 2>/dev/null || true

if [[ -x "${ROOT_DIR}/scripts/rotate-logs.sh" ]]; then
  LOG_DIR="$LOG_DIR" "${ROOT_DIR}/scripts/rotate-logs.sh" 5242880 3 || true
fi

ensure_env_file
ensure_datastore_services

start_bg "css-sync" "cd '${ROOT_DIR}' && exec node scripts/sync-css.js"
start_bg "backend" "cd '${ROOT_DIR}/backend' && exec npm run start"
wait_for_http "${BACKEND_URL}/health" 45 "后端" || true
wait_for_http "${BACKEND_URL}/ready" 30 "后端就绪" || true

start_bg "frontend" "cd '${ROOT_DIR}' && exec npm run dev:frontend"
wait_for_port 5173 30 "前端" || true

# AgentScope 当前为后端内置能力，无独立进程，仅做接口可达性检查
agent_status="$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/agents/types" || true)"
if [[ "$agent_status" == "200" || "$agent_status" == "401" || "$agent_status" == "403" ]]; then
  echo "[OK] AgentScope 接口可达（HTTP ${agent_status}）"
else
  echo "[WARN] AgentScope 接口暂不可达（HTTP ${agent_status}）"
fi

start_deep_research_if_possible

echo "[INFO] 启动完成"
echo "[INFO] 前端: ${FRONTEND_URL}"
echo "[INFO] 后端: ${BACKEND_URL}"
echo "[INFO] MongoDB: 127.0.0.1:27017"
echo "[INFO] Redis: 127.0.0.1:6379"
echo "[INFO] DeepResearch: ${DEEP_RESEARCH_URL}（可选）"
echo "[INFO] 后端日志: ${LOG_DIR}/backend.log"
echo "[INFO] 前端日志: ${LOG_DIR}/frontend.log"
