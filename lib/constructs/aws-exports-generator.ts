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
      handler: 'aws-exports-generator.handler',
      code: lambda.Code.fromAsset('lib/lambda'),
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
}
