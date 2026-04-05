#!/usr/bin/env bash
# =============================================================================
# cidg-sec-01.sh — IAM Least-Privilege for github-actions-deploy
# Replaces AdministratorAccess with scoped CoreIdentityDeployLeastPrivilege,
# rotates access keys, pushes new secrets to GitHub Actions via PyNaCl.
# =============================================================================
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-project-6894307a-4c69-4e0b-9ae}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
IAM_USER="${IAM_USER:-github-actions-deploy}"
POLICY_NAME="CoreIdentityDeployLeastPrivilege"
GITHUB_OWNER="${GITHUB_OWNER:-IMG2025}"
GITHUB_REPO="${GITHUB_REPO:-coreidentity-platform}"
GITHUB_TOKEN_SECRET="GITHUB_TOKEN"
SM_AWS_KEY_SECRET="cidg-aws-deploy-credentials"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [SEC-01] $*"; }

# ---------------------------------------------------------------------------
# 1. Fetch GitHub token from Secret Manager
# ---------------------------------------------------------------------------
log "Fetching GitHub token from Secret Manager..."
GITHUB_TOKEN="$(gcloud secrets versions access latest \
  --secret="${GITHUB_TOKEN_SECRET}" \
  --project="${GCP_PROJECT}")"
log "GitHub token loaded."

# ---------------------------------------------------------------------------
# 2. Query current policies on github-actions-deploy
# ---------------------------------------------------------------------------
log "Querying current attached policies for IAM user: ${IAM_USER}..."
ATTACHED_POLICIES="$(aws iam list-attached-user-policies \
  --user-name "${IAM_USER}" \
  --output json)"
