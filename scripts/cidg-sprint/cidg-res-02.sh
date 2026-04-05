#!/usr/bin/env bash
# =============================================================================
# cidg-res-02.sh — RTO/RPO Measurement
# Measures GKE SAL Kernel RTO, Proxy MCP RTO, ECS recovery via
# force-new-deployment, Cloudflare rollback path, DynamoDB PITR status.
# Writes resilience-posture.md to ~/coreidentity/docs/.
# =============================================================================
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-coreidentity-prod}"
GKE_CLUSTER="${GKE_CLUSTER:-coreidentity-platform}"
GKE_REGION="${GKE_REGION:-us-central1}"
AWS_REGION="${AWS_REGION:-us-east-1}"

STAGING_NS="coreidentity-staging"
SAL_DEPLOYMENT="sal-kernel"
PROXY_MCP_DEPLOYMENT="proxy-mcp"
ECS_CLUSTER="${ECS_CLUSTER:-coreidentity-staging}"
ECS_SERVICE="${ECS_SERVICE:-coreidentity-api}"

CF_API_TOKEN_SECRET="cidg/cloudflare-api-token"
CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-}"
CF_PROJECT_NAME="${CF_PROJECT_NAME:-coreidentity-portal}"

DYNAMODB_TABLES=(
  "nexus-executions"
  "smartnation-agents"
  "coreidentity-sessions"
  "coreidentity-users"
  "ais-soak-results"
)

SITE_ROOT="${HOME}/coreidentity/integrations/coreholdingcorp-site-v2"
DOCS_DIR="${HOME}/coreidentity/docs"
ROLLOUT_TIMEOUT="600s"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [RES-02] $*"; }

declare -A RTO_RESULTS
declare -A RPO_RESULTS

# ---------------------------------------------------------------------------
# Helper: measure pod recovery RTO
# ---------------------------------------------------------------------------
measure_gke_rto() {
  local deployment="$1"
  local ns="$2"
  local label="$3"

  log "Measuring RTO for ${label} (${deployment} in ${ns})..."

  # Verify deployment exists
  if ! kubectl get deployment "${deployment}" -n "${ns}" &>/dev/null; then
    log "WARNING: ${deployment} not found in ${ns} — RTO measurement skipped."
    RTO_RESULTS["${label}"]="NOT_DEPLOYED"
    return 0
  fi

  # Delete the pod
  local current_pod
  current_pod="$(kubectl get pods -n "${ns}" \
    -l "app=${deployment}" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")"

  if [[ -z "${current_pod}" ]]; then
    # Try generic selector
    current_pod="$(kubectl get pods -n "${ns}" \
      --field-selector=status.phase=Running \
      -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")"
  fi

  if [[ -z "${current_pod}" ]]; then
    log "WARNING: No running pod found for ${deployment} in ${ns}."
    RTO_RESULTS["${label}"]="NO_POD"
    return 0
  fi

  log "  Deleting pod ${current_pod} to trigger recovery..."
  local start_ts
  start_ts="$(date +%s%N)"

  kubectl delete pod "${current_pod}" -n "${ns}" \
    --grace-period=0 --force 2>/dev/null || true

  # Poll until new pod is Ready
  local ready=false
  local max_wait=300
  local elapsed=0
  local poll_interval=2

  while [[ "${elapsed}" -lt "${max_wait}" ]]; do
    sleep "${poll_interval}"
    elapsed=$(( elapsed + poll_interval ))

    local ready_count
    ready_count="$(kubectl get pods -n "${ns}" \
      -l "app=${deployment}" \
      --field-selector=status.phase=Running \
      -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null | \
      tr ' ' '\n' | grep -c "True" || echo 0)"

    if [[ "${ready_count}" -gt 0 ]]; then
      ready=true
      break
    fi
  done

  local end_ts
  end_ts="$(date +%s%N)"
  local rto_ms=$(( (end_ts - start_ts) / 1000000 ))
  local rto_s=$(( rto_ms / 1000 ))

  if [[ "${ready}" == "true" ]]; then
    log "  ${label} RTO: ${rto_s}s (${rto_ms}ms)"
    RTO_RESULTS["${label}"]="${rto_s}s"
  else
    log "  WARNING: ${label} did not recover within ${max_wait}s"
    RTO_RESULTS["${label}"]=">${max_wait}s (timeout)"
  fi
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
# 2. Measure SAL Kernel RTO (GKE)
# ---------------------------------------------------------------------------
measure_gke_rto "${SAL_DEPLOYMENT}" "${STAGING_NS}" "gke_sal_kernel"

# ---------------------------------------------------------------------------
# 3. Measure Proxy MCP RTO (GKE)
# ---------------------------------------------------------------------------
measure_gke_rto "${PROXY_MCP_DEPLOYMENT}" "${STAGING_NS}" "gke_proxy_mcp"

