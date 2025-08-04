import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { ModelDefinition } from '../types/model';

export interface AwsExportsGeneratorProps {
  appName: string;
  stage: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  api: appsync.GraphqlApi;
  adminApi: apigateway.RestApi;
  models: ModelDefinition[];
  layers: lambda.LayerVersion[];
}

export class AwsExportsGeneratorConstruct extends Construct {
  constructor(scope: Construct, id: string, props: AwsExportsGeneratorProps) {
    super(scope, id);

    // Create Lambda function to generate aws-exports.js
    const generatorFunction = new lambda.Function(this, 'AwsExportsGenerator', {
      functionName: `${props.appName}-${props.stage}-aws-exports-generator`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(this.generateAwsExportsCode()),
      timeout: cdk.Duration.minutes(5),
      layers: props.layers,
      environment: {
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        GRAPHQL_API_URL: props.api.graphqlUrl,
        GRAPHQL_API_ID: props.api.apiId,
        ADMIN_API_URL: props.adminApi.url,
        APP_NAME: props.appName,
        STAGE: props.stage,
        MODELS: JSON.stringify(props.models.map(m => ({
          name: m.name,
          hasSubscriptions: m.enableSubscriptions || false,
          hasRateLimit: m.dataSource.type === 'thirdPartyApi' && !!m.dataSource.limits,
        }))),
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions to write to S3 or local filesystem
    generatorFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:PutObjectAcl',
          's3:GetObject',
        ],
        resources: ['*'], // In production, restrict this to specific bucket
      })
    );

    // Create custom resource to trigger the function
    const customResource = new cdk.CustomResource(this, 'AwsExportsCustomResource', {
      serviceToken: generatorFunction.functionArn,
      properties: {
        // Trigger update when any of these values change
        UserPoolId: props.userPool.userPoolId,
        UserPoolClientId: props.userPoolClient.userPoolClientId,
        GraphQLApiUrl: props.api.graphqlUrl,
        GraphQLApiId: props.api.apiId,
        ModelsHash: this.hashModels(props.models),
        Timestamp: Date.now(), // Force update on every deployment
      },
    });

    // Output the generated config for reference
    new cdk.CfnOutput(this, 'AwsExportsGenerated', {
      value: customResource.getAttString('ConfigGenerated'),
      description: 'AWS Exports configuration generated',
    });

    new cdk.CfnOutput(this, 'FrontendConfigPath', {
      value: './frontend/src/aws-exports.js',
      description: 'Path to generated AWS exports file',
    });
  }

  private hashModels(models: ModelDefinition[]): string {
    // Create a simple hash of model configurations to detect changes
    const modelSummary = models.map(m => ({
      name: m.name,
      dataSource: m.dataSource.type,
      hasAuth: !!m.accessControl,
      hasRelationships: !!m.relationships,
      hasSubscriptions: !!m.enableSubscriptions,
    }));
    
    return Buffer.from(JSON.stringify(modelSummary)).toString('base64');
  }

  private generateAwsExportsCode(): string {
    return `
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  console.log('AWS Exports Generator Event:', JSON.stringify(event, null, 2));

  if (event.RequestType === 'Delete') {
    return { Status: 'SUCCESS', PhysicalResourceId: 'aws-exports-generator' };
  }

  try {
    const models = JSON.parse(process.env.MODELS || '[]');
    
    const awsExports = {
      aws_project_region: process.env.AWS_REGION,
      aws_cognito_region: process.env.AWS_REGION,
      aws_user_pools_id: process.env.USER_POOL_ID,
      aws_user_pools_web_client_id: process.env.USER_POOL_CLIENT_ID,
      oauth: {},
      aws_cognito_username_attributes: ['email'],
      aws_cognito_social_providers: [],
      aws_cognito_signup_attributes: ['email'],
      aws_cognito_mfa_configuration: 'OFF',
      aws_cognito_mfa_types: ['SMS'],
      aws_cognito_password_protection_settings: {
        passwordPolicyMinLength: 8,
        passwordPolicyCharacters: []
      },
      aws_cognito_verification_mechanisms: ['email'],
      aws_appsync_graphqlEndpoint: process.env.GRAPHQL_API_URL,
      aws_appsync_region: process.env.AWS_REGION,
      aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      aws_appsync_apiKey: null,
      aws_admin_api_url: process.env.ADMIN_API_URL,
      models: models,
      app_name: process.env.APP_NAME,
      stage: process.env.STAGE
    };

    const configContent = \`const awsExports = \${JSON.stringify(awsExports, null, 2)};
export default awsExports;
\`;

    console.log('Generated AWS Exports configuration');
    
    return { 
      Status: 'SUCCESS', 
      PhysicalResourceId: 'aws-exports-generator',
      Data: {
        ConfigGenerated: 'true',
        ConfigContent: configContent
      }
    };
  } catch (error) {
    console.error('Error generating AWS exports:', error);
    return { 
      Status: 'FAILED', 
      PhysicalResourceId: 'aws-exports-generator', 
      Reason: error.message 
    };
  }
};
`;
  }
}