log "Current attached policies:"
echo "${ATTACHED_POLICIES}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for p in d.get('AttachedPolicies', []):
    print(f\"  {p['PolicyName']} ({p['PolicyArn']})\")
"

# ---------------------------------------------------------------------------
# 3. Construct least-privilege policy document
# ---------------------------------------------------------------------------
log "Constructing least-privilege policy document..."

POLICY_DOCUMENT="$(cat <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages"
      ],
      "Resource": [
        "arn:aws:ecr:*:${AWS_ACCOUNT_ID}:repository/coreidentity-*",
        "arn:aws:ecr:*:${AWS_ACCOUNT_ID}:repository/ais-*"
      ]
    },
    {
      "Sid": "ECRAuthToken",
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Sid": "ECSAccess",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecs:RunTask",
        "ecs:StopTask",
        "ecs:CreateService",
        "ecs:DeleteService",
        "ecs:ListServices",
        "ecs:ListTaskDefinitions",
        "ecs:DeregisterTaskDefinition"
      ],
      "Resource": [
        "arn:aws:ecs:*:${AWS_ACCOUNT_ID}:cluster/coreidentity-*",
        "arn:aws:ecs:*:${AWS_ACCOUNT_ID}:cluster/ais-*",
        "arn:aws:ecs:*:${AWS_ACCOUNT_ID}:service/coreidentity-*",
        "arn:aws:ecs:*:${AWS_ACCOUNT_ID}:service/ais-*",
        "arn:aws:ecs:*:${AWS_ACCOUNT_ID}:task-definition/coreidentity-*",
        "arn:aws:ecs:*:${AWS_ACCOUNT_ID}:task-definition/ais-*",
        "arn:aws:ecs:*:${AWS_ACCOUNT_ID}:task/*"
      ]
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:${AWS_ACCOUNT_ID}:secret:coreidentity/*",
        "arn:aws:secretsmanager:*:${AWS_ACCOUNT_ID}:secret:ais/*",
        "arn:aws:secretsmanager:*:${AWS_ACCOUNT_ID}:secret:cidg/*"
      ]
    },
    {
      "Sid": "DynamoDBTableAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:DescribeTable",
        "dynamodb:ListTables"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:${AWS_ACCOUNT_ID}:table/coreidentity-*",
        "arn:aws:dynamodb:*:${AWS_ACCOUNT_ID}:table/ais-*",
        "arn:aws:dynamodb:*:${AWS_ACCOUNT_ID}:table/coreidentity-*/index/*",
        "arn:aws:dynamodb:*:${AWS_ACCOUNT_ID}:table/ais-*/index/*"
      ]
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      "Resource": [
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/coreidentity-*",
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ais-*",
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole"
      ]
    },
    {
      "Sid": "CloudWatchAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:DescribeAlarms"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ALBReadAccess",
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeListeners",
        "elasticloadbalancing:DescribeRules",
        "elasticloadbalancing:DescribeTargetGroups",
        "elasticloadbalancing:DescribeTargetHealth"
      ],
      "Resource": "*"
    }
  ]
}
POLICY
)"

# ---------------------------------------------------------------------------
# 4. Create or version the policy
# ---------------------------------------------------------------------------
log "Creating/versioning IAM policy: ${POLICY_NAME}..."

POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}"

# Try to get existing policy
EXISTING_POLICY="$(aws iam get-policy --policy-arn "${POLICY_ARN}" --output json 2>/dev/null || echo "null")"

if [[ "${EXISTING_POLICY}" == "null" ]]; then
  log "Policy does not exist — creating..."
  aws iam create-policy \
    --policy-name "${POLICY_NAME}" \
    --policy-document "${POLICY_DOCUMENT}" \
    --description "Least-privilege deploy policy for github-actions-deploy (CIDG sprint)"
  log "Policy created: ${POLICY_ARN}"
else
  log "Policy exists — creating new version..."
  # AWS allows max 5 versions; delete oldest non-default if needed
  VERSIONS="$(aws iam list-policy-versions --policy-arn "${POLICY_ARN}" --output json)"
  VERSION_COUNT="$(echo "${VERSIONS}" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['Versions']))")"

  if [[ "${VERSION_COUNT}" -ge 5 ]]; then
    OLDEST_NON_DEFAULT="$(echo "${VERSIONS}" | python3 -c "
import sys, json
versions = json.load(sys.stdin)['Versions']
non_default = [v for v in versions if not v['IsDefaultVersion']]
non_default.sort(key=lambda v: v['CreateDate'])
print(non_default[0]['VersionId'])
")"
    log "Deleting oldest policy version: ${OLDEST_NON_DEFAULT}..."
    aws iam delete-policy-version \
      --policy-arn "${POLICY_ARN}" \
      --version-id "${OLDEST_NON_DEFAULT}"
  fi

  aws iam create-policy-version \
    --policy-arn "${POLICY_ARN}" \
    --policy-document "${POLICY_DOCUMENT}" \
    --set-as-default
  log "New policy version set as default."
fi

# ---------------------------------------------------------------------------
# 5. Detach AdministratorAccess, attach new policy
# ---------------------------------------------------------------------------
ADMIN_ARN="arn:aws:iam::aws:policy/AdministratorAccess"

ADMIN_ATTACHED="$(aws iam list-attached-user-policies \
  --user-name "${IAM_USER}" --output json | \
  python3 -c "import sys,json; arns=[p['PolicyArn'] for p in json.load(sys.stdin)['AttachedPolicies']]; print('yes' if '${ADMIN_ARN}' in arns else 'no')")"

if [[ "${ADMIN_ATTACHED}" == "yes" ]]; then
  log "Detaching AdministratorAccess from ${IAM_USER}..."
  aws iam detach-user-policy \
    --user-name "${IAM_USER}" \
    --policy-arn "${ADMIN_ARN}"
  log "AdministratorAccess detached."
else
  log "AdministratorAccess not attached — skipping detach."
fi

log "Attaching ${POLICY_NAME} to ${IAM_USER}..."
aws iam attach-user-policy \
  --user-name "${IAM_USER}" \
  --policy-arn "${POLICY_ARN}"
log "Least-privilege policy attached."

# ---------------------------------------------------------------------------
# 6. Rotate access keys — delete old first (AWS max=2), then create new
# ---------------------------------------------------------------------------
log "Listing existing access keys for ${IAM_USER}..."
OLD_KEYS="$(aws iam list-access-keys --user-name "${IAM_USER}" --output json)"
OLD_KEY_IDS="$(echo "${OLD_KEYS}" | python3 -c "
import sys, json
keys = json.load(sys.stdin)['AccessKeyMetadata']
print('\n'.join(k['AccessKeyId'] for k in keys))
")"

# Delete all existing keys BEFORE creating — AWS hard limit is 2 per user.
# Re-running this script on the same user would hit LimitExceeded otherwise.
if [[ -n "${OLD_KEY_IDS}" ]]; then
  log "Deleting existing access keys before rotation (AWS limit: 2/user)..."
  while IFS= read -r old_key_id; do
    if [[ -n "${old_key_id}" ]]; then
      aws iam delete-access-key \
        --user-name "${IAM_USER}" \
        --access-key-id "${old_key_id}"
      log "  Deleted old key: ${old_key_id}"
    fi
  done <<< "${OLD_KEY_IDS}"
fi

log "Creating new access key..."
NEW_KEY_RESPONSE="$(aws iam create-access-key --user-name "${IAM_USER}" --output json)"
NEW_ACCESS_KEY_ID="$(echo "${NEW_KEY_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin)['AccessKey']['AccessKeyId'])")"
NEW_SECRET_ACCESS_KEY="$(echo "${NEW_KEY_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin)['AccessKey']['SecretAccessKey'])")"
log "New access key created: ${NEW_ACCESS_KEY_ID}"

# ---------------------------------------------------------------------------
# 7. Push new credentials to GitHub Actions secrets via PyNaCl
# ---------------------------------------------------------------------------
log "Pushing new credentials to GitHub Actions secrets..."
log "Ensuring pynacl is installed..."
pip3 install pynacl --quiet 2>&1 | tail -3 || true

python3 - <<PYEOF
import base64, json, sys
import urllib.request, urllib.error
from nacl import encoding, public

github_token = "${GITHUB_TOKEN}"
owner = "${GITHUB_OWNER}"
repo = "${GITHUB_REPO}"
new_key_id = "${NEW_ACCESS_KEY_ID}"
new_secret = "${NEW_SECRET_ACCESS_KEY}"

headers = {
    "Authorization": f"token {github_token}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
}

def gh_api(method, path, data=None):
    url = f"https://api.github.com{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# Get repo public key for secret encryption
pub_key_data = gh_api("GET", f"/repos/{owner}/{repo}/actions/secrets/public-key")
pub_key_id = pub_key_data["key_id"]
pub_key_b64 = pub_key_data["key"]

def encrypt_secret(public_key_b64: str, secret_value: str) -> str:
    pub_key_bytes = base64.b64decode(public_key_b64)
    sealed_box = public.SealedBox(public.PublicKey(pub_key_bytes))
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

secrets_to_set = {
    "AWS_ACCESS_KEY_ID": new_key_id,
    "AWS_SECRET_ACCESS_KEY": new_secret,
}

for secret_name, secret_value in secrets_to_set.items():
    encrypted_value = encrypt_secret(pub_key_b64, secret_value)
    payload = {"encrypted_value": encrypted_value, "key_id": pub_key_id}
    try:
        gh_api("PUT", f"/repos/{owner}/{repo}/actions/secrets/{secret_name}", payload)
        print(f"  Secret {secret_name} set successfully.")
    except Exception as e:
        print(f"  ERROR setting {secret_name}: {e}", file=sys.stderr)
        sys.exit(1)

print("GitHub Actions secrets updated.")
PYEOF

log "GitHub secrets updated."

# Also store in GCP Secret Manager as backup
log "Storing new credentials in GCP Secret Manager..."
printf '{"access_key_id":"%s","secret_access_key":"%s"}' \
  "${NEW_ACCESS_KEY_ID}" "${NEW_SECRET_ACCESS_KEY}" | \
  gcloud secrets create "${SM_AWS_KEY_SECRET}" \
    --data-file=- \
    --project="${GCP_PROJECT}" \
    --replication-policy="automatic" 2>/dev/null || \
printf '{"access_key_id":"%s","secret_access_key":"%s"}' \
  "${NEW_ACCESS_KEY_ID}" "${NEW_SECRET_ACCESS_KEY}" | \
  gcloud secrets versions add "${SM_AWS_KEY_SECRET}" \
    --data-file=- \
    --project="${GCP_PROJECT}"
log "Credentials stored in Secret Manager."

# ---------------------------------------------------------------------------
# 9. Validate new credentials with STS
# ---------------------------------------------------------------------------
log "Validating new credentials with STS..."
AWS_ACCESS_KEY_ID="${NEW_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${NEW_SECRET_ACCESS_KEY}" \
  aws sts get-caller-identity --output json

log "STS validation passed — new credentials are functional."

# ---------------------------------------------------------------------------
# 10. npm run build
# ---------------------------------------------------------------------------
SITE_ROOT="${HOME}/coreidentity/integrations/coreholdingcorp-site-v2"
log "Running npm run build..."
if [[ -f "${SITE_ROOT}/package.json" ]]; then
  cd "${SITE_ROOT}"
  npm run build
  cd - > /dev/null
  log "Build complete."
else
  log "WARNING: package.json not found at ${SITE_ROOT} — skipping build."
fi

log "cidg-sec-01.sh COMPLETE."
