#!/usr/bin/env bash
# =============================================================================
# cidg-obs-02.sh — Bypass Enumeration
# Enumerates ALB rules, scans MCP tool definitions, checks simulation engine
# logs, validates AIS soak agent targets, scans API route handlers for auth
# middleware gaps. Writes structured JSON gap report and uploads to GCS.
# =============================================================================
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-coreidentity-prod}"
GKE_CLUSTER="${GKE_CLUSTER:-coreidentity-platform}"
GKE_REGION="${GKE_REGION:-us-central1}"
AWS_REGION="${AWS_REGION:-us-east-1}"

ALB_NAME="${ALB_NAME:-coreidentity-dev}"
GCS_BUCKET="gs://chc-soak-results"
COREIDENTITY_ROOT="${HOME}/coreidentity"
SITE_ROOT="${HOME}/coreidentity/integrations/coreholdingcorp-site-v2"
AIS_SOAK_TARGET="api.agentidentity.systems"

REPORT_FILE="/tmp/cidg-obs02-bypass-report-$(date +%Y%m%d-%H%M%S).json"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [OBS-02] $*"; }

declare -a BYPASS_GAPS=()

add_gap() {
  local path="$1"
  local bypass_type="$2"
  local risk_level="$3"
  local remediation="$4"
  BYPASS_GAPS+=("{\"path\":$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "${path}"),\"bypass_type\":$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "${bypass_type}"),\"risk_level\":\"${risk_level}\",\"remediation\":$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "${remediation}")}")
  log "  [${risk_level}] ${bypass_type}: ${path}"
}

# ---------------------------------------------------------------------------
# 1. Configure GKE
# ---------------------------------------------------------------------------
log "Configuring GKE access..."
gcloud container clusters get-credentials "${GKE_CLUSTER}" \
  --region "${GKE_REGION}" \
  --project "${GCP_PROJECT}"
log "GKE configured."

# ---------------------------------------------------------------------------
# 2. Enumerate ALB rules — flag path-only rules without host-header condition
# ---------------------------------------------------------------------------
log "Enumerating ALB listener rules for: ${ALB_NAME}..."

python3 - <<PYEOF
import boto3, json, sys

elbv2 = boto3.client("elbv2", region_name="${AWS_REGION}")

# Find ALB by name
albs = elbv2.describe_load_balancers()["LoadBalancers"]
alb = next((a for a in albs if "${ALB_NAME}" in a["LoadBalancerName"]), None)

if not alb:
    print(f"WARNING: ALB '{repr('${ALB_NAME}')}' not found. Skipping ALB rule scan.")
    sys.exit(0)

alb_arn = alb["LoadBalancerArn"]
print(f"Found ALB: {alb['LoadBalancerName']} ({alb_arn})")

listeners = elbv2.describe_listeners(LoadBalancerArn=alb_arn)["Listeners"]
gaps = []

for listener in listeners:
    rules = elbv2.describe_rules(ListenerArn=listener["ListenerArn"])["Rules"]
    for rule in rules:
        if rule.get("IsDefault", False):
            continue

        conditions = rule.get("Conditions", [])
        condition_fields = {c["Field"] for c in conditions}

        has_path = "path-pattern" in condition_fields
        has_host = "host-header" in condition_fields

        if has_path and not has_host:
            # Flag: path-only rule with no host-header constraint
            paths = []
            for c in conditions:
                if c["Field"] == "path-pattern":
                    paths.extend(c.get("Values", []) or
                                 c.get("PathPatternConfig", {}).get("Values", []))

            gaps.append({
                "rule_arn": rule["RuleArn"],
                "priority": rule["Priority"],
                "paths": paths,
                "missing": "host-header",
                "risk": "Path-only rules can be exploited via Host header manipulation"
            })
            print(f"  [HIGH] Path-only rule (no host-header): priority={rule['Priority']} paths={paths}")

with open("/tmp/cidg-obs02-alb-gaps.json", "w") as f:
    json.dump(gaps, f, indent=2)

print(f"ALB scan complete. {len(gaps)} path-only rules without host-header found.")
PYEOF

ALB_GAPS_COUNT="$(python3 -c "import json; d=json.load(open('/tmp/cidg-obs02-alb-gaps.json','r') if __import__('os').path.exists('/tmp/cidg-obs02-alb-gaps.json') else open('/dev/null')); print(len(d))" 2>/dev/null || echo 0)"

if [[ "${ALB_GAPS_COUNT}" -gt 0 ]]; then
  while IFS= read -r gap; do
    path="$(echo "${gap}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(d.get('paths',['unknown'])))")"
    add_gap "${path}" "alb_path_only_rule" "HIGH" \
      "Add host-header condition to ALB rule to prevent Host header manipulation attacks"
  done < <(python3 -c "import json; [print(__import__('json').dumps(g)) for g in json.load(open('/tmp/cidg-obs02-alb-gaps.json'))]" 2>/dev/null || true)
fi

log "ALB rule scan: ${ALB_GAPS_COUNT} gaps found."

# ---------------------------------------------------------------------------
# 3. Scan MCP tool definitions for direct ECS/DynamoDB calls without SAL trace headers
# ---------------------------------------------------------------------------
log "Scanning MCP tool definitions for direct ECS/DynamoDB calls without SAL trace headers..."

python3 - <<PYEOF
import os, re, json

mcp_dirs = []
root = "${COREIDENTITY_ROOT}"

# Find MCP tool definition files
for dirpath, dirs, files in os.walk(root):
    dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist", "build")]
    for fname in files:
        if any(kw in fname.lower() for kw in ("mcp", "tool", "handler")):
            fpath = os.path.join(dirpath, fname)
            _, ext = os.path.splitext(fname)
            if ext in (".ts", ".js", ".py", ".tsx", ".jsx"):
                mcp_dirs.append(fpath)

gaps = []

direct_call_patterns = [
    (r'ecs\.updateService|ecs\.registerTaskDefinition|ecs\.runTask', "Direct ECS API call"),
    (r'dynamodb\.put|dynamodb\.get|dynamodb\.update|DocumentClient', "Direct DynamoDB call"),
    (r'new ECSClient|new DynamoDBClient|new DynamoDB\b', "Direct AWS SDK client instantiation"),
]

sal_trace_patterns = [
    r'SAL[-_]TRACE[-_]ID',
    r'x-sal-trace',
    r'sal_trace_id',
    r'salTraceId',
    r'SALInterceptor',
]

for fpath in mcp_dirs:
    try:
        with open(fpath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception:
        continue

    has_sal_trace = any(re.search(p, content, re.IGNORECASE) for p in sal_trace_patterns)

    for pattern, label in direct_call_patterns:
        if re.search(pattern, content):
            if not has_sal_trace:
                gaps.append({
                    "file": fpath,
                    "bypass_type": f"mcp_direct_call_no_sal_trace_{label.lower().replace(' ','_')}",
                    "label": label,
                    "has_sal_trace": False
                })
                print(f"  [HIGH] {label} without SAL trace header: {fpath}")

with open("/tmp/cidg-obs02-mcp-gaps.json", "w") as f:
    json.dump(gaps, f, indent=2)

print(f"MCP scan complete. {len(gaps)} tool definitions without SAL trace headers found.")
PYEOF

MCP_GAPS="$(python3 -c "import json,os; d=json.load(open('/tmp/cidg-obs02-mcp-gaps.json')) if os.path.exists('/tmp/cidg-obs02-mcp-gaps.json') else []; [print(json.dumps(g)) for g in d]" 2>/dev/null || true)"

while IFS= read -r gap; do
  if [[ -n "${gap}" ]]; then
    fpath="$(echo "${gap}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('file','unknown'))")"
    label="$(echo "${gap}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('label','unknown'))")"
    add_gap "${fpath}" "mcp_direct_call_no_sal_trace" "HIGH" \
      "Inject SAL trace header (x-sal-trace-id) into all MCP tool calls before ECS/DynamoDB operations"
  fi
done <<< "${MCP_GAPS}"

# ---------------------------------------------------------------------------
# 4. Check simulation engine pod logs for executions without SAL trace markers
# ---------------------------------------------------------------------------
log "Checking simulation engine pod logs for executions without SAL trace markers..."

SIM_PODS="$(kubectl get pods -n coreidentity-staging \
  -l 'app in (simulation-engine,sim-engine,governance-simulator)' \
  -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")"

UNTRACED_COUNT=0

if [[ -n "${SIM_PODS}" ]]; then
  for pod in ${SIM_PODS}; do
    log "  Scanning simulation engine pod: ${pod}..."
    POD_LOGS="$(kubectl logs "${pod}" -n coreidentity-staging \
      --since=168h --limit-bytes=10485760 2>/dev/null || echo "")"

    if [[ -n "${POD_LOGS}" ]]; then
      COUNT="$(echo "${POD_LOGS}" | python3 -c "
import sys, re
logs = sys.stdin.read()
# Count execution lines
executions = re.findall(r'executing|execution_start|run_execution', logs, re.IGNORECASE)
# Count traced executions
traced = re.findall(r'sal.trace|SAL_TRACE|x-sal-trace', logs, re.IGNORECASE)
untraced = max(0, len(executions) - len(traced))
print(untraced)
" 2>/dev/null || echo 0)"
      UNTRACED_COUNT=$(( UNTRACED_COUNT + COUNT ))
      if [[ "${COUNT}" -gt 0 ]]; then
        add_gap "simulation-engine/${pod}" "simulation_execution_no_sal_trace" "HIGH" \
          "Ensure simulation engine injects SAL trace marker before each governance execution"
      fi
    fi
  done
else
  log "No simulation engine pods found in coreidentity-staging."
fi

log "Simulation engine: ${UNTRACED_COUNT} untraced executions found."

# ---------------------------------------------------------------------------
# 5. Validate AIS soak agent targets api.agentidentity.systems
# ---------------------------------------------------------------------------
log "Validating AIS soak agent target URL..."

AIS_SOAK_CONFIGS="$(find "${COREIDENTITY_ROOT}" \
  -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.env" \
  2>/dev/null | xargs grep -l "agentidentity\|ais-soak\|soak" 2>/dev/null | head -20 || true)"

WRONG_TARGET_COUNT=0

if [[ -n "${AIS_SOAK_CONFIGS}" ]]; then
  while IFS= read -r config_file; do
    if [[ -f "${config_file}" ]]; then
      WRONG_TARGETS="$(python3 - <<PYEOF
import re

with open("${config_file}", "r", errors="replace") as f:
    content = f.read()

# Find PORTAL_URL or soak target that does NOT point to expected target
patterns = [
    r'(PORTAL_URL|soak_target|target_url|AIS_TARGET)\s*[=:]\s*["\x27]?(https?://[^"\x27\s]+)',
]
for p in patterns:
    for m in re.finditer(p, content, re.IGNORECASE):
        url = m.group(2)
        if "${AIS_SOAK_TARGET}" not in url and "staging" not in url.lower():
            print(f"{url}")
PYEOF
)"
      if [[ -n "${WRONG_TARGETS}" ]]; then
        WRONG_TARGET_COUNT=$(( WRONG_TARGET_COUNT + 1 ))
        add_gap "${config_file}" "ais_soak_wrong_target" "MEDIUM" \
          "Update AIS soak config to target ${AIS_SOAK_TARGET} or a staging equivalent"
      fi
    fi
  done <<< "${AIS_SOAK_CONFIGS}"
fi

log "AIS soak target validation: ${WRONG_TARGET_COUNT} misconfigured targets."

# ---------------------------------------------------------------------------
# 6. Scan API route handlers for execution endpoints without auth middleware
# ---------------------------------------------------------------------------
log "Scanning API route handlers for execution endpoints without auth middleware..."

python3 - <<PYEOF
import os, re, json

root = "${COREIDENTITY_ROOT}"
gaps = []
ext_set = {".ts", ".js", ".py", ".tsx", ".jsx"}
skip_dirs = {"node_modules", ".git", "dist", "build", ".next", "__pycache__"}

execution_route_patterns = [
    r'router\.(post|put)\s*\(["\x27]/[^"\x27]*execut',
    r'app\.(post|put)\s*\(["\x27]/[^"\x27]*execut',
    r'@(Post|Put)\(["\x27][^"\x27]*execut',
    r'route\(["\x27][^"\x27]*execut',
    r'path\s*=\s*["\x27][^"\x27]*execut',
]

auth_patterns = [
    r'requireAuth|authenticate|isAuthenticated|authMiddleware|verifyToken',
    r'@UseGuards|@Auth|checkAuth|withAuth|auth\(',
    r'Bearer|jwt\.verify|session\.user|req\.user',
    r'middleware.*auth|auth.*middleware',
    r'Authorization|x-api-key',
]

for dirpath, dirs, files in os.walk(root):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for fname in files:
        _, ext = os.path.splitext(fname)
        if ext not in ext_set:
            continue
        if not any(kw in fname.lower() for kw in ("route", "controller", "handler", "api", "endpoint")):
            continue
        fpath = os.path.join(dirpath, fname)
        try:
            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception:
            continue

        has_execution_route = any(re.search(p, content, re.IGNORECASE) for p in execution_route_patterns)
        if not has_execution_route:
            continue

        has_auth = any(re.search(p, content, re.IGNORECASE) for p in auth_patterns)
        if not has_auth:
            gaps.append({
                "file": fpath,
                "bypass_type": "execution_endpoint_no_auth_middleware",
                "risk_level": "CRITICAL",
                "remediation": "Add authentication middleware to all /execute endpoints before handler invocation"
            })
            print(f"  [CRITICAL] Execution endpoint without auth middleware: {fpath}")

with open("/tmp/cidg-obs02-route-gaps.json", "w") as f:
    json.dump(gaps, f, indent=2)

print(f"Route scan complete. {len(gaps)} execution endpoints without auth middleware found.")
PYEOF

ROUTE_GAPS="$(python3 -c "import json,os; d=json.load(open('/tmp/cidg-obs02-route-gaps.json')) if os.path.exists('/tmp/cidg-obs02-route-gaps.json') else []; [print(json.dumps(g)) for g in d]" 2>/dev/null || true)"

while IFS= read -r gap; do
  if [[ -n "${gap}" ]]; then
    fpath="$(echo "${gap}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('file','unknown'))")"
    add_gap "${fpath}" "execution_endpoint_no_auth_middleware" "CRITICAL" \
      "Add authentication middleware to all /execute endpoints"
  fi
done <<< "${ROUTE_GAPS}"

# ---------------------------------------------------------------------------
# 7. Write structured JSON gap report
# ---------------------------------------------------------------------------
log "Writing structured bypass gap report..."

GAPS_JSON="$(IFS=','; echo "[${BYPASS_GAPS[*]:-}]")"

cat > "${REPORT_FILE}" <<JSONEOF
{
  "report_type": "bypass_enumeration",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sprint": "cidg-obs-02",
  "summary": {
    "total_gaps": ${#BYPASS_GAPS[@]},
    "alb_gaps": ${ALB_GAPS_COUNT},
    "mcp_gaps": $(python3 -c "import json,os; print(len(json.load(open('/tmp/cidg-obs02-mcp-gaps.json'))) if os.path.exists('/tmp/cidg-obs02-mcp-gaps.json') else 0)" 2>/dev/null || echo 0),
    "simulation_untraced": ${UNTRACED_COUNT},
    "ais_soak_wrong_targets": ${WRONG_TARGET_COUNT},
    "route_auth_gaps": $(python3 -c "import json,os; print(len(json.load(open('/tmp/cidg-obs02-route-gaps.json'))) if os.path.exists('/tmp/cidg-obs02-route-gaps.json') else 0)" 2>/dev/null || echo 0)
  },
  "gaps": ${GAPS_JSON}
}
JSONEOF

log "Gap report written: ${REPORT_FILE}"

# ---------------------------------------------------------------------------
# 8. Upload to GCS
# ---------------------------------------------------------------------------
log "Uploading gap report to ${GCS_BUCKET}..."
gsutil cp "${REPORT_FILE}" "${GCS_BUCKET}/bypass-enumeration/$(basename "${REPORT_FILE}")"
log "Gap report uploaded."

# ---------------------------------------------------------------------------
# 9. npm run build
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

log "Total bypass gaps found: ${#BYPASS_GAPS[@]}"
log "cidg-obs-02.sh COMPLETE."
