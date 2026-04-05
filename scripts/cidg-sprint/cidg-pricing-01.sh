#!/usr/bin/env bash
# =============================================================================
# cidg-pricing-01.sh — Stripe Pricing Sync (CIAG Phase 0/1/2)
# Archives retired T1/T2/T3 products, creates CIAG phase products,
# stores price IDs in Secret Manager, patches site + dashboard sources.
# =============================================================================
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-project-6894307a-4c69-4e0b-9ae}"
SITE_SRC="${HOME}/coreidentity/integrations/coreholdingcorp-site-v2/src"
DASHBOARD_SRC="${HOME}/coreidentity/dashboard/src"
STRIPE_SECRET_NAME="STRIPE_LIVE_SECRET_KEY"
SM_PREFIX=""

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [PRICING-01] $*"; }

# ---------------------------------------------------------------------------
# 1. Fetch Stripe secret key from GCP Secret Manager
# ---------------------------------------------------------------------------
log "Fetching STRIPE_LIVE_SECRET_KEY from Secret Manager..."
STRIPE_LIVE_SECRET_KEY="$(gcloud secrets versions access latest \
  --secret="${STRIPE_SECRET_NAME}" \
  --project="${GCP_PROJECT}")"
export STRIPE_LIVE_SECRET_KEY
log "Stripe key loaded (sk_...${STRIPE_LIVE_SECRET_KEY: -4})."

# ---------------------------------------------------------------------------
# 2. Helper: Stripe API call
# ---------------------------------------------------------------------------
stripe_get()  { curl -s -u "${STRIPE_LIVE_SECRET_KEY}:" "$@"; }
stripe_post() { curl -s -u "${STRIPE_LIVE_SECRET_KEY}:" -X POST \
                  -H "Content-Type: application/x-www-form-urlencoded" "$@"; }

# ---------------------------------------------------------------------------
# 3. Archive retired T1/T2/T3 products and deactivate their prices
# ---------------------------------------------------------------------------
log "Scanning for retired T1/T2/T3 Stripe products to archive + price deactivation..."

PRODUCTS_JSON="$(stripe_get "https://api.stripe.com/v1/products?limit=100&active=true")"

# Defensive check: ensure the response is non-empty and looks like JSON
if [[ -z "${PRODUCTS_JSON}" ]] || \
   [[ "${PRODUCTS_JSON:0:1}" != "{" && "${PRODUCTS_JSON:0:1}" != "[" ]]; then
  log "ERROR: Stripe products API returned empty or non-JSON response."
  log "Raw response: ${PRODUCTS_JSON}"
  # Probe for HTTP status to aid debugging
  HTTP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${STRIPE_LIVE_SECRET_KEY}:" \
    "https://api.stripe.com/v1/products?limit=1&active=true")" || true
  log "Stripe API HTTP status probe: ${HTTP_STATUS}"
  exit 1
fi

echo "${PRODUCTS_JSON}" | python3 - <<'PYEOF'
import sys, json, subprocess, os

sk = os.environ['STRIPE_LIVE_SECRET_KEY']

def stripe_post(path, params):
    args = ["curl", "-sf",
            "-H", "Content-Type: application/x-www-form-urlencoded",
            "-u", f"{sk}:", "-X", "POST",
            f"https://api.stripe.com{path}"]
    for k, v in params.items():
        args += ["-d", f"{k}={v}"]
    r = subprocess.run(args, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr

def stripe_get(path):
    r = subprocess.run(
        ["curl", "-s", "-u", f"{sk}:", f"https://api.stripe.com{path}"],
        capture_output=True, text=True
    )
    raw = r.stdout.strip()
    if not raw or raw[0] not in ('{', '['):
        print(f"WARNING: stripe_get({path}) returned non-JSON (curl rc={r.returncode}): {raw!r}", file=sys.stderr)
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"WARNING: JSONDecodeError in stripe_get({path}): {e}\nRaw: {raw!r}", file=sys.stderr)
        return {}
    if "error" in parsed:
        print(f"WARNING: Stripe error in stripe_get({path}): {parsed['error']}", file=sys.stderr)
        return {}
    return parsed

