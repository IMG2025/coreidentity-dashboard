# GitHub Secrets Required for CI/CD

Go to: https://github.com/IMG2025/coreidentity-dashboard/settings/secrets/actions

Add these secrets:

| Secret Name            | Value                                      |
|------------------------|--------------------------------------------|
| AWS_ACCESS_KEY_ID      | Your AWS access key (needs ECR + ECS perms)|
| AWS_SECRET_ACCESS_KEY  | Your AWS secret key                        |
| AWS_ACCOUNT_ID         | Your 12-digit AWS account ID               |

## IAM Policy Required (attach to the key above)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect":"Allow","Action":["ecr:*"],"Resource":"*"},
    {"Effect":"Allow","Action":["ecs:*"],"Resource":"*"},
    {"Effect":"Allow","Action":["iam:PassRole"],"Resource":"arn:aws:iam::*:role/ecsTaskExecutionRole"},
    {"Effect":"Allow","Action":["logs:CreateLogGroup"],"Resource":"*"}
  ]
}
```
