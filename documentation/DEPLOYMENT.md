# Deployment Guide

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **CDK bootstrapped** in your target region: `cdk bootstrap`
3. **GitHub token** stored in AWS Secrets Manager as `github-token`
4. **Node.js 18+** and npm installed

## Configuration Updates Required

Before deploying, update these configuration files:

### 1. Update GitHub Repository Settings

Edit `pipeline.config.json`:
```json
{
  "github": {
    "owner": "YOUR_GITHUB_USERNAME",
    "repo": "YOUR_REPOSITORY_NAME"
  }
}
```

### 2. Update Pipeline Stack

In `lib/pipeline-stack.ts`, replace the placeholder values:
- `your-github-username` → Your actual GitHub username
- `skeleton-application` → Your actual repository name

## Deployment Options

### Option 1: Manual Deployment (Recommended for Development)

This is the most reliable method based on our testing:

```bash
# Deploy the application stack directly
cdk deploy SkeletonApp-dev --context appName=SkeletonApp --context stage=dev --require-approval never

# Or use the npm script
npm run deploy:with-frontend
```

### Option 2: CI/CD Pipeline Deployment

1. **Deploy the pipeline infrastructure:**
   ```bash
   cdk deploy SkeletonApp-Pipeline --context appName=SkeletonApp
   ```

2. **Push to trigger pipeline:**
   ```bash
   git add .
   git commit -m "Update pipeline configuration"
   git push origin develop  # For dev/test deployment
   git push origin main     # For production deployment
   ```

## Pipeline Behavior

- **Develop branch** → Deploys to Dev and Test environments automatically
- **Main branch** → Deploys to Production with manual approval
- **Asset publishing** is now included in the build process
- **E2E tests** run against the Test environment

## Troubleshooting

### Pipeline Asset Issues
If you encounter "NoSuchKey" errors for Lambda layers:
- The pipeline now includes `cdk-assets publish` command
- Assets are published to the CDK assets bucket during build

### Manual Deployment Always Works
If pipeline fails, manual deployment is always reliable:
```bash
cdk deploy SkeletonApp-dev --context appName=SkeletonApp --context stage=dev
```

### GitHub Token Issues
Ensure your GitHub token has these permissions:
- `repo` (Full control of private repositories)
- `admin:repo_hook` (Read and write repository hooks)

## Environment Variables

Set these for deployment:
```bash
export APP_NAME="SkeletonApp"
export STAGE="dev"
export AWS_REGION="us-east-1"
```

## Resource Count

The framework deploys approximately 115 AWS resources including:
- AppSync GraphQL API
- Cognito User Pool
- DynamoDB tables
- Lambda functions and layers
- CloudWatch monitoring
- IAM roles and policies

Most resources are serverless with pay-per-use pricing.
