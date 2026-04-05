#!/usr/bin/env bash
# =============================================================================
# cidg-sec-02.sh — Credential Purge
# Scans all repos under ~/coreidentity for plaintext credential patterns,
# extracts hardcoded COREIDENTITY_API_PASSWORD from swap-ecs-image.py,
# stores it in GCP Secret Manager, patches the file to fetch at runtime,
# hardens .gitignore, commits and pushes.
# =============================================================================
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-coreidentity-prod}"
COREIDENTITY_ROOT="${HOME}/coreidentity"
SECRET_NAME="cidg/coreidentity-api-password"
SITE_ROOT="${HOME}/coreidentity/integrations/coreholdingcorp-site-v2"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [SEC-02] $*"; }

# ---------------------------------------------------------------------------
# Credential patterns to scan for
# ---------------------------------------------------------------------------
CREDENTIAL_PATTERNS=(
  'COREIDENTITY_API_PASSWORD\s*=\s*["\x27][^"\x27]{8,}'
  'API_KEY\s*=\s*["\x27][A-Za-z0-9+/]{20,}'
  'SECRET_KEY\s*=\s*["\x27][A-Za-z0-9+/]{20,}'
  'AWS_SECRET_ACCESS_KEY\s*=\s*["\x27][A-Za-z0-9+/]{40}'
  'stripe_secret\s*=\s*["\x27]sk_(live|test)_'
  'password\s*=\s*["\x27][^"\x27]{8,}["\x27]'
  'GITHUB_TOKEN\s*=\s*["\x27]gh[ps]_[A-Za-z0-9]{36,}'
  'SENDGRID_API_KEY\s*=\s*["\x27]SG\.'
  'TWILIO_AUTH_TOKEN\s*=\s*["\x27][a-f0-9]{32}'
)

# File extensions to scan
SCAN_EXTENSIONS=("py" "js" "ts" "jsx" "tsx" "sh" "env" "yaml" "yml" "json" "rb" "go")

# ---------------------------------------------------------------------------
# 1. Scan all repos for plaintext credentials
# ---------------------------------------------------------------------------
log "Scanning ${COREIDENTITY_ROOT} for plaintext credential patterns..."

FINDINGS_FILE="/tmp/cidg-sec-02-findings-$(date +%s).json"
echo "[]" > "${FINDINGS_FILE}"

python3 - <<PYEOF
import os, re, json, sys

root = "${COREIDENTITY_ROOT}"
extensions = ${SCAN_EXTENSIONS[@]@Q}
findings = []

patterns = [
    (r'COREIDENTITY_API_PASSWORD\s*=\s*["\x27][^"\x27]{8,}', 'COREIDENTITY_API_PASSWORD'),
    (r'API_KEY\s*=\s*["\x27][A-Za-z0-9+/]{20,}', 'API_KEY'),
    (r'SECRET_KEY\s*=\s*["\x27][A-Za-z0-9+/]{20,}', 'SECRET_KEY'),
    (r'AWS_SECRET_ACCESS_KEY\s*=\s*["\x27][A-Za-z0-9+/]{40}', 'AWS_SECRET_ACCESS_KEY'),
    (r'stripe_secret\s*=\s*["\x27]sk_(live|test)_', 'STRIPE_SECRET'),
    (r'(?i)password\s*=\s*["\x27][^"\x27\s]{8,}["\x27]', 'PASSWORD'),
    (r'GITHUB_TOKEN\s*=\s*["\x27]gh[ps]_[A-Za-z0-9]{36,}', 'GITHUB_TOKEN'),
    (r'SENDGRID_API_KEY\s*=\s*["\x27]SG\.', 'SENDGRID_API_KEY'),
]

ext_set = {'.py', '.js', '.ts', '.jsx', '.tsx', '.sh', '.env',
           '.yaml', '.yml', '.json', '.rb', '.go', '.tf', '.tfvars'}
skip_dirs = {'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
             'venv', '.venv', '.tox', 'vendor'}

for dirpath, dirs, files in os.walk(root):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for fname in files:
        _, ext = os.path.splitext(fname)
        if ext not in ext_set and fname not in {'.env', '.envrc'}:
            continue
        fpath = os.path.join(dirpath, fname)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='replace') as fh:
                lines = fh.readlines()
        except Exception:
            continue
        for lineno, line in enumerate(lines, 1):
            for pattern, label in patterns:
                if re.search(pattern, line):
                    # Redact the actual value in the finding
                    redacted = re.sub(
                        r'(["\x27])([^"\x27]{4})[^"\x27]+([^"\x27]{4}["\x27])',
                        r'\1\2...\3',
                        line.strip()
                    )
                    findings.append({
                        "file": fpath,
                        "line": lineno,
                        "pattern": label,
                        "snippet": redacted[:120]
                    })

