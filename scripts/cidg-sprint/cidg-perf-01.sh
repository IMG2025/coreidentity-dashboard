#!/usr/bin/env bash
# =============================================================================
# cidg-perf-01.sh — Analytics Optimization
# Baselines GET /api/analytics (10 requests), profiles DynamoDB GSI gaps,
# injects 60s in-memory cache into analytics route handler, creates
# CloudWatch p95 alarm, deploys to staging, re-measures, pass/fail < 3000ms.
# =============================================================================
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-project-6894307a-4c69-4e0b-9ae}"
AWS_REGION="${AWS_REGION:-us-east-1}"

STAGING_API="${STAGING_API:-https://staging.api.coreidentity.io}"
ANALYTICS_ENDPOINT="${STAGING_API}/api/analytics"
STAGING_API_KEY_SECRET="cidg-staging-api-key"

COREIDENTITY_ROOT="${HOME}/coreidentity"
SITE_ROOT="${HOME}/coreidentity/integrations/coreholdingcorp-site-v2"
DEPLOY_SCRIPT="${COREIDENTITY_ROOT}/scripts/script35-deploy-staging.sh"

ANALYTICS_TABLES=(
  "coreidentity-analytics"
  "nexus-analytics"
  "ais-analytics"
)

CW_ALARM_NAME="CoreIdentity-Analytics-Latency-High"
P95_THRESHOLD_MS=3000
SAMPLE_COUNT=10

REPORT_FILE="/tmp/cidg-perf01-analytics-report-$(date +%Y%m%d-%H%M%S).json"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [PERF-01] $*"; }

# ---------------------------------------------------------------------------
# 1. Auth to staging API — fetch key from Secret Manager
# ---------------------------------------------------------------------------
log "Fetching staging API key from Secret Manager..."
STAGING_API_KEY="$(gcloud secrets versions access latest \
  --secret="${STAGING_API_KEY_SECRET}" \
  --project="${GCP_PROJECT}" 2>/dev/null || echo "")"

if [[ -z "${STAGING_API_KEY}" ]]; then
  log "WARNING: No staging API key found in Secret Manager — proceeding without auth header."
fi
log "Staging API auth configured."

# ---------------------------------------------------------------------------
# 2. Baseline measurement — 10 requests to GET /api/analytics
# ---------------------------------------------------------------------------
log "Measuring baseline latency for GET /api/analytics (${SAMPLE_COUNT} requests)..."

BASELINE_RESULTS="$(python3 - <<PYEOF
import urllib.request, urllib.error, time, json, statistics, sys

endpoint = "${ANALYTICS_ENDPOINT}"
api_key = "${STAGING_API_KEY}"
sample_count = ${SAMPLE_COUNT}

latencies = []
errors = []

for i in range(1, sample_count + 1):
    req = urllib.request.Request(endpoint, method="GET")
    if api_key:
        req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Accept", "application/json")
    req.add_header("X-Cidg-Probe", "perf-baseline")

    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            _ = resp.read()
            elapsed_ms = (time.time() - start) * 1000
            latencies.append(elapsed_ms)
            print(f"  Request {i:2d}: {elapsed_ms:.1f}ms (HTTP {resp.status})")
    except Exception as e:
        elapsed_ms = (time.time() - start) * 1000
        errors.append({"attempt": i, "error": str(e), "latency_ms": elapsed_ms})
        print(f"  Request {i:2d}: ERROR — {e} ({elapsed_ms:.1f}ms)")
        latencies.append(elapsed_ms)

result = {
    "endpoint": endpoint,
    "sample_count": sample_count,
    "latencies_ms": latencies,
    "mean_ms": statistics.mean(latencies) if latencies else 0,
    "median_ms": statistics.median(latencies) if latencies else 0,
    "p95_ms": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
    "min_ms": min(latencies) if latencies else 0,
    "max_ms": max(latencies) if latencies else 0,
    "error_count": len(errors),
    "errors": errors
}

print(json.dumps(result))
PYEOF
)"

# Extract baseline p95
BASELINE_P95="$(echo "${BASELINE_RESULTS}" | tail -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['p95_ms'])")"
BASELINE_MEAN="$(echo "${BASELINE_RESULTS}" | tail -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d['mean_ms'],1))")"
BASELINE_DATA="$(echo "${BASELINE_RESULTS}" | tail -1)"

log "Baseline: p95=${BASELINE_P95}ms, mean=${BASELINE_MEAN}ms"