raw_stdin = sys.stdin.read()
raw_stripped = raw_stdin.strip()
if not raw_stripped or raw_stripped[0] not in ('{', '['):
    print(f"ERROR: Stripe products API returned empty or non-JSON response.\nRaw: {raw_stdin!r}", file=sys.stderr)
    sys.exit(1)
try:
    data = json.loads(raw_stdin)
except json.JSONDecodeError as e:
    print(f"ERROR: JSONDecodeError parsing Stripe products response: {e}\nRaw: {raw_stdin!r}", file=sys.stderr)
    sys.exit(1)
if "error" in data:
    print(f"ERROR: Stripe API returned error: {data['error']}", file=sys.stderr)
    sys.exit(1)

products = data.get("data", [])
tier_keywords = ["T1", "T2", "T3", "Tier 1", "Tier 2", "Tier 3",
                 "tier-1", "tier-2", "tier-3", "TIER1", "TIER2", "TIER3"]

tier_products = [p for p in products if any(kw in p.get("name", "") for kw in tier_keywords)]

if not tier_products:
    print("No retired T1/T2/T3 products found — nothing to archive.")
else:
    archived_products = []
    deactivated_prices = []

    for p in tier_products:
        name = p.get("name", "")
        print(f"Processing retired product: {p['id']} — {name}")

        # Step 1: Deactivate all active prices on this product
        prices_data = stripe_get(f"/v1/prices?product={p['id']}&active=true&limit=100")
        for price in prices_data.get("data", []):
            price_id = price["id"]
            rc, out, err = stripe_post(f"/v1/prices/{price_id}", {"active": "false"})
            if rc == 0:
                deactivated_prices.append(price_id)
                print(f"  -> Deactivated price: {price_id}")
            else:
                print(f"  -> WARNING: failed to deactivate price {price_id}: {err}", file=sys.stderr)

        # Step 2: Archive the product (set active=false)
        rc, out, err = stripe_post(f"/v1/products/{p['id']}", {"active": "false"})
        if rc == 0:
            archived_products.append(p["id"])
            print(f"  -> Archived product: {p['id']}")
        else:
            print(f"  -> WARNING: failed to archive product {p['id']}: {err}", file=sys.stderr)

    print(f"Archived {len(archived_products)} retired tier products, deactivated {len(deactivated_prices)} prices.")
PYEOF

log "Tier product archival and price deactivation complete."

# ---------------------------------------------------------------------------
# 4. Create CIAG Phase products and prices
# ---------------------------------------------------------------------------
log "Creating CIAG Phase 0, 1, 2 products..."

# Helper: create-or-version a GCP Secret Manager secret (flat namespace, no prefix)
sm_store() {
  local secret_name="$1"
  local value="$2"
  echo -n "${value}" | gcloud secrets create "${secret_name}" \
    --data-file=- \
    --project="${GCP_PROJECT}" \
    --replication-policy="automatic" 2>/dev/null || \
  echo -n "${value}" | gcloud secrets versions add "${secret_name}" \
    --data-file=- \
    --project="${GCP_PROJECT}"
}

create_product_with_price() {
  local product_name="$1"
  local floor_cents="$2"
  local ceiling_cents="$3"

  # Create product
  local product_response
  product_response="$(stripe_post "https://api.stripe.com/v1/products" \
    --data-urlencode "name=${product_name}" \
    -d "type=service" \
    -d "metadata[sprint]=cidg" \
    -d "metadata[floor_cents]=${floor_cents}" \
    -d "metadata[ceiling_cents]=${ceiling_cents}")"

  local product_id
  product_id="$(echo "${product_response}" | python3 - <<'_PY'
import sys, json
raw = sys.stdin.read()
raw_stripped = raw.strip()
if not raw_stripped or raw_stripped[0] not in ('{', '['):
    print(f"ERROR: Stripe create-product returned empty or non-JSON.\nRaw: {raw!r}", file=sys.stderr)
    sys.exit(1)
try:
    print(json.loads(raw)['id'])
except (json.JSONDecodeError, KeyError) as e:
    print(f"ERROR: Failed to parse product response: {e}\nRaw: {raw!r}", file=sys.stderr)
    sys.exit(1)
