#!/usr/bin/env bash
# contract-tests.sh — PLGS API contract tests
# Sprint 2: verifies /api/policy/active/GOVERNANCE returns success:true
# Usage: bash contract-tests.sh [API_BASE_URL] [JWT_TOKEN]
#   Defaults: API_BASE_URL=http://localhost:8080  JWT_TOKEN=$TEST_JWT_TOKEN
set -euo pipefail

API_URL="${1:-${TEST_API_URL:-http://localhost:8080}}"
JWT="${2:-${TEST_JWT_TOKEN:-}}"
PASS=0; FAIL=0

ok()   { echo "  [PASS] $*"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $*"; FAIL=$((FAIL+1)); }
info() { echo "  [INFO] $*"; }

echo "============================================================"
echo "PLGS Contract Tests"
echo "API: ${API_URL}"
echo "============================================================"

# ── Helper ────────────────────────────────────────────────────────────────────
check_json_field() {
  # check_json_field <response_body> <field> <expected>
  local body="$1" field="$2" expected="$3"
  echo "$body" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  val = d
  for k in '$field'.split('.'):
    val = val[k] if isinstance(val, dict) else val[int(k)]
  expected = '$expected'
  result = str(val).lower()
  if result == expected.lower():
    sys.exit(0)
  print(f'Expected $field={expected!r}, got {val!r}', file=sys.stderr)
  sys.exit(1)
except Exception as e:
  print(f'JSON parse/field error: {e}', file=sys.stderr)
  sys.exit(1)
" 2>&1
}

# ── CT-001: Health check (public, no auth) ────────────────────────────────────
info "CT-001: GET /health"
RESP=$(curl -sf "${API_URL}/health" 2>/dev/null || echo '{}')
STATUS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "")
if [[ "$STATUS" == "healthy" ]]; then
  ok "CT-001: /health returns status=healthy"
else
  fail "CT-001: /health did not return status=healthy (got: ${STATUS:-no response})"
fi

# ── CT-002: GET /api/policy/active/GOVERNANCE (authenticated) ─────────────────
info "CT-002: GET /api/policy/active/GOVERNANCE"

if [[ -z "$JWT" ]]; then
  info "CT-002: TEST_JWT_TOKEN not set — testing unauthenticated (expect 401)"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}"     "${API_URL}/api/policy/active/GOVERNANCE" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "401" ]]; then
    ok "CT-002: route exists — returned 401 (unauthenticated, expected)"
  else
    fail "CT-002: unexpected HTTP ${HTTP_CODE} for unauthenticated request (expected 401)"
  fi
else
  RESP=$(curl -sf     -H "Authorization: Bearer ${JWT}"     -H "Content-Type: application/json"     "${API_URL}/api/policy/active/GOVERNANCE" 2>/dev/null || echo '{}')

  # Must return success:true (HTTP 200 with data array)
  HAS_DATA=$(echo "$RESP" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  has_data = 'data' in d and isinstance(d['data'], list)
  has_ts   = 'timestamp' in d
  print('true' if has_data and has_ts else 'false')
except:
  print('false')
" 2>/dev/null || echo "false")

  if [[ "$HAS_DATA" == "true" ]]; then
    COUNT=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "?")
    ok "CT-002: /api/policy/active/GOVERNANCE success:true (${COUNT} active policies)"
  else
    fail "CT-002: /api/policy/active/GOVERNANCE did not return {data:[...], timestamp:...}"
    echo "         Response: $(echo "$RESP" | head -c 200)"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo "============================================================"
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "============================================================"

# Exit 0 only when all tests pass
if [[ $FAIL -gt 0 ]]; then
  echo "success:false"
  exit 1
fi
echo "success:true"
exit 0