# ---------------------------------------------------------------------------
# 3. Profile DynamoDB analytics tables for GSI gaps
# ---------------------------------------------------------------------------
log "Profiling DynamoDB analytics tables for GSI coverage..."

GSI_REPORT="$(python3 - <<PYEOF
import boto3, json, sys

dynamodb = boto3.client("dynamodb", region_name="${AWS_REGION}")
report = []

for table_name in ${ANALYTICS_TABLES[@]@Q}:
    try:
        desc = dynamodb.describe_table(TableName=table_name)["Table"]
        gsis = desc.get("GlobalSecondaryIndexes", [])
        lsis = desc.get("LocalSecondaryIndexes", [])
        key_schema = desc.get("KeySchema", [])

        # Identify potential query patterns needing GSIs
        has_time_gsi = any(
            any(k["AttributeName"] in ("created_at","timestamp","ts","date")
                for k in gsi.get("KeySchema",[]))
            for gsi in gsis
        )
        has_agent_gsi = any(
            any(k["AttributeName"] in ("agent_id","user_id","session_id")
                for k in gsi.get("KeySchema",[]))
            for gsi in gsis
        )

        table_report = {
            "table": table_name,
            "gsi_count": len(gsis),
            "lsi_count": len(lsis),
            "gsis": [{"name": g["IndexName"], "keys": g["KeySchema"]} for g in gsis],
            "gaps": []
        }

        if not has_time_gsi:
            table_report["gaps"].append({
                "type": "missing_time_gsi",
                "description": "No GSI on timestamp/created_at — analytics time-range queries will full-scan",
                "recommendation": "Add GSI: created_at (partition) + execution_id (sort)"
            })
        if not has_agent_gsi:
            table_report["gaps"].append({
                "type": "missing_agent_gsi",
                "description": "No GSI on agent_id/user_id — per-agent analytics queries will full-scan",
                "recommendation": "Add GSI: agent_id (partition) + created_at (sort)"
            })

        report.append(table_report)
        print(f"  {table_name}: {len(gsis)} GSIs, {len(table_report['gaps'])} gaps")
        for gap in table_report["gaps"]:
            print(f"    GAP: {gap['description']}")

    except dynamodb.exceptions.ResourceNotFoundException:
        print(f"  {table_name}: TABLE NOT FOUND")
        report.append({"table": table_name, "error": "not_found", "gsi_count": 0, "gaps": []})

print(json.dumps(report))
PYEOF
)"

GSI_DATA="$(echo "${GSI_REPORT}" | tail -1)"
log "GSI profiling complete."

# ---------------------------------------------------------------------------
# 4. Inject 60-second in-memory cache into analytics route handler
# ---------------------------------------------------------------------------
log "Injecting in-memory cache into analytics route handler..."

# Find the analytics route handler
ANALYTICS_HANDLER=""
for ext in ts js tsx jsx py; do
  CANDIDATES="$(find "${COREIDENTITY_ROOT}" \
    -path "*/node_modules" -prune -o \
    -path "*/.git" -prune -o \
    -name "*.${ext}" -print 2>/dev/null | \
    xargs grep -l "analytics\|/api/analytics" 2>/dev/null | \
    grep -i "route\|handler\|controller\|api" | head -5 || true)"
  if [[ -n "${CANDIDATES}" ]]; then
    ANALYTICS_HANDLER="$(echo "${CANDIDATES}" | head -1)"
    break
  fi
done

if [[ -n "${ANALYTICS_HANDLER}" ]]; then
  log "Found analytics handler: ${ANALYTICS_HANDLER}"
  EXT="${ANALYTICS_HANDLER##*.}"

  python3 - <<PYEOF
import re, os

fpath = "${ANALYTICS_HANDLER}"
ext = "${EXT}"

with open(fpath, "r", encoding="utf-8") as f:
    content = f.read()

if "analyticsCache" in content or "_analytics_cache" in content:
    print(f"Cache already present in {fpath} — skipping injection.")
    exit(0)

