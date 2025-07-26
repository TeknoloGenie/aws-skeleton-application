import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';

export interface MigrationRunnerConstructProps {
  appName: string;
  stage: string;
  rdsCluster: rds.ServerlessCluster;
  vpc: ec2.Vpc;
}

export class MigrationRunnerConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MigrationRunnerConstructProps) {
    super(scope, id);

    // Create Lambda function for running migrations
    const migrationFunction = new lambda.Function(this, 'MigrationFunction', {
      functionName: `${props.appName}-${props.stage}-migration-runner`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(this.generateMigrationCode(props)),
      timeout: cdk.Duration.minutes(10),
      vpc: props.vpc,
      environment: {
        APP_NAME: props.appName,
        STAGE: props.stage,
        CLUSTER_ARN: props.rdsCluster.clusterArn,
        SECRET_ARN: props.rdsCluster.secret!.secretArn,
        DATABASE_NAME: props.appName.toLowerCase(),
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions to access RDS Data API
    migrationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'rds-data:ExecuteStatement',
          'rds-data:BatchExecuteStatement',
          'rds-data:BeginTransaction',
          'rds-data:CommitTransaction',
          'rds-data:RollbackTransaction',
        ],
        resources: [props.rdsCluster.clusterArn],
      })
    );

    // Grant permissions to access the secret
    props.rdsCluster.secret!.grantRead(migrationFunction);

    // Create custom resource to trigger migrations
    const provider = new cr.Provider(this, 'MigrationProvider', {
      onEventHandler: migrationFunction,
    });

    new cdk.CustomResource(this, 'MigrationResource', {
      serviceToken: provider.serviceToken,
      properties: {
        Timestamp: Date.now(), // Force update on each deployment
      },
    });
  }

  private generateMigrationCode(props: MigrationRunnerConstructProps): string {
    return `
const { RDSDataClient, ExecuteStatementCommand } = require('@aws-sdk/client-rds-data');
const rdsData = new RDSDataClient({});
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  console.log('Migration runner event:', JSON.stringify(event, null, 2));
  
  if (event.RequestType === 'Delete') {
    return { Status: 'SUCCESS', PhysicalResourceId: 'migration-runner' };
  }

  try {
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations();
    
    // Get list of migration files
    const migrationFiles = getMigrationFiles();
    
    // Apply new migrations
    for (const migrationFile of migrationFiles) {
      if (!appliedMigrations.includes(migrationFile)) {
        console.log(\`Applying migration: \${migrationFile}\`);
        await applyMigration(migrationFile);
        await recordMigration(migrationFile);
      }
    }

    return { Status: 'SUCCESS', PhysicalResourceId: 'migration-runner' };
  } catch (error) {
    console.error('Error running migrations:', error);
    return { Status: 'FAILED', PhysicalResourceId: 'migration-runner', Reason: error.message };
  }
};

async function executeSQL(sql, parameters = []) {
  const params = {
    resourceArn: process.env.CLUSTER_ARN,
    secretArn: process.env.SECRET_ARN,
    database: process.env.DATABASE_NAME,
    sql: sql,
    parameters: parameters,
  };

  const result = await rdsData.send(new ExecuteStatementCommand(params));
  return result;
}

async function createMigrationsTable() {
  const sql = \`
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  \`;
  
  await executeSQL(sql);
}

async function getAppliedMigrations() {
  try {
    const result = await executeSQL('SELECT id FROM migrations ORDER BY applied_at');
    return result.records ? result.records.map(record => record[0].stringValue) : [];
  } catch (error) {
    console.log('Error getting applied migrations:', error);
    return [];
  }
}

function getMigrationFiles() {
  // In a real implementation, this would read from the migrations/sql directory
  // For now, return a placeholder list
  const migrations = [
    '001_create_initial_tables.sql',
    '002_add_indexes.sql',
  ];
  
  return migrations.sort();
}

async function applyMigration(migrationFile) {
  // In a real implementation, this would read the SQL file content
  // For now, we'll use placeholder SQL based on the filename
  let sql = '';
  
  if (migrationFile.includes('create_initial_tables')) {
    sql = \`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        user_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    \`;
  } else if (migrationFile.includes('add_indexes')) {
    sql = \`
      CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    \`;
  }
  
  if (sql) {
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await executeSQL(statement.trim());
      }
    }
  }
}

async function recordMigration(migrationFile) {
  const sql = 'INSERT INTO migrations (id) VALUES (:migrationId)';
  const parameters = [
    {
      name: 'migrationId',
      value: { stringValue: migrationFile }
    }
  ];
  
  await executeSQL(sql, parameters);
}
`;
  }
}
