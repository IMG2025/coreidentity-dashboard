#!/usr/bin/env python3
"""
swap-ecs-image.py — drops in as replacement for original, now also merges env vars.
Usage: python3 scripts/swap-ecs-image.py <new-image>
"""
import json, sys

new_image = sys.argv[1]

with open('/tmp/current-taskdef.json') as f:
    td = json.load(f)

# Strip read-only fields
for k in ['taskDefinitionArn','revision','status','requiresAttributes',
          'compatibilities','registeredAt','registeredBy','deregisteredAt']:
    td.pop(k, None)

# Persistent env vars — single source of truth
PERSISTENT = [
    {'name': 'NODE_ENV',          'value': 'production'},
    {'name': 'PORT',              'value': '8080'},
    {'name': 'AWS_REGION',        'value': 'us-east-2'},
    {'name': 'JWT_EXPIRES_IN',    'value': '24h'},
    {'name': 'ALLOWED_ORIGINS',   'value': 'https://portal.coreholdingcorp.com,https://coreidentity.coreholdingcorp.com,https://coreidentity-dashboard.pages.dev'},
    {'name': 'MCP_SERVER_URL',    'value': 'https://chc-mcp-server-lvuq2yqbma-ue.a.run.app'},
    {'name': 'CIAG_NOTIFY_EMAIL', 'value': 'tmorgan@coreholdingcorp.com'},
    {'name': 'CIAG_SENDER_EMAIL', 'value': 'tmorgan@coreholdingcorp.com'},
    {'name': 'PORTAL_URL',        'value': 'https://portal.coreholdingcorp.com'},
]

# Preserve secrets already in the task definition (JWT_SECRET, MCP_API_KEY etc)
# — they were set manually and should not be wiped
existing = td['containerDefinitions'][0].get('environment', [])
persistent_keys = {e['name'] for e in PERSISTENT}
secret_keys = {'JWT_SECRET','MCP_API_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET',
               'STRIPE_PRICE_STARTER','STRIPE_PRICE_PROFESSIONAL','STRIPE_PRICE_ENTERPRISE'}

# Keep existing secrets, merge persistent, set new image
merged = (
    [e for e in existing if e['name'] in secret_keys] +
    PERSISTENT
)

td['containerDefinitions'][0]['environment'] = merged
td['containerDefinitions'][0]['image'] = new_image

with open('/tmp/new-taskdef.json', 'w') as f:
    json.dump(td, f)

print(f'Image set to: {new_image}')
print(f'Env vars: {len(merged)} total ({len([e for e in merged if e["name"] in secret_keys])} secrets preserved)')