with open("${FINDINGS_FILE}", "w") as f:
    json.dump(findings, f, indent=2)

print(f"Scan complete: {len(findings)} potential credential exposures found.")
for finding in findings[:20]:
    print(f"  [{finding['pattern']}] {finding['file']}:{finding['line']}")
if len(findings) > 20:
    print(f"  ... and {len(findings) - 20} more (see {repr('${FINDINGS_FILE}')})")
PYEOF

log "Scan complete. Results: ${FINDINGS_FILE}"

# ---------------------------------------------------------------------------
# 2. Locate swap-ecs-image.py and extract hardcoded COREIDENTITY_API_PASSWORD
# ---------------------------------------------------------------------------
log "Searching for swap-ecs-image.py..."
SWAP_SCRIPT=""
while IFS= read -r -d $'\0' f; do
  SWAP_SCRIPT="${f}"
  break
done < <(find "${COREIDENTITY_ROOT}" -name "swap-ecs-image.py" -not -path "*/node_modules/*" -print0 2>/dev/null)

if [[ -z "${SWAP_SCRIPT}" ]]; then
  log "WARNING: swap-ecs-image.py not found under ${COREIDENTITY_ROOT}."
  SWAP_SCRIPT=""
else
  log "Found: ${SWAP_SCRIPT}"
fi

if [[ -n "${SWAP_SCRIPT}" ]]; then
  # Extract the hardcoded password value
  log "Extracting hardcoded COREIDENTITY_API_PASSWORD..."
  EXTRACTED_PASSWORD="$(python3 - <<PYEOF
import re, sys

with open("${SWAP_SCRIPT}", "r") as f:
    content = f.read()

# Multiple patterns to catch common assignment forms
patterns = [
    r'COREIDENTITY_API_PASSWORD\s*=\s*["\x27]([^"\x27]+)["\x27]',
    r'api_password\s*=\s*["\x27]([^"\x27]+)["\x27]',
    r'password\s*=\s*["\x27]([^"\x27]{8,})["\x27]',
    r'COREIDENTITY_API_PASSWORD\s*=\s*os\.environ\.get\(["\x27][^"\']+["\x27],\s*["\x27]([^"\x27]+)["\x27]\)',
]

for pattern in patterns:
    m = re.search(pattern, content, re.IGNORECASE)
    if m:
        print(m.group(1))
        sys.exit(0)

# Not found
print("")
PYEOF
)"

  if [[ -n "${EXTRACTED_PASSWORD}" ]]; then
    log "Extracted hardcoded password (${#EXTRACTED_PASSWORD} chars). Storing in Secret Manager..."

    echo -n "${EXTRACTED_PASSWORD}" | \
      gcloud secrets create "${SECRET_NAME}" \
        --data-file=- \
        --project="${GCP_PROJECT}" \
        --replication-policy="automatic" 2>/dev/null || \
    echo -n "${EXTRACTED_PASSWORD}" | \
      gcloud secrets versions add "${SECRET_NAME}" \
        --data-file=- \
        --project="${GCP_PROJECT}"

    log "Password stored at: projects/${GCP_PROJECT}/secrets/${SECRET_NAME}"

    # Patch swap-ecs-image.py to fetch from Secret Manager at runtime
    log "Patching swap-ecs-image.py to fetch COREIDENTITY_API_PASSWORD from Secret Manager..."

    python3 - <<PYEOF
import re

with open("${SWAP_SCRIPT}", "r") as f:
    content = f.read()

# Inject gcloud import helper if not present
gcloud_fetch_func = '''
import subprocess as _subprocess
import json as _json

def _get_secret_manager_value(secret_name: str, project: str = "${GCP_PROJECT}") -> str:
    """Fetch a secret value from GCP Secret Manager via gcloud CLI."""
    result = _subprocess.run(
        ["gcloud", "secrets", "versions", "access", "latest",
         "--secret", secret_name,
         "--project", project],
        capture_output=True, text=True, check=True
    )
    return result.stdout.strip()

'''

# Replace hardcoded password assignments
patterns_to_replace = [
    (r'(COREIDENTITY_API_PASSWORD\s*=\s*)["\x27][^"\x27]+["\x27]',
     r'\g<1>_get_secret_manager_value("${SECRET_NAME}")'),
    (r'(api_password\s*=\s*)["\x27][^"\x27]+["\x27]',
     r'\g<1>_get_secret_manager_value("${SECRET_NAME}")'),
]

modified = content

