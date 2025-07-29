#!/bin/bash

# Deploy with Frontend Build Script
# This script deploys the CDK stack and then builds the frontend with the generated configuration

set -e

APP_NAME=${1:-MyApp}
STAGE=${2:-dev}
AWS_REGION=${3:-us-east-1}

echo "🚀 Starting deployment for $APP_NAME-$STAGE in $AWS_REGION"

# Set environment variables
export APP_NAME=$APP_NAME
export STAGE=$STAGE
export CDK_DEFAULT_REGION=$AWS_REGION

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building application and layers..."
npm run build

echo "☁️  Deploying CDK stack..."
cdk deploy $APP_NAME-$STAGE --context appName=$APP_NAME --context stage=$STAGE --require-approval never

echo "⏳ Waiting for aws-exports.js to be generated..."
# Wait for the aws-exports.js file to be created
TIMEOUT=60
COUNTER=0
while [ ! -f "./frontend/src/aws-exports.js" ] && [ $COUNTER -lt $TIMEOUT ]; do
  echo "Waiting for aws-exports.js... ($COUNTER/$TIMEOUT)"
  sleep 2
  COUNTER=$((COUNTER + 2))
done

if [ ! -f "./frontend/src/aws-exports.js" ]; then
  echo "❌ aws-exports.js was not generated within $TIMEOUT seconds"
  echo "You may need to run the deployment again or check the Lambda logs"
  exit 1
fi

echo "✅ aws-exports.js generated successfully"

echo "🎨 Building frontend..."
cd frontend
npm install
npm run build

echo "📁 Frontend built successfully in ./frontend/dist"

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy the frontend to your hosting service (S3, CloudFront, etc.)"
echo "2. Update your DNS settings if needed"
echo "3. Test the application"
echo ""
echo "📊 Stack outputs:"
cdk list --long

cd ..
