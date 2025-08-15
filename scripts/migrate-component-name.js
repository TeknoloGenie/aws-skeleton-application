#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { program } = require('commander');

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

program
  .name('migrate-component-name')
  .description('Migrate component names in analytics logs')
  .requiredOption('--old <name>', 'Old component name')
  .requiredOption('--new <name>', 'New component name')
  .option('--app-name <name>', 'Application name', process.env.APP_NAME || 'SkeletonApp')
  .option('--stage <stage>', 'Deployment stage', process.env.STAGE || 'dev')
  .option('--dry-run', 'Show what would be updated without making changes')
  .parse();

const options = program.opts();

async function migrateComponentName() {
  const tableName = `${options.appName}-${options.stage}-Log`;
  const oldComponentName = options.old;
  const newComponentName = options.new;

  console.log(`🔍 Scanning for logs with component name: "${oldComponentName}"`);
  console.log(`📝 Will update to: "${newComponentName}"`);
  console.log(`🗄️  Table: ${tableName}`);
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
  }

  try {
    // Scan for all logs with the old component name
    const scanParams = {
      TableName: tableName,
      FilterExpression: 'component = :oldComponent',
      ExpressionAttributeValues: {
        ':oldComponent': oldComponentName
      }
    };

    let items = [];
    let lastEvaluatedKey = undefined;

    do {
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await dynamodb.send(new ScanCommand(scanParams));
      items = items.concat(result.Items || []);
      lastEvaluatedKey = result.LastEvaluatedKey;

      console.log(`📊 Found ${result.Items?.length || 0} items in this batch`);
    } while (lastEvaluatedKey);

    console.log(`📈 Total items found: ${items.length}`);

    if (items.length === 0) {
      console.log('✅ No items found to migrate');
      return;
    }

    if (options.dryRun) {
      console.log('🧪 DRY RUN: Would update the following items:');
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. ID: ${item.id}, User: ${item.userId}, Action: ${item.action}, Created: ${item.createdAt}`);
      });
      return;
    }

    // Update each item
    let updatedCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        const updateParams = {
          TableName: tableName,
          Key: {
            id: item.id
          },
          UpdateExpression: 'SET component = :newComponent, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':newComponent': newComponentName,
            ':updatedAt': new Date().toISOString()
          }
        };

        await dynamodb.send(new UpdateCommand(updateParams));
        updatedCount++;

        if (updatedCount % 100 === 0) {
          console.log(`📝 Updated ${updatedCount}/${items.length} items...`);
        }
      } catch (error) {
        console.error(`❌ Error updating item ${item.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Migration completed!`);
    console.log(`📊 Successfully updated: ${updatedCount} items`);
    if (errorCount > 0) {
      console.log(`❌ Errors encountered: ${errorCount} items`);
    }

    // Verify migration
    console.log(`🔍 Verifying migration...`);
    const verifyParams = {
      TableName: tableName,
      FilterExpression: 'component = :newComponent',
      ExpressionAttributeValues: {
        ':newComponent': newComponentName
      },
      Select: 'COUNT'
    };

    const verifyResult = await dynamodb.send(new ScanCommand(verifyParams));
    console.log(`✅ Verification: Found ${verifyResult.Count} items with new component name`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateComponentName()
  .then(() => {
    console.log('🎉 Component name migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });