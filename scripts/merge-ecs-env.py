#!/usr/bin/env python3
"""
merge-ecs-env.py
Reads the current ECS task definition, merges persistent env vars,
writes merged definition to /tmp/new-taskdef.json for re-registration.

Usage: python3 scripts/merge-ecs-env.py <task-def-json-file>
"""
import sys
import json

if len(sys.argv) < 2:
    print("Usage: merge-ecs-env.py <task-def-json-file>")
    sys.exit(1)

with open(sys.argv[1]) as f:
    td = json.load(f)

# Strip read-only fields that AWS rejects on re-registration
for key in ['taskDefinitionArn','revision','status','requiresAttributes',
            'compatibilities','registeredAt','registeredBy','deregisteredAt']:
    td.pop(key, None)

# Persistent env vars — single source of truth
# Update this list when adding new env vars
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
    # Secrets injected from GitHub Actions secrets
    {'name': 'JWT_SECRET',        'value': '__JWT_SECRET__'},
    {'name': 'MCP_API_KEY',       'value': '__MCP_API_KEY__'},
    {'name': 'STRIPE_SECRET_KEY', 'value': '__STRIPE_SECRET_KEY__'},
    {'name': 'STRIPE_WEBHOOK_SECRET', 'value': '__STRIPE_WEBHOOK_SECRET__'},
]

env = td['containerDefinitions'][0].get('environment', [])
persistent_keys = {e['name'] for e in PERSISTENT}

# Keep any existing env vars not in our persistent set, then add persistent
merged = [e for e in env if e['name'] not in persistent_keys] + PERSISTENT

td['containerDefinitions'][0]['environment'] = merged

with open('/tmp/new-taskdef.json', 'w') as f:
    json.dump(td, f)

print(f"Merged {len(merged)} env vars into task definition")
print(f"Output: /tmp/new-taskdef.json")
