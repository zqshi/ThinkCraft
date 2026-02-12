#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PHONE="${1:-13800138000}"
VERIFY_TYPE="login"

echo "[INFO] BASE_URL=${BASE_URL}"
echo "[INFO] PHONE=${PHONE}"

for i in $(seq 1 30); do
  if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
  echo "[ERROR] 后端未就绪: ${BASE_URL}/health"
  exit 1
fi

send_resp="$(curl -sS "${BASE_URL}/api/verification/send" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${PHONE}\",\"type\":\"${VERIFY_TYPE}\"}")"

send_code="$(node -e "const d=JSON.parse(process.argv[1]); console.log(d?.data?.code||'')" "$send_resp")"
if [[ -z "${send_code}" ]]; then
  echo "[ERROR] 未拿到验证码，响应如下："
  echo "$send_resp"
  exit 1
fi

echo "[OK] 已获取验证码（开发环境）"

login_resp="$(curl -sS "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${PHONE}\",\"code\":\"${send_code}\"}")"

access_token="$(node -e "const d=JSON.parse(process.argv[1]); console.log(d?.data?.accessToken||'')" "$login_resp")"
if [[ -z "${access_token}" ]]; then
  echo "[ERROR] 登录失败或未返回 accessToken，响应如下："
  echo "$login_resp"
  exit 1
fi

echo "[OK] 登录成功，已拿到 accessToken"

agent_resp="$(curl -sS "${BASE_URL}/api/agents/types" \
  -H "Authorization: Bearer ${access_token}")"

echo "[OK] AgentScope 接口响应："
echo "$agent_resp"
