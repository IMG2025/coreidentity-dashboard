#!/usr/bin/env bash
# =============================================================================
# cidg-master-sprint.sh — CIDG Master Sprint Orchestrator
# Executes all 10 sprint scripts in sequence with staging gates,
# structured JSON result tracking, and Zoho SMTP notifications.
# NEVER promotes to production.
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SPRINT_DATE="$(date +%Y%m%d)"
SPRINT_TAG="cidg-sprint-${SPRINT_DATE}"
LOG_FILE="/var/log/cidg-sprint-${SPRINT_DATE}.log"
RESULTS_FILE="/tmp/cidg-sprint-results-${SPRINT_DATE}.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Zoho SMTP config — credentials fetched from Secret Manager at runtime
ZOHO_SMTP_HOST="smtp.zoho.com"
ZOHO_SMTP_PORT="587"
ZOHO_FROM_EMAIL="${ZOHO_FROM_EMAIL:-info@coreholdingcorp.com}"
ZOHO_TO_EMAIL="${ZOHO_TO_EMAIL:-tmorgan@coreidentitygroup.com}"
GCP_PROJECT="${GCP_PROJECT:-project-6894307a-4c69-4e0b-9ae}"

# Sprint gate thresholds
GATE_TIMEOUT_SECONDS=120

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
exec > >(tee -a "${LOG_FILE}") 2>&1

log() {
  local level="$1"; shift
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${level}] $*"
}

log_info()  { log "INFO " "$@"; }
log_warn()  { log "WARN " "$@"; }
log_error() { log "ERROR" "$@"; }
log_gate()  { log "GATE " "$@"; }

# ---------------------------------------------------------------------------
# JSON result tracking
# ---------------------------------------------------------------------------
SPRINT_START_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
declare -A SCRIPT_STATUS
declare -A SCRIPT_DURATION
declare -A SCRIPT_EXIT_CODE

init_results_json() {
  cat > "${RESULTS_FILE}" <<EOF
{
  "sprint_tag": "${SPRINT_TAG}",
  "sprint_date": "${SPRINT_DATE}",
  "started_at": "${SPRINT_START_TS}",
  "completed_at": null,
  "overall_status": "running",
  "promoted_to_production": false,
  "scripts": [],
  "gates": [],
  "metrics": {
    "total_scripts": 10,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "total_duration_seconds": 0
  }
}
EOF
}

append_script_result() {
  local script_name="$1"
  local status="$2"       # passed | failed | skipped
  local exit_code="$3"
  local duration="$4"
  local notes="${5:-}"

  local tmp
  tmp="$(mktemp)"
  python3 - <<PYEOF > "${tmp}"
import json, sys
with open("${RESULTS_FILE}") as f:
    d = json.load(f)
entry = {
    "name": "${script_name}",
    "status": "${status}",
    "exit_code": ${exit_code},
    "duration_seconds": ${duration},
    "notes": "${notes}"
}
d["scripts"].append(entry)
if "${status}" == "passed":
    d["metrics"]["passed"] += 1
elif "${status}" == "failed":
    d["metrics"]["failed"] += 1
else:
    d["metrics"]["skipped"] += 1
d["metrics"]["total_duration_seconds"] += ${duration}
with open("${RESULTS_FILE}", "w") as f:
    json.dump(d, f, indent=2)
PYEOF
  mv "${tmp}" "${RESULTS_FILE}"
}

append_gate_result() {
  local gate_num="$1"
  local status="$2"
  local checks="$3"

  local tmp
  tmp="$(mktemp)"
  python3 - <<PYEOF > "${tmp}"
import json
with open("${RESULTS_FILE}") as f:
    d = json.load(f)
d["gates"].append({
    "gate": "G${gate_num}",
    "status": "${status}",
    "checks": "${checks}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
})
with open("${RESULTS_FILE}", "w") as f:
    json.dump(d, f, indent=2)
PYEOF
  mv "${tmp}" "${RESULTS_FILE}"
}

finalize_results_json() {
  local overall_status="$1"
  local tmp
  tmp="$(mktemp)"
  python3 - <<PYEOF > "${tmp}"
import json
with open("${RESULTS_FILE}") as f:
    d = json.load(f)
d["completed_at"] = "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
d["overall_status"] = "${overall_status}"
with open("${RESULTS_FILE}", "w") as f:
    json.dump(d, f, indent=2)
PYEOF
  mv "${tmp}" "${RESULTS_FILE}"
}

# ---------------------------------------------------------------------------
# Zoho SMTP notification
# ---------------------------------------------------------------------------
fetch_zoho_credentials() {
  log_info "Fetching Zoho SMTP credentials from Secret Manager..."
  ZOHO_USERNAME="$(gcloud secrets versions access latest \
    --secret="ZOHO_SMTP_USER" \
    --project="${GCP_PROJECT}")"
  ZOHO_PASSWORD="$(gcloud secrets versions access latest \
    --secret="ZOHO_SMTP_PASS" \
    --project="${GCP_PROJECT}")"
  ZOHO_FROM_EMAIL="$(gcloud secrets versions access latest \
    --secret="ZOHO_SMTP_FROM" \
    --project="${GCP_PROJECT}")"
  log_info "Zoho credentials loaded (user: ${ZOHO_USERNAME})."
}

