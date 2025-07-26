import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as cdk from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { AwsExportsGeneratorConstruct } from './constructs/aws-exports-generator';
import { DataSeederConstruct } from './constructs/data-seeder';
import { MigrationRunnerConstruct } from './constructs/migration-runner';
import { MonitoringConstruct } from './constructs/monitoring';
import { ModelDefinition } from './types/model';
import { ModelParser } from './utils/model-parser';
import { SchemaGenerator } from './utils/schema-generator';

export interface AppStackProps extends cdk.StackProps {
  appName: string;
  stage: string;
}

export class AppStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly api: appsync.GraphqlApi;
  public readonly vpc: ec2.Vpc;
  public readonly rdsCluster?: rds.ServerlessCluster;

  private models: ModelDefinition[];
  private modelParser: ModelParser;
  private schemaGenerator: SchemaGenerator;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Initialize model parsing
    this.modelParser = new ModelParser();
    this.models = this.modelParser.parseModels();
    this.schemaGenerator = new SchemaGenerator(this.modelParser, this.models);

    // Validate relationships
    const relationshipErrors = this.schemaGenerator.relationshipGenerator.validateRelationships();
    if (relationshipErrors.length > 0) {
      console.error('Relationship validation errors:');
      relationshipErrors.forEach(error => {
        console.error(`  ${error.model}.${error.field}: ${error.error}`);
      });
      throw new Error('Invalid relationship definitions found. Please fix the errors above.');
    }

    // Create VPC for RDS if needed
    const needsRds = this.models.some(model => 
      model.dataSource.type === 'database' && model.dataSource.engine === 'sql'
    );

    if (needsRds) {
      this.vpc = new ec2.Vpc(this, 'Vpc', {
        maxAzs: 2,
        natGateways: 1,
      });
    }

    // Create Cognito User Pool
    this.userPool = this.createUserPool(props);
    this.userPoolClient = this.createUserPoolClient();

    // Create AppSync API
    this.api = this.createAppSyncApi(props);

    // Create RDS cluster if needed
    if (needsRds && this.vpc) {
      this.rdsCluster = this.createRdsCluster(props);
    }

    // Process each model and create infrastructure
    this.processModels(props);

    // Create monitoring and observability
    new MonitoringConstruct(this, 'Monitoring', {
      appName: props.appName,
      stage: props.stage,
      api: this.api,
    });

    // Create budget
    this.createBudget(props);

    // Create data seeder
    new DataSeederConstruct(this, 'DataSeeder', {
      appName: props.appName,
      stage: props.stage,
      models: this.models,
      seedData: this.modelParser.parseSeedData(),
    });

    // Create migration runner if RDS is used
    if (this.rdsCluster) {
      new MigrationRunnerConstruct(this, 'MigrationRunner', {
        appName: props.appName,
        stage: props.stage,
        rdsCluster: this.rdsCluster,
        vpc: this.vpc!,
      });
    }

    // Generate AWS exports for frontend
    new AwsExportsGeneratorConstruct(this, 'AwsExportsGenerator', {
      appName: props.appName,
      stage: props.stage,
      userPool: this.userPool,
      userPoolClient: this.userPoolClient,
      api: this.api,
      models: this.models,
    });

    // Output important values
    this.createOutputs(props);
  }

  private createUserPool(props: AppStackProps): cognito.UserPool {
    return new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${props.appName}-${props.stage}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  private createUserPoolClient(): cognito.UserPoolClient {
    return new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userSrp: true,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    });
  }

  private createAppSyncApi(props: AppStackProps): appsync.GraphqlApi {
    // Generate schema from models
    const schemaContent = this.schemaGenerator.generateSchema(this.models);
    
    // Write schema to file for AppSync to use
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(process.cwd(), 'schema.graphql');
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');

    const api = new appsync.GraphqlApi(this, 'Api', {
      name: `${props.appName}-${props.stage}-api`,
      schema: appsync.SchemaFile.fromAsset('schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: this.userPool,
          },
        },
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
        retention: logs.RetentionDays.ONE_WEEK,
      },
    });

    return api;
  }

  private createRdsCluster(props: AppStackProps): rds.ServerlessCluster {
    const dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: `${props.appName}-${props.stage}-db-secret`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    return new rds.ServerlessCluster(this, 'RdsCluster', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_04_0,
      }),
      credentials: rds.Credentials.fromSecret(dbSecret),
      clusterIdentifier: `${props.appName}-${props.stage}-cluster`,
      defaultDatabaseName: props.appName.toLowerCase(),
      vpc: this.vpc!,
      scaling: {
        autoPause: cdk.Duration.minutes(10),
        minCapacity: rds.AuroraCapacityUnit.ACU_1,
        maxCapacity: rds.AuroraCapacityUnit.ACU_2,
      },
      enableDataApi: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  private processModels(props: AppStackProps): void {
    for (const model of this.models) {
      this.processModel(model, props);
    }
  }

  private processModel(model: ModelDefinition, props: AppStackProps): void {
    if (model.dataSource.type === 'database') {
      if (model.dataSource.engine === 'nosql') {
        this.createDynamoDBResources(model, props);
      } else if (model.dataSource.engine === 'sql') {
        this.createRDSResources(model, props);
      }
    } else if (model.dataSource.type === 'thirdPartyApi') {
      this.createThirdPartyApiResources(model, props);
    }

    // Create hook functions if defined
    if (model.hooks) {
      this.createHookFunctions(model, props);
    }
  }

  private createDynamoDBResources(model: ModelDefinition, props: AppStackProps): void {
    // Create DynamoDB table
    const table = new dynamodb.Table(this, `${model.name}Table`, {
      tableName: `${props.appName}-${props.stage}-${model.name}`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: props.stage === 'prod',
    });

    // Add GSIs for relationships
    const gsiDefinitions = this.schemaGenerator.relationshipGenerator.generateGSIDefinitions(model);
    for (const gsi of gsiDefinitions) {
      table.addGlobalSecondaryIndex({
        indexName: gsi.indexName,
        partitionKey: {
          name: gsi.partitionKey,
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: gsi.sortKey ? {
          name: gsi.sortKey,
          type: dynamodb.AttributeType.STRING,
        } : undefined,
      });
    }

    // Create AppSync data source
    const dataSource = this.api.addDynamoDbDataSource(
      `${model.name}DataSource`,
      table
    );

    // Create resolvers
    this.createDynamoDBResolvers(model, dataSource);
    
    // Create relationship resolvers
    this.createRelationshipResolvers(model, dataSource);
  }

  private createRDSResources(model: ModelDefinition, _props: AppStackProps): void {
    if (!this.rdsCluster) {
      throw new Error('RDS cluster not created but required for SQL models');
    }

    // Create AppSync RDS data source
    const dataSource = this.api.addRdsDataSource(
      `${model.name}DataSource`,
      this.rdsCluster,
      this.rdsCluster.secret!
    );

    // Create resolvers
    this.createRDSResolvers(model, dataSource);
    
    // Create relationship resolvers
    this.createRelationshipResolvers(model, dataSource);
  }

  private createThirdPartyApiResources(model: ModelDefinition, props: AppStackProps): void {
    // Create secret for API credentials
    const secretName = `${props.appName}-${model.name}-${props.stage}-api-secret`;
    const apiSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      `${model.name}ApiSecret`,
      secretName
    );

    if (model.dataSource.limits) {
      // Create rate-limited workflow with SQS
      this.createRateLimitedApiWorkflow(model, props, apiSecret);
    } else {
      // Create direct HTTP data source
      const dataSource = this.api.addHttpDataSource(
        `${model.name}DataSource`,
        model.dataSource.endpoint!,
        {
          authorizationConfig: {
            signingRegion: this.region,
            signingServiceName: 'appsync',
          },
        }
      );

      this.createHttpResolvers(model, dataSource);
    }
  }

  private createRateLimitedApiWorkflow(
    model: ModelDefinition,
    props: AppStackProps,
    apiSecret: secretsmanager.ISecret
  ): void {
    // Create DynamoDB table for job results
    const jobResultsTable = new dynamodb.Table(this, `${model.name}JobResults`, {
      tableName: `${props.appName}-${props.stage}-${model.name}-job-results`,
      partitionKey: { name: 'requestId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create SQS queue for rate limiting
    const queue = new sqs.Queue(this, `${model.name}Queue`, {
      queueName: `${props.appName}-${props.stage}-${model.name}-queue`,
      visibilityTimeout: cdk.Duration.minutes(5),
    });

    // Create Lambda function for processing queue
    const processorFunction = new lambda.Function(this, `${model.name}Processor`, {
      functionName: `${props.appName}-${props.stage}-${model.name}-processor`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'api-rate-limiter.handler',
      code: lambda.Code.fromAsset('lib/lambda'),
      timeout: cdk.Duration.minutes(5),
      environment: {
        SECRET_NAME: apiSecret.secretName,
        API_ENDPOINT: model.dataSource.endpoint!,
        FREQUENCY_IN_SECONDS: model.dataSource.limits!.frequencyInSeconds.toString(),
        LIMIT: model.dataSource.limits!.limit.toString(),
        JOB_RESULTS_TABLE: jobResultsTable.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions
    apiSecret.grantRead(processorFunction);
    queue.grantConsumeMessages(processorFunction);
    jobResultsTable.grantWriteData(processorFunction);

    // Create event source mapping
    processorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(queue, {
        batchSize: 1,
      })
    );

    // Create Lambda function for DynamoDB stream processing (for subscriptions)
    const streamProcessor = new lambda.Function(this, `${model.name}StreamProcessor`, {
      functionName: `${props.appName}-${props.stage}-${model.name}-stream-processor`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'job-completion-notifier.handler',
      code: lambda.Code.fromAsset('lib/lambda'),
      timeout: cdk.Duration.minutes(1),
      environment: {
        APPSYNC_ENDPOINT: this.api.graphqlUrl,
        APPSYNC_REGION: this.region,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions for stream processor
    jobResultsTable.grantStreamRead(streamProcessor);
    streamProcessor.addEventSource(
      new lambdaEventSources.DynamoEventSource(jobResultsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
      })
    );

    // Grant AppSync mutation permissions to stream processor
    streamProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['appsync:GraphQL'],
        resources: [`${this.api.arn}/*`],
      })
    );

    
    // Create AppSync resolver that puts messages in queue
    const queueDataSource = this.api.addNoneDataSource(`${model.name}QueueDataSource`);
    
    // Grant SQS permissions to AppSync (handled by CDK automatically when using SQS data source)
    queue.grantSendMessages(streamProcessor);

    // Create resolvers that send requests to SQS queue
    this.createQueueResolvers(model, queueDataSource, queue.queueUrl);

    // Create DynamoDB data source for job results
    const jobResultsDataSource = this.api.addDynamoDbDataSource(
      `${model.name}JobResultsDataSource`,
      jobResultsTable
    );

    // Create subscription resolver for job completion
    jobResultsDataSource.createResolver(`OnJobCompletedResolver`, {
      typeName: 'Subscription',
      fieldName: 'onJobCompleted',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2018-05-29",
          "operation": "GetItem",
          "key": {
            "requestId": $util.dynamodb.toDynamoDBJson($ctx.args.requestId)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.result)
          $util.toJson($ctx.result)
        #else
          null
        #end
      `),
    });
  }
  
  private createQueueResolvers(
    model: ModelDefinition,
    dataSource: appsync.NoneDataSource,
    queueUrl: string
  ): void {
    // Create resolver for read operations that queues API requests
    dataSource.createResolver(`Get${model.name}Resolver`, {
      typeName: 'Query',
      fieldName: `get${model.name}`,
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2018-05-29",
          "method": "POST",
          "resourcePath": "/",
          "params": {
            "headers": {
              "content-type": "application/x-amz-json-1.0",
              "x-amz-target": "AmazonSQS.SendMessage"
            },
            "queryStringParameters": {},
            "body": {
              "QueueUrl": "${queueUrl}",
              "MessageBody": $util.toJson({
                "method": "GET",
                "path": "/geocode",
                "headers": {
                  "Content-Type": "application/json"
                },
                "body": $util.toJson($ctx.args),
                "requestId": "$util.autoId()"
              })
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        ## Return a pending response while the request is queued
        {
          "id": "$util.autoId()",
          "status": "PENDING",
          "message": "Request queued for processing"
        }
      `),
    });
  }

  private createDynamoDBResolvers(
    model: ModelDefinition,
    dataSource: appsync.DynamoDbDataSource
  ): void {
    // Check if model has hooks - if so, create pipeline resolvers
    if (model.hooks) {
      this.createPipelineResolvers(model, dataSource);
    } else {
      this.createSimpleResolvers(model, dataSource);
    }
  }

  private createPipelineResolvers(
    model: ModelDefinition,
    dataSource: appsync.DynamoDbDataSource
  ): void {
    const operations = ['Create', 'Read', 'Update', 'Delete'];
    
    for (const operation of operations) {
      const functions = this.schemaGenerator.generatePipelineResolverFunctions(model, operation);
      
      if (functions.length > 0) {
        // Create pipeline resolver
        const pipelineFunctions: appsync.AppsyncFunction[] = [];
        
        functions.forEach((functionCode, index) => {
          const functionName = `${model.name}${operation}Function${index}`;
          const appsyncFunction = new appsync.AppsyncFunction(this, functionName, {
            name: functionName,
            api: this.api,
            dataSource: dataSource,
            requestMappingTemplate: appsync.MappingTemplate.fromString(functionCode),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
              #if($ctx.error)
                $util.error($ctx.error.message, $ctx.error.type)
              #end
              $util.toJson($ctx.result)
            `),
          });
          pipelineFunctions.push(appsyncFunction);
        });

        // Create the pipeline resolver
        new appsync.Resolver(this, `${model.name}${operation}PipelineResolver`, {
          api: this.api,
          typeName: operation === 'Read' ? 'Query' : 'Mutation',
          fieldName: this.getFieldName(model.name, operation),
          pipelineConfig: pipelineFunctions,
          requestMappingTemplate: appsync.MappingTemplate.fromString(`
            ## Pipeline resolver request template
            $util.qr($ctx.stash.put("model", "${model.name}"))
            $util.qr($ctx.stash.put("operation", "${operation}"))
            {}
          `),
          responseMappingTemplate: appsync.MappingTemplate.fromString(`
            ## Pipeline resolver response template
            #if($ctx.error)
              $util.error($ctx.error.message, $ctx.error.type)
            #end
            $util.toJson($ctx.result)
          `),
        });
      }
    }
  }

  private createSimpleResolvers(
    model: ModelDefinition,
    dataSource: appsync.DynamoDbDataSource
  ): void {
    const resolverTemplates = this.schemaGenerator.generateDynamoDBResolvers(model);

    // Create resolvers for CRUD operations
    dataSource.createResolver(`Get${model.name}Resolver`, {
      typeName: 'Query',
      fieldName: `get${model.name}`,
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.request.replace('$operation', 'GetItem')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.response
      ),
    });

    dataSource.createResolver(`List${model.name}sResolver`, {
      typeName: 'Query',
      fieldName: `list${model.name}s`,
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.request.replace('$operation', 'Scan')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.response
      ),
    });

    dataSource.createResolver(`Create${model.name}Resolver`, {
      typeName: 'Mutation',
      fieldName: `create${model.name}`,
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.request.replace('$operation', 'PutItem')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.response
      ),
    });

    dataSource.createResolver(`Update${model.name}Resolver`, {
      typeName: 'Mutation',
      fieldName: `update${model.name}`,
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.request.replace('$operation', 'UpdateItem')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.response
      ),
    });

    dataSource.createResolver(`Delete${model.name}Resolver`, {
      typeName: 'Mutation',
      fieldName: `delete${model.name}`,
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.request.replace('$operation', 'DeleteItem')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.response
      ),
    });
  }

  private createRelationshipResolvers(
    model: ModelDefinition,
    _dataSource: appsync.DynamoDbDataSource | appsync.RdsDataSource
  ): void {
    if (!model.relationships) {
      return;
    }

    const relationshipResolvers = this.schemaGenerator.relationshipGenerator.generateRelationshipResolvers(model);

    for (const resolver of relationshipResolvers) {
      // For each relationship, we need to create a resolver that uses the appropriate data source
      const targetModel = this.models.find(m => m.name === resolver.relationship.target);
      if (!targetModel) {
        console.warn(`Target model ${resolver.relationship.target} not found`);
        continue;
      }

      // Use the target model's data source for the relationship resolver
      let targetDataSource: appsync.DynamoDbDataSource | appsync.RdsDataSource;
      
      if (targetModel.dataSource.type === 'database' && targetModel.dataSource.engine === 'nosql') {
        // Find or create DynamoDB data source for target model
        targetDataSource = this.api.addDynamoDbDataSource(
          `${targetModel.name}RelationshipDataSource`,
          dynamodb.Table.fromTableName(this, `${targetModel.name}RelationshipTable`, 
            `${this.stackName}-${targetModel.name}Table`)
        );
      } else if (targetModel.dataSource.type === 'database' && targetModel.dataSource.engine === 'sql') {
        // Use RDS data source for target model
        if (!this.rdsCluster) {
          console.warn(`RDS cluster not available for relationship ${resolver.fieldName}`);
          continue;
        }
        targetDataSource = this.api.addRdsDataSource(
          `${targetModel.name}RelationshipDataSource`,
          this.rdsCluster,
          this.rdsCluster.secret!
        );
      } else {
        console.warn(`Unsupported data source type for relationship: ${targetModel.dataSource.type}`);
        continue;
      }

      // Create the relationship resolver
      targetDataSource.createResolver(`${model.name}${resolver.fieldName}Resolver`, {
        typeName: model.name,
        fieldName: resolver.fieldName,
        requestMappingTemplate: appsync.MappingTemplate.fromString(resolver.requestTemplate),
        responseMappingTemplate: appsync.MappingTemplate.fromString(resolver.responseTemplate),
      });
    }
  }

  private getFieldName(modelName: string, operation: string): string {
    switch (operation) {
      case 'Create':
        return `create${modelName}`;
      case 'Read':
        return `get${modelName}`;
      case 'Update':
        return `update${modelName}`;
      case 'Delete':
        return `delete${modelName}`;
      default:
        return `${operation.toLowerCase()}${modelName}`;
    }
  }

  private createRDSResolvers(
    model: ModelDefinition,
    dataSource: appsync.RdsDataSource
  ): void {
    const resolverTemplates = this.schemaGenerator.generateRDSResolvers(model);

    // Create resolvers for CRUD operations
    dataSource.createResolver(`Get${model.name}Resolver`, {
      typeName: 'Query',
      fieldName: `get${model.name}`,
      requestMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.request.replace('$operation', 'SELECT')
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        resolverTemplates.response
      ),
    });

    // Additional RDS resolvers would be created similarly
  }

  private createHttpResolvers(
    model: ModelDefinition,
    dataSource: appsync.HttpDataSource
  ): void {
    // Create HTTP resolvers for third-party API calls
    dataSource.createResolver(`Get${model.name}Resolver`, {
      typeName: 'Query',
      fieldName: `get${model.name}`,
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2018-05-29",
          "method": "GET",
          "resourcePath": "/${model.name.toLowerCase()}/$ctx.args.id",
          "params": {
            "headers": {
              "Authorization": "$ctx.request.headers.authorization"
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        #if($ctx.error)
          $util.error($ctx.error.message, $ctx.error.type)
        #end
        $util.toJson($ctx.result)
      `),
    });
  }

  private createHookFunctions(model: ModelDefinition, props: AppStackProps): void {
    if (!model.hooks) return;

    for (const [hookType, functionName] of Object.entries(model.hooks)) {
      new lambda.Function(this, `${functionName}Function`, {
        functionName: `${props.appName}-${props.stage}-${functionName}`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
          exports.handler = async (event) => {
            console.log('${hookType} hook for ${model.name}:', event);
            // Placeholder implementation
            return event;
          };
        `),
        tracing: lambda.Tracing.ACTIVE,
      });
    }
  }

  private createBudget(props: AppStackProps): void {
    const budgetTopic = new sns.Topic(this, 'BudgetTopic', {
      topicName: `${props.appName}-${props.stage}-budget-alerts`,
    });

    new budgets.CfnBudget(this, 'Budget', {
      budget: {
        budgetName: `${props.appName}-${props.stage}-budget`,
        budgetLimit: {
          amount: 100, // Placeholder amount
          unit: 'USD',
        },
        timeUnit: 'MONTHLY',
        budgetType: 'COST',
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: budgetTopic.topicArn,
            },
          ],
        },
      ],
    });
  }

  private createOutputs(_props: AppStackProps): void {
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: this.api.graphqlUrl,
      description: 'AppSync GraphQL API URL',
    });

    new cdk.CfnOutput(this, 'GraphQLApiId', {
      value: this.api.apiId,
      description: 'AppSync GraphQL API ID',
    });

    if (this.rdsCluster) {
      new cdk.CfnOutput(this, 'RdsClusterEndpoint', {
        value: this.rdsCluster.clusterEndpoint.socketAddress,
        description: 'RDS Cluster Endpoint',
      });
    }
  }
}