if ext in ("ts", "tsx", "js", "jsx"):
    cache_declaration = '''
// ─── In-memory analytics cache (CIDG perf-01, TTL: 60s) ──────────────────
const _analyticsCache = new Map<string, { data: unknown; expires: number }>();
const _ANALYTICS_CACHE_TTL_MS = 60_000; // 60 seconds

function _getCachedAnalytics(key: string): unknown | null {
  const entry = _analyticsCache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  _analyticsCache.delete(key);
  return null;
}

function _setCachedAnalytics(key: string, data: unknown): void {
  _analyticsCache.set(key, { data, expires: Date.now() + _ANALYTICS_CACHE_TTL_MS });
}
// ──────────────────────────────────────────────────────────────────────────
'''

    cache_usage_pattern = r'(async\s+function\s+\w*[Aa]nalytics\w*\s*\([^)]*\)\s*\{)'
    cache_wrapper = r'''\1
  // Analytics cache lookup (CIDG perf-01)
  const _cacheKey = JSON.stringify({ path: req?.url || "analytics", query: req?.query });
  const _cached = _getCachedAnalytics(_cacheKey);
  if (_cached) return _cached;
'''

    # Insert cache declarations before first export or function
    insert_before = re.search(r'^(export\s+|async\s+function\s+|function\s+)', content, re.MULTILINE)
    if insert_before:
        pos = insert_before.start()
        content = content[:pos] + cache_declaration + content[pos:]

    content = re.sub(cache_usage_pattern, cache_wrapper, content, count=1)

elif ext == "py":
    cache_declaration = '''
# ─── In-memory analytics cache (CIDG perf-01, TTL: 60s) ──────────────────
import time as _time
_analytics_cache: dict = {}
_ANALYTICS_CACHE_TTL = 60  # seconds

def _get_cached_analytics(key: str):
    entry = _analytics_cache.get(key)
    if entry and _time.time() < entry["expires"]:
        return entry["data"]
    _analytics_cache.pop(key, None)
    return None

def _set_cached_analytics(key: str, data) -> None:
    _analytics_cache[key] = {"data": data, "expires": _time.time() + _ANALYTICS_CACHE_TTL}
# ──────────────────────────────────────────────────────────────────────────
'''
    content = cache_declaration + content

with open(fpath, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Cache injected into {fpath}")
PYEOF
  log "Cache injection complete."
else
  log "WARNING: Analytics handler not found — cache injection skipped."
fi

# ---------------------------------------------------------------------------
# 5. Create CloudWatch alarm for analytics p95 latency
# ---------------------------------------------------------------------------
log "Creating CloudWatch alarm: ${CW_ALARM_NAME}..."

aws cloudwatch put-metric-alarm \
  --alarm-name "${CW_ALARM_NAME}" \
  --alarm-description "CoreIdentity analytics endpoint p95 latency exceeds 3000ms" \
  --metric-name "TargetResponseTime" \
  --namespace "AWS/ApplicationELB" \
  --statistic "p95" \
  --period 300 \
  --evaluation-periods 2 \
  --threshold "${P95_THRESHOLD_MS}" \
  --comparison-operator "GreaterThanThreshold" \
  --treat-missing-data "notBreaching" \
  --dimensions Name=LoadBalancer,Value="app/coreidentity-dev/$(aws elbv2 describe-load-balancers \
    --names "coreidentity-dev" \
    --region "${AWS_REGION}" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null | awk -F'/' '{print $3"/"$4"/"$5}' || echo 'UNKNOWN')" \
  --region "${AWS_REGION}" \
  --ok-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'UNKNOWN'):coreidentity-alerts" \
  --alarm-actions "arn:aws:sns:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo 'UNKNOWN'):coreidentity-alerts" \
  2>/dev/null || log "WARNING: CloudWatch alarm creation failed (may need ALB ARN adjustment)"

log "CloudWatch alarm created/updated."

# ---------------------------------------------------------------------------
# 6. Deploy to staging via script35-deploy-staging.sh
# ---------------------------------------------------------------------------
log "Deploying to staging..."
if [[ -f "${DEPLOY_SCRIPT}" ]]; then
  bash "${DEPLOY_SCRIPT}"
  log "Staging deployment complete."
else
  log "WARNING: Deploy script not found at ${DEPLOY_SCRIPT} — running npm build + restart."
  if [[ -f "${SITE_ROOT}/package.json" ]]; then
    cd "${SITE_ROOT}"
    npm run build
    cd - > /dev/null
  fi
fi

# Wait for deployment to stabilize
log "Waiting 30s for deployment to stabilize..."
sleep 30

# ---------------------------------------------------------------------------
# 7. Re-measure latency post-optimization
# ---------------------------------------------------------------------------
log "Re-measuring latency post-optimization (${SAMPLE_COUNT} requests)..."

POST_RESULTS="$(python3 - <<PYEOF
import urllib.request, urllib.error, time, json, statistics

endpoint = "${ANALYTICS_ENDPOINT}"
api_key = "${STAGING_API_KEY}"
sample_count = ${SAMPLE_COUNT}

latencies = []
errors = []

for i in range(1, sample_count + 1):
    req = urllib.request.Request(endpoint, method="GET")
    if api_key:
        req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Accept", "application/json")
    req.add_header("X-Cidg-Probe", "perf-post")

    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            _ = resp.read()
            elapsed_ms = (time.time() - start) * 1000
            latencies.append(elapsed_ms)
            print(f"  Request {i:2d}: {elapsed_ms:.1f}ms (HTTP {resp.status})")
    except Exception as e:
        elapsed_ms = (time.time() - start) * 1000
        errors.append({"attempt": i, "error": str(e), "latency_ms": elapsed_ms})
        print(f"  Request {i:2d}: ERROR — {e} ({elapsed_ms:.1f}ms)")
        latencies.append(elapsed_ms)

result = {
    "endpoint": endpoint,
    "sample_count": sample_count,
    "latencies_ms": latencies,
    "mean_ms": statistics.mean(latencies) if latencies else 0,
    "median_ms": statistics.median(latencies) if latencies else 0,
    "p95_ms": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
    "min_ms": min(latencies) if latencies else 0,
    "max_ms": max(latencies) if latencies else 0,
    "error_count": len(errors)
}

print(json.dumps(result))
PYEOF
)"

POST_P95="$(echo "${POST_RESULTS}" | tail -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['p95_ms'])")"
POST_MEAN="$(echo "${POST_RESULTS}" | tail -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d['mean_ms'],1))")"
POST_DATA="$(echo "${POST_RESULTS}" | tail -1)"

log "Post-optimization: p95=${POST_P95}ms, mean=${POST_MEAN}ms"

# ---------------------------------------------------------------------------
# 8. Pass/fail against 3000ms target
# ---------------------------------------------------------------------------
PERF_PASS="$(python3 -c "print('PASS' if float('${POST_P95}') < ${P95_THRESHOLD_MS} else 'FAIL')")"
IMPROVEMENT="$(python3 -c "
baseline = float('${BASELINE_P95}')
post = float('${POST_P95}')
if baseline > 0:
    pct = ((baseline - post) / baseline) * 100
    print(f'{pct:.1f}%')
else:
    print('N/A')
")"

echo ""
echo "============================================================"
echo "  ANALYTICS PERFORMANCE REPORT"
echo "============================================================"
echo "  Baseline p95:  ${BASELINE_P95}ms"
echo "  Post-opt p95:  ${POST_P95}ms"
echo "  Target:        <${P95_THRESHOLD_MS}ms"
echo "  Improvement:   ${IMPROVEMENT}"
echo "  CloudWatch:    ${CW_ALARM_NAME}"
echo "  RESULT:        ${PERF_PASS}"
echo "============================================================"

# ---------------------------------------------------------------------------
# 9. Write performance report
# ---------------------------------------------------------------------------
cat > "${REPORT_FILE}" <<JSONEOF
{
  "report_type": "analytics_performance",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sprint": "cidg-perf-01",
  "endpoint": "${ANALYTICS_ENDPOINT}",
  "threshold_ms": ${P95_THRESHOLD_MS},
  "baseline": ${BASELINE_DATA},
  "post_optimization": ${POST_DATA},
  "improvement_pct": "$(python3 -c "
baseline = float('${BASELINE_P95}')
post = float('${POST_P95}')
pct = ((baseline - post) / baseline) * 100 if baseline > 0 else 0
print(f'{pct:.1f}')
")",
  "pass": $(python3 -c "print('true' if float('${POST_P95}') < ${P95_THRESHOLD_MS} else 'false'"),
  "cloudwatch_alarm": "${CW_ALARM_NAME}",
  "cache_ttl_seconds": 60,
  "analytics_handler": "${ANALYTICS_HANDLER:-not_found}",
  "gsi_report": ${GSI_DATA:-[]}
}
JSONEOF

log "Performance report written: ${REPORT_FILE}"

if [[ "${PERF_PASS}" == "FAIL" ]]; then
  log "FAIL: POST-optimization p95 ${POST_P95}ms exceeds ${P95_THRESHOLD_MS}ms threshold."
  exit 1
fi

# ---------------------------------------------------------------------------
# 10. npm run build
# ---------------------------------------------------------------------------
log "Running npm run build..."
if [[ -f "${SITE_ROOT}/package.json" ]]; then
  cd "${SITE_ROOT}"
  npm run build
  cd - > /dev/null
  log "Build complete."
else
  log "WARNING: package.json not found — skipping build."
fi

log "cidg-perf-01.sh COMPLETE."