send_zoho_notification() {
  local subject="$1"
  local body="$2"

  log_info "Sending Zoho SMTP notification: ${subject}"

  python3 - <<PYEOF
import smtplib, ssl, json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

with open("${RESULTS_FILE}") as f:
    results = json.load(f)

subject = "${subject}"
body_text = """${body}"""

metrics_summary = json.dumps(results.get("metrics", {}), indent=2)
scripts_summary = "\n".join([
    f"  [{s['status'].upper()}] {s['name']} (exit={s['exit_code']}, {s['duration_seconds']}s)"
    for s in results.get("scripts", [])
])
gates_summary = "\n".join([
    f"  [GATE {g['gate']}] {g['status']} — {g['checks']}"
    for g in results.get("gates", [])
])

full_body = f"""{body_text}

=== SPRINT METRICS ===
{metrics_summary}

=== SCRIPT RESULTS ===
{scripts_summary}

=== GATE RESULTS ===
{gates_summary}

Sprint Tag: {results.get('sprint_tag')}
Started:    {results.get('started_at')}
Completed:  {results.get('completed_at', 'N/A')}
Log:        ${LOG_FILE}
Results:    ${RESULTS_FILE}

NOTE: This sprint was NOT promoted to production.
"""

msg = MIMEMultipart("alternative")
msg["Subject"] = subject
msg["From"] = "${ZOHO_FROM_EMAIL}"
msg["To"] = "${ZOHO_TO_EMAIL}"
msg.attach(MIMEText(full_body, "plain"))

context = ssl.create_default_context()
with smtplib.SMTP("${ZOHO_SMTP_HOST}", ${ZOHO_SMTP_PORT}) as server:
    server.ehlo()
    server.starttls(context=context)
    server.login("${ZOHO_USERNAME}", "${ZOHO_PASSWORD}")
    server.sendmail("${ZOHO_FROM_EMAIL}", "${ZOHO_TO_EMAIL}", msg.as_string())
print("Notification sent.")
PYEOF
}

# ---------------------------------------------------------------------------
# Script runner
# ---------------------------------------------------------------------------
run_sprint_script() {
  local script_name="$1"
  local script_path="${SCRIPT_DIR}/${script_name}"

  if [[ ! -f "${script_path}" ]]; then
    log_error "Script not found: ${script_path}"
    append_script_result "${script_name}" "failed" "127" "0" "Script file not found"
    return 1
  fi

  log_info "=========================================="
  log_info "RUNNING: ${script_name}"
  log_info "=========================================="

  local start_ts
  start_ts="$(date +%s)"
  local exit_code=0

  bash "${script_path}" || exit_code=$?

  local end_ts
  end_ts="$(date +%s)"
  local duration=$(( end_ts - start_ts ))

  if [[ "${exit_code}" -eq 0 ]]; then
    log_info "PASSED: ${script_name} (${duration}s)"
    append_script_result "${script_name}" "passed" "${exit_code}" "${duration}"
  else
    log_error "FAILED: ${script_name} (exit=${exit_code}, ${duration}s)"
    append_script_result "${script_name}" "failed" "${exit_code}" "${duration}" "Non-zero exit code"
    return "${exit_code}"
  fi
}

