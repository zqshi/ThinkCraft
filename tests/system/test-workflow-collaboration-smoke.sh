#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PHONE="${PHONE:-13800138000}"
VERIFY_TYPE="${VERIFY_TYPE:-login}"
WORKFLOW_CATEGORY="${WORKFLOW_CATEGORY:-product-development}"
RUN_HEAVY_EXECUTE="${RUN_HEAVY_EXECUTE:-0}"

TMP_DIR="$(mktemp -d -t tc-workflow-smoke.XXXXXX)"
PROJECT_ID=""
TOKEN=""

cleanup() {
  if [[ -n "$PROJECT_ID" && -n "$TOKEN" ]]; then
    curl -sS -X DELETE "${BASE_URL}/api/projects/${PROJECT_ID}" \
      -H "Authorization: Bearer ${TOKEN}" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log() {
  echo "[SMOKE] $*"
}

fail() {
  echo "[SMOKE][FAIL] $*" >&2
  exit 1
}

json_field() {
  local file="$1"
  local expr="$2"
  node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const v=(function(){return ${expr};})();if(v===undefined||v===null){process.exit(2)};if(typeof v==='object')console.log(JSON.stringify(v));else console.log(String(v));" "$file"
}

wait_backend() {
  for _ in $(seq 1 30); do
    if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  fail "后端未就绪: ${BASE_URL}/api/health"
}

api_get_auth() {
  local path="$1"
  local out="$2"
  curl -sS "${BASE_URL}${path}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' >"$out"
}

api_post_auth() {
  local path="$1"
  local body="$2"
  local out="$3"
  curl -sS -X POST "${BASE_URL}${path}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "$body" >"$out"
}

log "1) 检查后端健康"
wait_backend

log "2) 获取验证码并登录"
SEND_JSON="$TMP_DIR/send.json"
LOGIN_JSON="$TMP_DIR/login.json"

curl -sS -X POST "${BASE_URL}/api/verification/send" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${PHONE}\",\"type\":\"${VERIFY_TYPE}\"}" >"$SEND_JSON"

CODE="$(json_field "$SEND_JSON" "d?.data?.code")" || fail "未获取到验证码"

curl -sS -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${PHONE}\",\"code\":\"${CODE}\"}" >"$LOGIN_JSON"

TOKEN="$(json_field "$LOGIN_JSON" "d?.data?.accessToken")" || fail "登录失败: 无 accessToken"
[[ -n "$TOKEN" ]] || fail "登录失败: accessToken 为空"

log "3) workflow-config 校验"
WF_JSON="$TMP_DIR/workflow.json"
api_get_auth "/api/projects/workflow-config/${WORKFLOW_CATEGORY}" "$WF_JSON"

node - "$WF_JSON" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.code !== 0) throw new Error(`workflow-config code=${data.code}`);
const stages = data?.data?.stages;
if (!Array.isArray(stages) || stages.length === 0) throw new Error('workflow-config stages 为空');
const ids = stages.map(s => s.id);
if (new Set(ids).size !== ids.length) throw new Error('workflow-config stage id 存在重复');
const indexMap = new Map(ids.map((id, idx) => [id, idx]));
for (const stage of stages) {
  const deps = Array.isArray(stage.dependencies) ? stage.dependencies : [];
  for (const dep of deps) {
    if (!indexMap.has(dep)) throw new Error(`依赖阶段不存在: ${stage.id} -> ${dep}`);
    if (indexMap.get(dep) > indexMap.get(stage.id)) {
      throw new Error(`阶段顺序错误: ${stage.id} 依赖 ${dep} 但顺序在前`);
    }
  }
}
const sr = stages.find(s => s.id === 'strategy-requirement') || stages.find(s => s.id === 'strategy');
if (sr) {
  const list = Array.isArray(sr.outputsDetailed) ? sr.outputsDetailed : [];
  const ids2 = list.map(item => item.id || item.type || item.name || '').filter(Boolean);
  const prdIdx = ids2.indexOf('prd');
  const strategyIdx = ids2.indexOf('strategy-doc');
  if (prdIdx >= 0 && strategyIdx >= 0 && prdIdx > strategyIdx) {
    throw new Error('产物顺序异常: strategy-doc 出现在 prd 之前');
  }
}
console.log(`[CHECK] workflow-config OK, stages=${stages.length}`);
NODE

log "4) collaboration-plan 校验"
COLLAB_JSON="$TMP_DIR/collab.json"
api_post_auth "/api/agents/collaboration-plan" \
  "{\"idea\":\"验证大模型引导逻辑的一周测试计划\",\"conversation\":\"用户希望验证苏格拉底式引导是否有效\",\"workflowCategory\":\"${WORKFLOW_CATEGORY}\"}" \
  "$COLLAB_JSON"

