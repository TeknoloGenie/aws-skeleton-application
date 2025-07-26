#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`${description}...`, colors.yellow);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    return true;
  } catch (error) {
    log(`ERROR: ${description} failed`, colors.red);
    log(error.message, colors.red);
    return false;
  }
}

function checkCommand(command, name) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    log(`ERROR: ${name} is not installed or not in PATH`, colors.red);
    return false;
  }
}

async function main() {
  // Get configuration from environment variables or use defaults
  const appName = process.env.APP_NAME || 'MyApp';
  const stage = process.env.STAGE || 'dev';
  const awsRegion = process.env.AWS_REGION || 'us-east-1';

  log('Starting AWS Application Accelerator deployment...', colors.green);
  log('');
  log('Configuration:', colors.yellow);
  log(`- App Name: ${appName}`, colors.white);
  log(`- Stage: ${stage}`, colors.white);
  log(`- AWS Region: ${awsRegion}`, colors.white);
  log('');

  // Check prerequisites
  log('Checking prerequisites...', colors.yellow);
  
  const prerequisites = [
    { command: 'aws', name: 'AWS CLI' },
    { command: 'cdk', name: 'AWS CDK' },
    { command: 'npm', name: 'npm' }
  ];

  for (const prereq of prerequisites) {
    if (!checkCommand(prereq.command, prereq.name)) {
      if (prereq.name === 'AWS CLI') {
        log('Please install AWS CLI and configure your credentials', colors.red);
      } else if (prereq.name === 'AWS CDK') {
        log('Please install CDK globally: npm install -g aws-cdk', colors.red);
      } else if (prereq.name === 'npm') {
        log('Please install Node.js and npm', colors.red);
      }
      process.exit(1);
    }
  }

  log('Prerequisites check passed!', colors.green);
  log('');

  // Execute deployment steps
  const steps = [
    {
      command: 'npm install',
      description: 'Installing dependencies'
    },
    {
      command: 'npm run frontend:install',
      description: 'Installing frontend dependencies'
    },
    {
      command: `cdk bootstrap --context appName=${appName} --context stage=${stage}`,
      description: 'Checking CDK bootstrap status'
    },
    {
      command: `cdk deploy ${appName}-${stage} --context appName=${appName} --context stage=${stage} --require-approval never`,
      description: 'Deploying CDK stack'
    }
  ];

  for (const step of steps) {
    if (!execCommand(step.command, step.description)) {
      log('Deployment failed!', colors.red);
      process.exit(1);
    }
  }

  // Success message
  log('');
  log('========================================', colors.green);
  log('Deployment completed successfully!', colors.green);
  log('========================================', colors.green);
  log('');
  log('Next steps:', colors.yellow);
  log('1. Start the frontend development server:', colors.white);
  log('   cd frontend', colors.cyan);
  log('   npm run dev', colors.cyan);
  log('');
  log('2. Access your application:', colors.white);
  log('   - Frontend: http://localhost:3000', colors.cyan);
  log('   - Check CDK outputs for GraphQL API endpoint', colors.cyan);
  log('');
  log('3. The aws-exports.js file has been generated automatically', colors.white);
  log('   in the frontend/src directory', colors.cyan);
  log('');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`ERROR: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`ERROR: ${error.message}`, colors.red);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  log(`ERROR: ${error.message}`, colors.red);
  process.exit(1);
});
