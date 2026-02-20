# Backend API Endpoints Required

The frontend is now configured to call these endpoints:

## Agents
- `GET /api/agents` - List all agents
  - Query params: category, search
  - Returns: Array of agent objects

- `GET /api/agents/:id` - Get agent details
  - Returns: Single agent object

- `POST /api/agents/:id/deploy` - Deploy an agent
  - Body: { config: {} }
  - Returns: { id, agentId, status, deployedAt }

## Deployed Agents
- `GET /api/deployed` - List deployed agents
  - Returns: Array of deployment objects

- `POST /api/deployed/:id/stop` - Stop a deployed agent
  - Returns: Updated deployment object

## Workflows
- `GET /api/workflows` - List workflows
  - Returns: Array of workflow objects

- `POST /api/workflows` - Create workflow
  - Body: { name, agents, ... }
  - Returns: Created workflow object

## Governance
- `GET /api/governance` - Get compliance status
  - Returns: { complianceScore, policiesEnforced, violations, ... }

## Health Check
- `GET /health` - Health check endpoint
  - Returns: 200 OK

## Agent Object Schema
```json
{
  "id": 1,
  "name": "Agent Name",
  "category": "Data Analysis",
  "description": "Description",
  "rating": 4.9,
  "deployments": 1234,
  "compliance": ["SOC2", "HIPAA"],
  "icon": "📊",
  "price": "Premium"
}
```

## Deployment Object Schema
```json
{
  "id": 123456,
  "agentId": 1,
  "agentName": "Agent Name",
  "agentIcon": "📊",
  "status": "running",
  "deployedAt": "2026-02-20T12:00:00Z",
  "config": {}
}
```

## Implementation Notes

1. **Fallback Behavior**: Frontend will use mock data if backend endpoints don't exist yet
2. **CORS**: Backend must allow requests from frontend domain
3. **Error Handling**: All endpoints should return proper error codes
4. **Authentication**: Add JWT/auth headers when ready

## Next Steps

1. Implement these endpoints in your backend
2. Test with: `curl http://your-backend/api/agents`
3. Update VITE_API_URL in .env.production
4. Rebuild frontend: `npm run build`