_PY
)"
  log "  Created product: ${product_id} — ${product_name}"

  # Create price at floor amount (one-time, manual collection for enterprise)
  local price_response
  price_response="$(stripe_post "https://api.stripe.com/v1/prices" \
    -d "product=${product_id}" \
    -d "unit_amount=${floor_cents}" \
    -d "currency=usd" \
    -d "billing_scheme=per_unit" \
    -d "metadata[floor_cents]=${floor_cents}" \
    -d "metadata[ceiling_cents]=${ceiling_cents}" \
    -d "metadata[sprint]=cidg")"

  local price_id
  price_id="$(echo "${price_response}" | python3 - <<'_PY'
import sys, json
raw = sys.stdin.read()
raw_stripped = raw.strip()
if not raw_stripped or raw_stripped[0] not in ('{', '['):
    print(f"ERROR: Stripe create-price returned empty or non-JSON.\nRaw: {raw!r}", file=sys.stderr)
    sys.exit(1)
try:
    print(json.loads(raw)['id'])
except (json.JSONDecodeError, KeyError) as e:
    print(f"ERROR: Failed to parse price response: {e}\nRaw: {raw!r}", file=sys.stderr)
    sys.exit(1)
_PY
)"
  log "  Created price: ${price_id} (floor: \$$(( floor_cents / 100 )))"

  echo "${price_id}"
}

PHASE0_PRICE_ID="$(create_product_with_price \
  "CIAG Phase 0 — Governance Diagnostic" \
  7500000 15000000)"

PHASE1_PRICE_ID="$(create_product_with_price \
  "CIAG Phase 1 — Remediation Blueprint" \
  15000000 30000000)"

PHASE2_PRICE_ID="$(create_product_with_price \
  "CIAG Phase 2 — Guided Implementation" \
  25000000 50000000)"

log "All CIAG phase products and prices created."
log "  PHASE0: ${PHASE0_PRICE_ID}"
log "  PHASE1: ${PHASE1_PRICE_ID}"
log "  PHASE2: ${PHASE2_PRICE_ID}"

# ---------------------------------------------------------------------------
# 4a. Store price IDs in Secret Manager — new canonical names + legacy aliases
# ---------------------------------------------------------------------------
log "Storing price IDs in Secret Manager (new names + legacy aliases)..."

# Phase 0 — new canonical + legacy T1 alias
log "  Storing STRIPE_LIVE_PHASE0_PRICE_ID..."
sm_store "STRIPE_LIVE_PHASE0_PRICE_ID" "${PHASE0_PRICE_ID}"
log "  Storing STRIPE_LIVE_T1_PRICE_ID (legacy alias → Phase 0)..."
sm_store "STRIPE_LIVE_T1_PRICE_ID" "${PHASE0_PRICE_ID}"

# Phase 1 — new canonical + legacy T2 alias
log "  Storing STRIPE_LIVE_PHASE1_PRICE_ID..."
sm_store "STRIPE_LIVE_PHASE1_PRICE_ID" "${PHASE1_PRICE_ID}"
log "  Storing STRIPE_LIVE_T2_PRICE_ID (legacy alias → Phase 1)..."
sm_store "STRIPE_LIVE_T2_PRICE_ID" "${PHASE1_PRICE_ID}"

# Phase 2 — new canonical + legacy T3 alias
log "  Storing STRIPE_LIVE_PHASE2_PRICE_ID..."
sm_store "STRIPE_LIVE_PHASE2_PRICE_ID" "${PHASE2_PRICE_ID}"
log "  Storing STRIPE_LIVE_T3_PRICE_ID (legacy alias → Phase 2)..."
sm_store "STRIPE_LIVE_T3_PRICE_ID" "${PHASE2_PRICE_ID}"

log "All price IDs stored. Legacy code referencing STRIPE_LIVE_T1/T2/T3_PRICE_ID will now receive new CIAG phase prices."