node - "$COLLAB_JSON" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.code !== 0) throw new Error(`collaboration-plan code=${data.code}`);
const agents = data?.data?.recommendedAgents;
const stages = data?.data?.stages;
const templates = data?.data?.executionTemplates;
if (!Array.isArray(agents) || agents.length === 0) throw new Error('recommendedAgents 为空');
if (agents.includes('marketing') || agents.includes('operations')) {
  throw new Error('推荐成员包含已排除角色 marketing/operations');
}
if (!Array.isArray(stages) || stages.length === 0) throw new Error('stages 为空');
if (!Array.isArray(templates) || templates.length !== stages.length) {
  throw new Error('executionTemplates 与 stages 数量不一致');
}
for (let i = 0; i < stages.length; i++) {
  if (templates[i]?.stageId !== stages[i]?.id) {
    throw new Error(`executionTemplates 顺序异常: index=${i}, tpl=${templates[i]?.stageId}, stage=${stages[i]?.id}`);
  }
}
console.log(`[CHECK] collaboration-plan OK, agents=${agents.length}, stages=${stages.length}`);
NODE

log "5) 创建临时项目并检查阶段产物顺序"
CREATE_JSON="$TMP_DIR/create.json"
IDEA_ID="smoke_$(date +%s)_$RANDOM"
PROJECT_NAME="Workflow Smoke ${IDEA_ID}"
api_post_auth "/api/projects" "{\"ideaId\":\"${IDEA_ID}\",\"name\":\"${PROJECT_NAME}\"}" "$CREATE_JSON"

PROJECT_ID="$(json_field "$CREATE_JSON" "d?.data?.project?.id")" || fail "创建项目失败: 无 project.id"
[[ -n "$PROJECT_ID" ]] || fail "创建项目失败: project.id 为空"

PROJECT_JSON="$TMP_DIR/project.json"
api_get_auth "/api/projects/${PROJECT_ID}" "$PROJECT_JSON"

node - "$PROJECT_JSON" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.code !== 0) throw new Error(`getProject code=${data.code}`);
const stages = data?.data?.project?.workflow?.stages;
if (!Array.isArray(stages) || stages.length === 0) throw new Error('项目工作流阶段为空');
const sr = stages.find(s => s.id === 'strategy-requirement') || stages.find(s => s.id === 'strategy');
if (sr) {
  const outputs = Array.isArray(sr.outputs) ? sr.outputs : [];
  const prdIdx = outputs.indexOf('prd');
  const strategyIdx = outputs.indexOf('strategy-doc');
  if (prdIdx >= 0 && strategyIdx >= 0 && prdIdx > strategyIdx) {
    throw new Error('项目阶段产物顺序异常: strategy-doc 出现在 prd 之前');
  }
}
console.log(`[CHECK] project workflow outputs order OK, stages=${stages.length}`);
NODE

log "6) execute-stage 接口契约校验（缺失 stageId -> 400）"
EXEC_BODY='{}'
EXEC_OUT="$TMP_DIR/execute_missing_stageid.json"
EXEC_HTTP_CODE="$(curl -sS -o "$EXEC_OUT" -w '%{http_code}' -X POST "${BASE_URL}/api/workflow/${PROJECT_ID}/execute-stage" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "$EXEC_BODY")"

if [[ "$EXEC_HTTP_CODE" != "400" ]]; then
  fail "execute-stage 缺失 stageId 期望 400，实际 ${EXEC_HTTP_CODE}"
fi

node - "$EXEC_OUT" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!String(data?.error || '').includes('stageId')) {
  throw new Error('execute-stage 错误信息未包含 stageId');
}
console.log('[CHECK] execute-stage missing stageId contract OK');
NODE

if [[ "$RUN_HEAVY_EXECUTE" == "1" ]]; then
  log "7) 可选：真实 execute-stage（可能消耗模型配额）"
  HEAVY_OUT="$TMP_DIR/execute_real.json"
  STAGE_ID="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const s=d?.data?.project?.workflow?.stages||[];const t=s.find(x=>x.id==='strategy-requirement')||s[0]||{};console.log(t.id||'');" "$PROJECT_JSON")"
  [[ -n "$STAGE_ID" ]] || fail "无法确定可执行阶段"

  curl -sS -X POST "${BASE_URL}/api/workflow/${PROJECT_ID}/execute-stage" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d "{\"stageId\":\"${STAGE_ID}\",\"context\":{\"CONVERSATION\":\"smoke test conversation\"}}" >"$HEAVY_OUT"

  node - "$HEAVY_OUT" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (data.code !== 0) throw new Error(`execute-stage failed: ${JSON.stringify(data)}`);
if (!Array.isArray(data?.data?.artifacts)) throw new Error('execute-stage 返回 artifacts 非数组');
console.log(`[CHECK] execute-stage real run OK, artifacts=${data.data.artifacts.length}`);
NODE
else
  log "7) 跳过真实 execute-stage（设置 RUN_HEAVY_EXECUTE=1 可启用）"
fi

log "PASS: workflow-config / collaboration-plan / execute-stage 契约与顺序校验通过"
