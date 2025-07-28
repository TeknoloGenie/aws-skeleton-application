#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Get configuration from context or environment
const appName = app.node.tryGetContext('appName') || process.env.APP_NAME || 'MyApp';
const stage = app.node.tryGetContext('stage') || process.env.STAGE;
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

const env = { account, region };

// Create the CI/CD pipeline stack
new PipelineStack(app, `${appName}-Pipeline`, {
  env,
  appName,
  description: `CI/CD Pipeline for ${appName}`,
});

// Create application stacks for each environment
// If a specific stage is provided, create only that stack (for direct deployment)
// Otherwise, create all stacks (for pipeline synthesis)
if (stage) {
  // Direct deployment - create only the specified stage
  new AppStack(app, `${appName}-${stage}`, {
    env,
    appName,
    stage,
    description: `${appName} application stack for ${stage} environment`,
  });
} else {
  // Pipeline synthesis - create all environment stacks
  const environments = ['dev', 'test', 'prod'];
  
  environments.forEach(envStage => {
    new AppStack(app, `${appName}-${envStage}`, {
      env,
      appName,
      stage: envStage,
      description: `${appName} application stack for ${envStage} environment`,
    });
  });
}

app.synth();
