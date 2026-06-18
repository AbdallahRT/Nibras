#!/usr/bin/env bash
# Full local backend smoke test. Requires API running (npm run start:dev), MongoDB, Redis.
# Usage: npm run smoke:local
# Prefer gateway-based checks when the monorepo stack is running: npm run smoke:gateway
# Optional: HR_HANDLE=your_hackerrank_username npm run smoke:local
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
API="${BASE}/api"
HR_HANDLE="${HR_HANDLE:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

step() { echo -e "\n${GREEN}==>${NC} $1"; }
fail() { echo -e "${RED}ERROR:${NC} $1" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  local auth="${4:-}"
  local args=(-s -w "\n%{http_code}" -X "$method" "${API}${path}")
  if [[ -n "$auth" ]]; then
    args+=(-H "Authorization: Bearer ${auth}")
  fi
  if [[ -n "$data" ]]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  local out
  out="$(curl "${args[@]}")"
  HTTP_STATUS="${out##*$'\n'}"
  HTTP_BODY="${out%$'\n'*}"
}

assert_status() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  [[ "$actual" == "$expected" ]] || fail "$label: expected HTTP $expected, got $actual"
}

need_cmd curl
need_cmd jq
need_cmd node

step "Health check"
api GET /ping
assert_status "200" "$HTTP_STATUS" "GET /ping"
echo "$HTTP_BODY" | jq -e '.status == "ok"' >/dev/null || fail "ping: mongo/redis not healthy"

if [[ -z "${TOKEN:-}" ]]; then
  step "Creating dev session (npm run dev:session)"
  need_cmd npm
  TOKEN="$(npm run dev:session 2>&1 | awk '/^web_/ { print; exit }')"
  [[ -n "$TOKEN" ]] || fail "Could not parse session token from dev:session"
fi
step "Using TOKEN=${TOKEN:0:20}..."

step "Auth providers"
api GET /auth/providers
assert_status "200" "$HTTP_STATUS" "GET /auth/providers"

step "GET /users/me"
api GET /users/me "" "$TOKEN"
assert_status "200" "$HTTP_STATUS" "GET /users/me"
USER_ID="$(echo "$HTTP_BODY" | jq -r '.id')"
[[ "$USER_ID" != "null" && -n "$USER_ID" ]] || fail "users/me: missing id"

step "GET /users/:id/rating-history"
api GET "/users/${USER_ID}/rating-history" "" "$TOKEN"
assert_status "200" "$HTTP_STATUS" "GET /users/:id/rating-history"
echo "$HTTP_BODY" | jq -e 'type == "array"' >/dev/null

step "Contests list + filters"
for q in "" "?active=true" "?past=true"; do
  api GET "/contests${q}"
  assert_status "200" "$HTTP_STATUS" "GET /contests${q}"
  echo "$HTTP_BODY" | jq -e 'type == "array"' >/dev/null
done

step "GET /contests/accounts (alias)"
api GET /contests/accounts "" "$TOKEN"
assert_status "200" "$HTTP_STATUS" "GET /contests/accounts"

step "Integrations"
api GET /integrations/platforms "" "$TOKEN"
assert_status "200" "$HTTP_STATUS" "GET /integrations/platforms"
api GET /integrations/accounts "" "$TOKEN"
assert_status "200" "$HTTP_STATUS" "GET /integrations/accounts"

if [[ -n "$HR_HANDLE" ]]; then
  step "HackerRank connect + verify (HR_HANDLE=$HR_HANDLE)"
  api POST /integrations/hackerrank/connect "{\"handle\":\"${HR_HANDLE}\"}" "$TOKEN"
  assert_status "201" "$HTTP_STATUS" "POST /integrations/hackerrank/connect"
  api POST /integrations/accounts/hackerrank/verify "" "$TOKEN"
  if echo "$HTTP_BODY" | jq -e '.verified == true' >/dev/null 2>&1; then
    api GET /integrations/accounts "" "$TOKEN"
    assert_status "200" "$HTTP_STATUS" "GET /integrations/accounts (after HR)"
    skill_count="$(echo "$HTTP_BODY" | jq '[.[] | select(.host == "hackerrank") | .metadata.skills | length] | add // 0')"
    echo "HackerRank skills synced: ${skill_count}"
  else
    echo "WARN: HackerRank verify returned verified=false (check handle or rate limits)"
    echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
  fi
fi

step "Internal contest flow"
START="$(node -e "console.log(new Date(Date.now()-60000).toISOString())")"
END="$(node -e "console.log(new Date(Date.now()+3600000).toISOString())")"

api POST /problems '{
  "title": "Smoke Sum Two",
  "description": "Return a+b",
  "difficulty": 800,
  "testCases": [
    {"input": "1 2", "expectedOutput": "3", "isSample": true},
    {"input": "2 3", "expectedOutput": "5", "isSample": false}
  ],
  "sampleIO": [{"input": "1 2", "output": "3"}]
}' "$TOKEN"
assert_status "201" "$HTTP_STATUS" "POST /problems"
PROBLEM_ID="$(echo "$HTTP_BODY" | jq -r '.id')"
[[ -n "$PROBLEM_ID" && "$PROBLEM_ID" != "null" ]] || fail "POST /problems: missing id"

api POST /contests "{
  \"name\": \"Smoke Contest $(date +%s)\",
  \"startDate\": \"${START}\",
  \"endDate\": \"${END}\",
  \"problemIds\": [\"${PROBLEM_ID}\"]
}" "$TOKEN"
assert_status "201" "$HTTP_STATUS" "POST /contests"
CONTEST_ID="$(echo "$HTTP_BODY" | jq -r '.id')"
[[ -n "$CONTEST_ID" && "$CONTEST_ID" != "null" ]] || fail "POST /contests: missing id"

api POST "/contests/${CONTEST_ID}/register" "" "$TOKEN"
assert_status "201" "$HTTP_STATUS" "POST /contests/:id/register"

api POST "/contests/${CONTEST_ID}/submissions" "{
  \"problemId\": \"${PROBLEM_ID}\",
  \"language\": \"javascript\",
  \"code\": \"function solve(input) { const [a,b]=input.trim().split(' ').map(Number); return a+b; }\"
}" "$TOKEN"
assert_status "201" "$HTTP_STATUS" "POST /contests/:id/submissions"
echo "$HTTP_BODY" | jq -e '.status' >/dev/null

api GET "/contests/${CONTEST_ID}"
assert_status "200" "$HTTP_STATUS" "GET /contests/:id"
echo "$HTTP_BODY" | jq -e '.standings | type == "array"' >/dev/null

api GET "/contests/${CONTEST_ID}/submissions" "" "$TOKEN"
assert_status "200" "$HTTP_STATUS" "GET /contests/:id/submissions"

step "Ranking"
api GET /ranking "" "$TOKEN"
assert_status "200" "$HTTP_STATUS" "GET /ranking"
api GET /ranking/me "" "$TOKEN"
assert_status "200" "$HTTP_STATUS" "GET /ranking/me"

echo ""
echo -e "${GREEN}All smoke checks passed.${NC}"
echo ""
echo "Socket.io (optional, in another terminal):"
echo "  CONTEST_ID=${CONTEST_ID} npm run smoke:socket"
echo "Then submit again to see contest-standings events."