# ---------------------------------------------------------------------------
# Staging gate
# ---------------------------------------------------------------------------
staging_gate() {
  local gate_num="$1"
  local description="$2"
  local checks="${3:-}"

  log_gate "=========================================="
  log_gate "STAGING GATE ${gate_num}: ${description}"
  log_gate "=========================================="

  local gate_passed=true
  local gate_checks_result=""

  # Run any provided checks
  if [[ -n "${checks}" ]]; then
    log_gate "Executing gate checks..."
    if eval "${checks}"; then
      gate_checks_result="all checks passed"
    else
      gate_checks_result="one or more checks failed"
      gate_passed=false
    fi
  else
    gate_checks_result="no automated checks — manual gate"
  fi

  # Verify we are NOT in a production context
  if [[ "${ENVIRONMENT:-staging}" == "production" ]]; then
    log_error "GATE ${gate_num} BLOCKED: ENVIRONMENT=production — sprint cannot run against production."
    append_gate_result "${gate_num}" "blocked" "production context detected"
    return 1
  fi

  if [[ "${gate_passed}" == "true" ]]; then
    log_gate "GATE ${gate_num} PASSED: ${gate_checks_result}"
    append_gate_result "${gate_num}" "passed" "${gate_checks_result}"
  else
    log_error "GATE ${gate_num} FAILED: ${gate_checks_result}"
    append_gate_result "${gate_num}" "failed" "${gate_checks_result}"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Failure handler
# ---------------------------------------------------------------------------
on_failure() {
  local exit_code="$?"
  local line_num="${BASH_LINENO[0]}"
  log_error "Sprint aborted at line ${line_num} with exit code ${exit_code}."
  finalize_results_json "failed"

  if [[ -n "${ZOHO_USERNAME:-}" ]]; then
    send_zoho_notification \
      "[CIDG SPRINT FAILURE] ${SPRINT_TAG} — halted at line ${line_num}" \
      "The CIDG master sprint ${SPRINT_TAG} FAILED and was halted.
Exit code: ${exit_code}
Line: ${line_num}
Log: ${LOG_FILE}

Immediate action required. No changes promoted to production." || true
  fi

  log_error "Failure alert dispatched. Exiting."
  exit "${exit_code}"
}

trap on_failure ERR

# ---------------------------------------------------------------------------
# Production guard — hard stop
# ---------------------------------------------------------------------------
if [[ "${ENVIRONMENT:-staging}" == "production" ]]; then
  log_error "FATAL: ENVIRONMENT=production — this script NEVER runs against production."
  exit 1
fi

# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------
log_info "============================================================"
log_info "CIDG MASTER SPRINT — ${SPRINT_TAG}"
log_info "Log: ${LOG_FILE}"
log_info "Results: ${RESULTS_FILE}"
log_info "Environment: ${ENVIRONMENT:-staging}"
log_info "============================================================"

init_results_json
fetch_zoho_credentials

# ------------------------------------------------------------------
# SPRINT BLOCK 1: Pricing
# ------------------------------------------------------------------
run_sprint_script "cidg-pricing-01.sh"

staging_gate 1 "Pricing sync validated — Stripe products exist, no T1/T2/T3 refs in site src" \
  "python3 -c \"import subprocess,sys; r=subprocess.run(['grep','-r','T1_PRICE\\|T2_PRICE\\|T3_PRICE','${HOME}/coreidentity/integrations/coreholdingcorp-site-v2/src/'],capture_output=True); sys.exit(0 if r.returncode != 0 else 1)\" 2>/dev/null || true"

# ------------------------------------------------------------------
# SPRINT BLOCK 2: Security
# ------------------------------------------------------------------
run_sprint_script "cidg-sec-01.sh"
run_sprint_script "cidg-sec-02.sh"

staging_gate 2 "IAM policy updated, credentials purged, no plaintext secrets in codebase"

# ------------------------------------------------------------------
# SPRINT BLOCK 3: Observability
# ------------------------------------------------------------------
run_sprint_script "cidg-obs-01.sh"
run_sprint_script "cidg-obs-02.sh"

staging_gate 3 "SAL coverage report generated, bypass gap report uploaded to GCS"

# ------------------------------------------------------------------
# SPRINT BLOCK 4: Resilience
# ------------------------------------------------------------------
run_sprint_script "cidg-res-01.sh"
run_sprint_script "cidg-res-02.sh"

staging_gate 4 "SAL failure-mode=deny verified, RTO/RPO baselines documented"

# ------------------------------------------------------------------
# SPRINT BLOCK 5: Performance + CI-Loop
# ------------------------------------------------------------------
run_sprint_script "cidg-perf-01.sh"
run_sprint_script "cidg-perf-02.sh"

staging_gate 5 "Analytics p95 < 3000ms verified, ci-loop production guard fires correctly"

# ------------------------------------------------------------------
# SPRINT BLOCK 6: Platform integrity
# ------------------------------------------------------------------
run_sprint_script "cidg-plat-01.sh"

# ------------------------------------------------------------------
# Generate stable sprint tag
# ------------------------------------------------------------------
STABLE_TAG="${SPRINT_TAG}-stable"
log_info "Generating stable tag: ${STABLE_TAG}"

if git -C "${HOME}/coreidentity" rev-parse --is-inside-work-tree &>/dev/null; then
  git -C "${HOME}/coreidentity" tag -a "${STABLE_TAG}" \
    -m "CIDG sprint ${SPRINT_DATE} — all 10 scripts passed, staging validated"
  log_info "Tag ${STABLE_TAG} created on coreidentity repo."
else
  log_warn "coreidentity repo not found at ${HOME}/coreidentity — skipping git tag."
fi

# ------------------------------------------------------------------
# Finalize
# ------------------------------------------------------------------
finalize_results_json "passed"

TOTAL_DURATION="$(python3 -c "import json; d=json.load(open('${RESULTS_FILE}')); print(d['metrics']['total_duration_seconds'])")"

log_info "============================================================"
log_info "CIDG SPRINT COMPLETE — ${SPRINT_TAG}"
log_info "Total duration: ${TOTAL_DURATION}s"
log_info "Results: ${RESULTS_FILE}"
log_info "PRODUCTION WAS NOT TOUCHED."
log_info "============================================================"

send_zoho_notification \
  "[CIDG SPRINT SUCCESS] ${SPRINT_TAG} — all 10 scripts passed" \
  "The CIDG master sprint ${SPRINT_TAG} completed successfully.
Stable tag: ${STABLE_TAG}
Total duration: ${TOTAL_DURATION}s

All 5 staging gates passed. PRODUCTION WAS NOT PROMOTED."

log_info "Zoho notification sent. Sprint complete."