# ---------------------------------------------------------------------------
# 5. Patch site source — replace T1/T2/T3 references
# ---------------------------------------------------------------------------
patch_source_directory() {
  local src_dir="$1"
  local label="$2"

  if [[ ! -d "${src_dir}" ]]; then
    log "WARNING: Source directory not found: ${src_dir} — skipping ${label} patch."
    return 0
  fi

  log "Patching ${label} source at ${src_dir}..."

  python3 - <<PYEOF
import os, re, glob

src_dir = "${src_dir}"
phase0_id = "${PHASE0_PRICE_ID}"
phase1_id = "${PHASE1_PRICE_ID}"
phase2_id = "${PHASE2_PRICE_ID}"

replacements = [
    # Price ID references
    (r'T1_PRICE_ID',   'CIAG_PHASE0_PRICE_ID'),
    (r'T2_PRICE_ID',   'CIAG_PHASE1_PRICE_ID'),
    (r'T3_PRICE_ID',   'CIAG_PHASE2_PRICE_ID'),
    # Tier label references
    (r'\bT1\b(?!\w)',  'CIAG Phase 0'),
    (r'\bT2\b(?!\w)',  'CIAG Phase 1'),
    (r'\bT3\b(?!\w)',  'CIAG Phase 2'),
    # Tier name strings
    (r'Tier\s+1',      'CIAG Phase 0 — Governance Diagnostic'),
    (r'Tier\s+2',      'CIAG Phase 1 — Remediation Blueprint'),
    (r'Tier\s+3',      'CIAG Phase 2 — Guided Implementation'),
    # Env var placeholder values
    (r'tier[_-]?1',    'ciag-phase-0'),
    (r'tier[_-]?2',    'ciag-phase-1'),
    (r'tier[_-]?3',    'ciag-phase-2'),
]

extensions = {'.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.md', '.html'}
patched_files = []
skipped_files = []

for root, dirs, files in os.walk(src_dir):
    # Skip node_modules, .git, dist, build
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'dist', 'build', '.next')]
    for fname in files:
        fpath = os.path.join(root, fname)
        _, ext = os.path.splitext(fname)
        if ext not in extensions:
            continue
        try:
            with open(fpath, 'r', encoding='utf-8', errors='replace') as fh:
                original = fh.read()
        except Exception as e:
            skipped_files.append((fpath, str(e)))
            continue

        modified = original
        for pattern, replacement in replacements:
            modified = re.sub(pattern, replacement, modified)

        if modified != original:
            with open(fpath, 'w', encoding='utf-8') as fh:
                fh.write(modified)
            patched_files.append(fpath)

print(f"  Patched {len(patched_files)} files in ${label}:")
for fp in patched_files:
    print(f"    {fp}")
if skipped_files:
    print(f"  Skipped {len(skipped_files)} files (read errors).")
PYEOF
}

patch_source_directory "${SITE_SRC}"    "coreholdingcorp-site-v2"
patch_source_directory "${DASHBOARD_SRC}" "dashboard"

# ---------------------------------------------------------------------------
# 6. Commit and push website changes
# ---------------------------------------------------------------------------
commit_and_push() {
  local repo_dir="$1"
  local repo_label="$2"

  if [[ ! -d "${repo_dir}/.git" ]]; then
    log "WARNING: ${repo_dir} is not a git repo — skipping commit for ${repo_label}."
    return 0
  fi

  cd "${repo_dir}"
  local changed
  changed="$(git status --porcelain | wc -l | tr -d ' ')"

  if [[ "${changed}" -eq 0 ]]; then
    log "No changes in ${repo_label} — nothing to commit."
    cd - > /dev/null
    return 0
  fi

  git add -A
  git commit -m "feat(pricing): replace T1/T2/T3 with CIAG Phase 0/1/2 product references

Sprint: cidg-pricing-01
Phase0 price: ${PHASE0_PRICE_ID}
Phase1 price: ${PHASE1_PRICE_ID}
Phase2 price: ${PHASE2_PRICE_ID}"

  git push origin "$(git branch --show-current)"
  log "Committed and pushed ${repo_label} changes."
  cd - > /dev/null
}

SITE_REPO_ROOT="$(dirname "${SITE_SRC}")"
commit_and_push "${SITE_REPO_ROOT}" "coreholdingcorp-site-v2"

# ---------------------------------------------------------------------------
# 7. npm run build
# ---------------------------------------------------------------------------
log "Running npm run build for site..."
if [[ -f "${SITE_REPO_ROOT}/package.json" ]]; then
  cd "${SITE_REPO_ROOT}"
  npm run build
  cd - > /dev/null
  log "Site build complete."
else
  log "WARNING: package.json not found at ${SITE_REPO_ROOT} — skipping build."
fi

log "cidg-pricing-01.sh COMPLETE."
