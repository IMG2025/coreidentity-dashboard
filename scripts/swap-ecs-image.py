#!/usr/bin/env python3
"""Swap ECS task definition image. Usage: python3 swap-ecs-image.py <new-image>"""
import json, sys

new_image = sys.argv[1]
with open('/tmp/current-taskdef.json') as f:
    td = json.load(f)

td['containerDefinitions'][0]['image'] = new_image
for k in ['taskDefinitionArn','revision','status','requiresAttributes',
          'compatibilities','registeredAt','registeredBy']:
    td.pop(k, None)

with open('/tmp/new-taskdef.json', 'w') as f:
    json.dump(td, f)

print('Image set to:', new_image)