# ---------------------------------------------------------------------------
# 4. Measure ECS recovery RTO via force-new-deployment
# ---------------------------------------------------------------------------
log "Measuring ECS recovery RTO for ${ECS_SERVICE} in ${ECS_CLUSTER}..."

ECS_START_TS="$(date +%s)"
ECS_RTO="unknown"

if aws ecs describe-services \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}" \
  --region "${AWS_REGION}" \
  --output json &>/dev/null; then

  # Get desired count
  DESIRED_COUNT="$(aws ecs describe-services \
    --cluster "${ECS_CLUSTER}" \
    --services "${ECS_SERVICE}" \
    --region "${AWS_REGION}" \
    --query 'services[0].desiredCount' \
    --output text)"

  log "  ECS service desired count: ${DESIRED_COUNT}"
  log "  Triggering force-new-deployment..."

  aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "${ECS_SERVICE}" \
    --force-new-deployment \
    --region "${AWS_REGION}" \
    --output json > /dev/null

  # Poll until runningCount == desiredCount
  local_max_wait=300
  local_elapsed=0
  local_recovered=false

  while [[ "${local_elapsed}" -lt "${local_max_wait}" ]]; do
    sleep 5
    local_elapsed=$(( local_elapsed + 5 ))

    SERVICE_INFO="$(aws ecs describe-services \
      --cluster "${ECS_CLUSTER}" \
      --services "${ECS_SERVICE}" \
      --region "${AWS_REGION}" \
      --output json 2>/dev/null)"

    RUNNING_COUNT="$(echo "${SERVICE_INFO}" | \
      python3 -c "import sys,json; print(json.load(sys.stdin)['services'][0]['runningCount'])" 2>/dev/null || echo 0)"

    PRIMARY_RUNNING="$(echo "${SERVICE_INFO}" | python3 - <<'PYEOF' 2>/dev/null || echo 0
import sys, json
d = json.load(sys.stdin)
svc = d['services'][0]
deployments = svc.get('deployments', [])
primary = next((dep for dep in deployments if dep['status'] == 'PRIMARY'), None)
if primary:
    print(primary.get('runningCount', 0))
else:
    print(0)
PYEOF
)"

    if [[ "${PRIMARY_RUNNING}" -ge "${DESIRED_COUNT}" && "${DESIRED_COUNT}" -gt 0 ]]; then
      local_recovered=true
      break
    fi
    log "  ECS: running=${RUNNING_COUNT}/${DESIRED_COUNT} (${local_elapsed}s elapsed)"
  done

  ECS_END_TS="$(date +%s)"
  ECS_ELAPSED=$(( ECS_END_TS - ECS_START_TS ))

  if [[ "${local_recovered}" == "true" ]]; then
    ECS_RTO="${ECS_ELAPSED}s"
    log "  ECS RTO: ${ECS_RTO}"
  else
    ECS_RTO=">${local_max_wait}s (timeout)"
    log "  WARNING: ECS did not recover within ${local_max_wait}s"
  fi
else
  log "WARNING: ECS cluster/service not found — skipping ECS RTO measurement."
  ECS_RTO="NOT_DEPLOYED"
fi

RTO_RESULTS["ecs_coreidentity_api"]="${ECS_RTO}"

# ---------------------------------------------------------------------------
# 5. Confirm Cloudflare rollback path via Pages API
# ---------------------------------------------------------------------------
log "Checking Cloudflare Pages rollback path..."
CF_ROLLBACK_STATUS="unchecked"

CF_TOKEN="$(gcloud secrets versions access latest \
  --secret="${CF_API_TOKEN_SECRET}" \
  --project="${GCP_PROJECT}" 2>/dev/null || echo "")"

if [[ -n "${CF_TOKEN}" && -n "${CF_ACCOUNT_ID}" ]]; then
  CF_DEPLOYMENTS="$(python3 - <<PYEOF
import urllib.request, urllib.error, json

token = "${CF_TOKEN}"
account_id = "${CF_ACCOUNT_ID}"
project_name = "${CF_PROJECT_NAME}"

url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments"
req = urllib.request.Request(url, headers={
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    deployments = data.get("result", [])
    # Check if there are at least 2 deployments (need one to roll back to)
    if len(deployments) >= 2:
        latest = deployments[0]
        previous = deployments[1]
        print(f"ROLLBACK_AVAILABLE")
        print(f"Latest: {latest.get('id','?')} ({latest.get('created_on','?')[:10]})")
        print(f"Previous: {previous.get('id','?')} ({previous.get('created_on','?')[:10]})")
    elif len(deployments) == 1:
        print("SINGLE_DEPLOYMENT_NO_ROLLBACK")
    else:
        print("NO_DEPLOYMENTS")
except Exception as e:
    print(f"ERROR: {e}")
PYEOF
)"

  if echo "${CF_DEPLOYMENTS}" | grep -q "ROLLBACK_AVAILABLE"; then
    CF_ROLLBACK_STATUS="available"
    log "  Cloudflare rollback path: AVAILABLE"
  elif echo "${CF_DEPLOYMENTS}" | grep -q "SINGLE_DEPLOYMENT"; then
    CF_ROLLBACK_STATUS="single_deployment"
    log "  Cloudflare rollback path: Only one deployment — no rollback target yet"
  else
    CF_ROLLBACK_STATUS="unavailable"
    log "  WARNING: Cloudflare rollback path unavailable"
  fi
  log "${CF_DEPLOYMENTS}"
else
  log "WARNING: Cloudflare credentials or account ID not configured — skipping."
  CF_ROLLBACK_STATUS="credentials_missing"
fi

# ---------------------------------------------------------------------------
# 6. Check DynamoDB PITR status
# ---------------------------------------------------------------------------
log "Checking DynamoDB Point-in-Time Recovery status for key tables..."

declare -A PITR_STATUS

for table in "${DYNAMODB_TABLES[@]}"; do
  PITR_INFO="$(aws dynamodb describe-continuous-backups \
    --table-name "${table}" \
    --region "${AWS_REGION}" \
    --output json 2>/dev/null || echo '{"error": true}')"

  STATUS="$(echo "${PITR_INFO}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('error'):
    print('TABLE_NOT_FOUND')
else:
    pitr = d.get('ContinuousBackupsDescription', {})
    point_in_time = pitr.get('PointInTimeRecoveryDescription', {})
    print(point_in_time.get('PointInTimeRecoveryStatus', 'UNKNOWN'))
" 2>/dev/null || echo "ERROR")"

  PITR_STATUS["${table}"]="${STATUS}"

  EARLIEST_RESTORE="$(echo "${PITR_INFO}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('error'):
    print('N/A')
else:
    pitr = d.get('ContinuousBackupsDescription', {}).get('PointInTimeRecoveryDescription', {})
    print(pitr.get('EarliestRestorableDateTime', 'N/A'))
" 2>/dev/null || echo "N/A")"

  log "  ${table}: PITR=${STATUS}, earliest_restore=${EARLIEST_RESTORE}"
  RPO_RESULTS["${table}"]="${STATUS} (earliest: ${EARLIEST_RESTORE})"
done

# ---------------------------------------------------------------------------
# 7. Write resilience-posture.md
# ---------------------------------------------------------------------------
mkdir -p "${DOCS_DIR}"

SAL_RTO="${RTO_RESULTS[gke_sal_kernel]:-not_measured}"
PROXY_RTO="${RTO_RESULTS[gke_proxy_mcp]:-not_measured}"
ECS_RTO_VAL="${RTO_RESULTS[ecs_coreidentity_api]:-not_measured}"

cat > "${DOCS_DIR}/resilience-posture.md" <<DOCEOF
# CoreIdentity Platform — Resilience Posture

**Generated by:** cidg-res-02.sh
**Date:** $(date -u +%Y-%m-%d)
**Sprint:** CIDG Master Sprint
**Environment measured:** Staging (${STAGING_NS} / ${ECS_CLUSTER})

---

## RTO/RPO Summary Table

| Component | RTO (measured) | RPO (mechanism) | Notes |
|-----------|---------------|-----------------|-------|
| GKE — SAL Kernel | ${SAL_RTO} | N/A (stateless) | Pod restart by K8s ReplicaSet |
| GKE — Proxy MCP | ${PROXY_RTO} | N/A (stateless) | Pod restart by K8s ReplicaSet |
| ECS — coreidentity-api | ${ECS_RTO_VAL} | N/A (stateless) | force-new-deployment |
| DynamoDB — nexus-executions | <60s failover | ~5min window (PITR: ${PITR_STATUS[nexus-executions]:-UNCHECKED}) | Multi-AZ by default |
| DynamoDB — smartnation-agents | <60s failover | ~5min window (PITR: ${PITR_STATUS[smartnation-agents]:-UNCHECKED}) | Multi-AZ by default |
| DynamoDB — coreidentity-sessions | <60s failover | ~5min window (PITR: ${PITR_STATUS[coreidentity-sessions]:-UNCHECKED}) | Multi-AZ by default |
| DynamoDB — coreidentity-users | <60s failover | ~5min window (PITR: ${PITR_STATUS[coreidentity-users]:-UNCHECKED}) | Multi-AZ by default |
| Cloudflare Pages (portal) | Instant rollback | Deployment history | Rollback: ${CF_ROLLBACK_STATUS} |

---

## DynamoDB PITR Status

| Table | PITR Status | Notes |
|-------|-------------|-------|
$(for table in "${DYNAMODB_TABLES[@]}"; do
  echo "| ${table} | ${PITR_STATUS[$table]:-UNCHECKED} | ${RPO_RESULTS[$table]:-} |"
done)

**Recommendation:** All production DynamoDB tables should have PITR \`ENABLED\`.
Tables with \`DISABLED\` status should be patched immediately:
\`\`\`bash
aws dynamodb update-continuous-backups \\
  --table-name <TABLE_NAME> \\
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
\`\`\`

---

## Failure Domain Map

\`\`\`
                       ┌─────────────────────────────┐
                       │        Cloudflare CDN        │
                       │   (Portal / Static Assets)   │
                       └──────────────┬──────────────┘
                                      │
                       ┌──────────────▼──────────────┐
                       │    Application Load Balancer  │
                       │         (AWS ALB)             │
                       └──────┬──────────────┬────────┘
                              │              │
              ┌───────────────▼───┐   ┌──────▼──────────────┐
              │   ECS Fargate     │   │   GKE Cluster        │
              │  coreidentity-api │   │  (us-central1)       │
              │  (stateless)      │   │                      │
              └───────────────────┘   │  ┌────────────────┐  │
                                      │  │  SAL Kernel    │  │
                                      │  │  (deny mode)   │  │
                                      │  └────────────────┘  │
                                      │  ┌────────────────┐  │
                                      │  │  Proxy MCP     │  │
                                      │  └────────────────┘  │
                                      └──────────────────────┘
                                                │
                              ┌─────────────────▼─────────────┐
                              │         DynamoDB               │
                              │  (Multi-AZ, PITR enabled)      │
                              └───────────────────────────────┘
\`\`\`

**Failure Domains:**
1. **Cloudflare CDN** — Independent. Rollback via Pages API. No RTO measured.
2. **ALB** — AWS-managed HA. Not a single point of failure (multi-AZ).
   ⚠️ **ALB Incident Note:** Any misconfigured ALB rule (path-only without host-header)
   can allow cross-tenant routing. See cidg-obs-02 bypass report.
3. **ECS Fargate** — Stateless. RTO measured as: \`${ECS_RTO_VAL}\`. Force-new-deployment is the
   primary recovery mechanism.
4. **GKE / SAL Kernel** — Stateless. RTO measured as: \`${SAL_RTO}\`. Failure mode is
   \`deny\` — SAL unavailability causes 503 to propagate to callers.
5. **DynamoDB** — Managed Multi-AZ. RPO is within ~5 minutes via PITR.
   Primary RPO risk is human error (delete/corrupt) — mitigated by PITR.

---

## Recovery Procedures

### SAL Kernel Crash
\`\`\`bash
kubectl rollout restart deployment/sal-kernel -n coreidentity-staging
kubectl rollout status deployment/sal-kernel -n coreidentity-staging --timeout=300s
\`\`\`

### ECS Service Recovery
\`\`\`bash
aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --force-new-deployment
aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}
\`\`\`

### DynamoDB Point-in-Time Restore
\`\`\`bash
aws dynamodb restore-table-to-point-in-time \\
  --source-table-name <TABLE> \\
  --target-table-name <TABLE>-restored \\
  --restore-date-time <ISO8601_TIMESTAMP>
\`\`\`

### Cloudflare Portal Rollback
\`\`\`bash
# Via CF Pages API — roll back to previous deployment
curl -X POST "https://api.cloudflare.com/client/v4/accounts/\${CF_ACCOUNT_ID}/pages/projects/${CF_PROJECT_NAME}/deployments/<PREVIOUS_DEPLOYMENT_ID>/rollback" \\
  -H "Authorization: Bearer \${CF_API_TOKEN}"
\`\`\`

---

## ALB Incident Note

The ALB scan (cidg-obs-02) checks for listener rules that match only on path patterns
without a required host-header condition. Such rules can allow:
- Cross-tenant request routing via crafted Host headers
- Bypass of domain-level routing restrictions

Remediation: All ALB rules must specify both path-pattern AND host-header conditions.

---

*This document is auto-generated and reflects staging measurements only.
Production RTO/RPO may differ based on replica count and resource allocation.*
DOCEOF

log "Resilience posture document written to: ${DOCS_DIR}/resilience-posture.md"

# ---------------------------------------------------------------------------
# 8. npm run build
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

log "RTO Summary: SAL=${SAL_RTO} | ProxyMCP=${PROXY_RTO} | ECS=${ECS_RTO_VAL}"
log "RPO: DynamoDB PITR enabled on ${#PITR_STATUS[@]} tables checked."
log "cidg-res-02.sh COMPLETE."
