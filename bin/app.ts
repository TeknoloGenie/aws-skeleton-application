#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Get configuration from context or environment
const appName = app.node.tryGetContext('appName') || process.env.APP_NAME || 'MyApp';
const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

const env = { account, region };

// Create the CI/CD pipeline stack
new PipelineStack(app, `${appName}-Pipeline`, {
  env,
  appName,
  description: `CI/CD Pipeline for ${appName}`,
});

// Create application stacks for each environment when deployed directly
if (stage) {
  new AppStack(app, `${appName}-${stage}`, {
    env,
    appName,
    stage,
    description: `${appName} application stack for ${stage} environment`,
  });
}

app.synth();