# Add helper function after last import block
import_block_end = 0
for i, line in enumerate(content.split("\n")):
    if line.startswith("import ") or line.startswith("from "):
        import_block_end = i

if "def _get_secret_manager_value" not in content:
    lines = content.split("\n")
    lines.insert(import_block_end + 1, gcloud_fetch_func)
    modified = "\n".join(lines)

for pattern, replacement in patterns_to_replace:
    modified = re.sub(pattern, replacement, modified, flags=re.IGNORECASE)

with open("${SWAP_SCRIPT}", "w") as f:
    f.write(modified)

print("swap-ecs-image.py patched successfully.")
PYEOF
    log "swap-ecs-image.py patched."
  else
    log "No hardcoded COREIDENTITY_API_PASSWORD found in swap-ecs-image.py — skipping patch."
  fi
fi

# ---------------------------------------------------------------------------
# 3. Harden .gitignore files across all repos
# ---------------------------------------------------------------------------
log "Hardening .gitignore files..."

GITIGNORE_ENTRIES=(
  "# Credential and secret files (CIDG hardened)"
  ".env"
  ".env.local"
  ".env.development"
  ".env.development.local"
  ".env.test"
  ".env.test.local"
  ".env.production"
  ".env.production.local"
  ".env.staging"
  ".env.staging.local"
  ".env.*.local"
  "*.pem"
  "*.key"
  "*.p12"
  "*.pfx"
  "secrets.json"
  "secrets.yaml"
  "secrets.yml"
  "service-account*.json"
  "gcp-credentials*.json"
  "*-credentials.json"
  "credentials.json"
  ".aws/credentials"
  ".netrc"
)

find "${COREIDENTITY_ROOT}" -name ".gitignore" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" 2>/dev/null | while read -r gitignore_file; do

  CURRENT_CONTENT="$(cat "${gitignore_file}" 2>/dev/null || echo "")"
  ADDED=false

  for entry in "${GITIGNORE_ENTRIES[@]}"; do
    if ! grep -qxF "${entry}" "${gitignore_file}" 2>/dev/null; then
      echo "${entry}" >> "${gitignore_file}"
      ADDED=true
    fi
  done

  if [[ "${ADDED}" == "true" ]]; then
    log "  Hardened: ${gitignore_file}"
  fi
done

# Create .gitignore in root if missing
if [[ ! -f "${COREIDENTITY_ROOT}/.gitignore" ]]; then
  log "Creating root .gitignore..."
  printf '%s\n' "${GITIGNORE_ENTRIES[@]}" > "${COREIDENTITY_ROOT}/.gitignore"
fi

# ---------------------------------------------------------------------------
# 4. Commit and push changes per repo
# ---------------------------------------------------------------------------
log "Committing and pushing changes..."

commit_repo() {
  local repo_dir="$1"
  if [[ ! -d "${repo_dir}/.git" ]]; then
    return 0
  fi
  cd "${repo_dir}"
  local changed
  changed="$(git status --porcelain | wc -l | tr -d ' ')"
  if [[ "${changed}" -gt 0 ]]; then
    git add -A
    git commit -m "security(sec-02): credential purge — move hardcoded secrets to Secret Manager, harden .gitignore

- Extracted COREIDENTITY_API_PASSWORD to GCP Secret Manager (${SECRET_NAME})
- Patched swap-ecs-image.py to fetch at runtime via gcloud CLI
- Hardened .gitignore for .env variants and credential file patterns
Sprint: cidg-sec-02"
    git push origin "$(git branch --show-current)"
    log "  Committed and pushed: ${repo_dir}"
  fi
  cd - > /dev/null
}

# Commit each git repo found under coreidentity root
while IFS= read -r -d $'\0' git_dir; do
  repo_dir="$(dirname "${git_dir}")"
  commit_repo "${repo_dir}"
done < <(find "${COREIDENTITY_ROOT}" -maxdepth 3 -name ".git" -type d -print0 2>/dev/null)

# ---------------------------------------------------------------------------
# 5. npm run build
# ---------------------------------------------------------------------------
log "Running npm run build..."
if [[ -f "${SITE_ROOT}/package.json" ]]; then
  cd "${SITE_ROOT}"
  npm run build
  cd - > /dev/null
  log "Build complete."
else
  log "WARNING: package.json not found at ${SITE_ROOT} — skipping build."
fi

# Print summary
log "Findings report saved to: ${FINDINGS_FILE}"
FINDING_COUNT="$(python3 -c "import json; d=json.load(open('${FINDINGS_FILE}')); print(len(d))")"
log "Total credential exposure findings: ${FINDING_COUNT}"

log "cidg-sec-02.sh COMPLETE."
