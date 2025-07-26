import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import { ModelDefinition, SeedData } from '../types/model';

export interface DataSeederConstructProps {
  appName: string;
  stage: string;
  models: ModelDefinition[];
  seedData: SeedData;
}

export class DataSeederConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DataSeederConstructProps) {
    super(scope, id);

    if (Object.keys(props.seedData).length === 0) {
      return; // No seed data to process
    }

    // Create Lambda function for data seeding
    const seederFunction = new lambda.Function(this, 'SeederFunction', {
      functionName: `${props.appName}-${props.stage}-data-seeder`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'data-seeder.handler',
      code: lambda.Code.fromAsset('lib/lambda'),
      timeout: cdk.Duration.minutes(5),
      environment: {
        APP_NAME: props.appName,
        STAGE: props.stage,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions to access DynamoDB and RDS
    seederFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:PutItem',
          'dynamodb:GetItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Scan',
          'dynamodb:Query',
        ],
        resources: [`arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${props.appName}-${props.stage}-*`],
      })
    );

    seederFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'rds-data:ExecuteStatement',
          'rds-data:BatchExecuteStatement',
          'rds-data:BeginTransaction',
          'rds-data:CommitTransaction',
          'rds-data:RollbackTransaction',
        ],
        resources: [`arn:aws:rds:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:cluster:${props.appName}-${props.stage}-*`],
      })
    );

    seederFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
        ],
        resources: [`arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:${props.appName}-${props.stage}-*`],
      })
    );

    // Create custom resource to trigger seeding
    const provider = new cr.Provider(this, 'SeederProvider', {
      onEventHandler: seederFunction,
    });

    new cdk.CustomResource(this, 'SeederResource', {
      serviceToken: provider.serviceToken,
      properties: {
        SeedData: JSON.stringify(props.seedData),
        Models: JSON.stringify(props.models),
        Timestamp: Date.now(), // Force update on each deployment
      },
    });
  }

  private generateSeederCode(props: DataSeederConstructProps): string {
    return `
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { RDSDataClient, ExecuteStatementCommand } = require('@aws-sdk/client-rds-data');

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const rdsData = new RDSDataClient({});

exports.handler = async (event) => {
  console.log('Data seeder event:', JSON.stringify(event, null, 2));
  
  if (event.RequestType === 'Delete') {
    return { Status: 'SUCCESS', PhysicalResourceId: 'data-seeder' };
  }

  try {
    const seedData = JSON.parse(event.ResourceProperties.SeedData);
    const models = JSON.parse(event.ResourceProperties.Models);
    
    for (const [modelName, records] of Object.entries(seedData)) {
      const model = models.find(m => m.name === modelName);
      if (!model) {
        console.warn(\`Model \${modelName} not found, skipping seed data\`);
        continue;
      }

      console.log(\`Seeding \${records.length} records for \${modelName}\`);
      
      if (model.dataSource.type === 'database') {
        if (model.dataSource.engine === 'nosql') {
          await seedDynamoDB(modelName, records);
        } else if (model.dataSource.engine === 'sql') {
          await seedRDS(modelName, records, model);
        }
      }
    }

    return { Status: 'SUCCESS', PhysicalResourceId: 'data-seeder' };
  } catch (error) {
    console.error('Error seeding data:', error);
    return { Status: 'FAILED', PhysicalResourceId: 'data-seeder', Reason: error.message };
  }
};

async function seedDynamoDB(modelName, records) {
  const tableName = \`\${process.env.APP_NAME}-\${process.env.STAGE}-\${modelName}\`;
  
  for (const record of records) {
    const params = {
      TableName: tableName,
      Item: {
        ...record,
        id: record.id || require('crypto').randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(id)',
    };

    try {
      await dynamodb.send(new PutCommand(params));
      console.log(\`Inserted record with id: \${params.Item.id}\`);
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.log(\`Record with id \${params.Item.id} already exists, skipping\`);
      } else {
        throw error;
      }
    }
  }
}

async function seedRDS(modelName, records, model) {
  const clusterArn = \`arn:aws:rds:\${process.env.AWS_REGION}:\${process.env.AWS_ACCOUNT_ID}:cluster:\${process.env.APP_NAME}-\${process.env.STAGE}-cluster\`;
  const secretArn = \`arn:aws:secretsmanager:\${process.env.AWS_REGION}:\${process.env.AWS_ACCOUNT_ID}:secret:\${process.env.APP_NAME}-\${process.env.STAGE}-db-secret\`;
  const database = process.env.APP_NAME.toLowerCase();
  const tableName = modelName.toLowerCase();

  for (const record of records) {
    const columns = Object.keys(record);
    const values = Object.values(record);
    const placeholders = columns.map((_, i) => \`:param\${i}\`).join(', ');
    
    const sql = \`INSERT IGNORE INTO \${tableName} (\${columns.join(', ')}) VALUES (\${placeholders})\`;
    
    const parameters = values.map((value, i) => ({
      name: \`param\${i}\`,
      value: { stringValue: String(value) }
    }));

    const params = {
      resourceArn: clusterArn,
      secretArn: secretArn,
      database: database,
      sql: sql,
      parameters: parameters,
    };

    try {
      await rdsData.send(new ExecuteStatementCommand(params));
      console.log(\`Inserted record into \${tableName}\`);
    } catch (error) {
      console.error(\`Error inserting into \${tableName}:\`, error);
    }
  }
}
`;
  }
}
