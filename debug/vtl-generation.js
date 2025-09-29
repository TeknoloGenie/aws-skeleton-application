#!/usr/bin/env node

/**
 * Test VTL Template Generation
 * This script will show us exactly what VTL templates are being generated
 */

const { ModelParser } = require('./lib/utils/model-parser');
const { SchemaGenerator } = require('./lib/utils/schema-generator');

async function testVTLGeneration() {
  try {
    console.log('🧪 Testing VTL Template Generation...\n');
    
    // Parse models
    const modelParser = new ModelParser();
    const models = modelParser.parseModels();
    
    console.log(`📋 Found ${models.length} models:`);
    models.forEach(model => {
      console.log(`  - ${model.name} (${model.dataSource.engine})`);
    });
    
    // Create schema generator
    const schemaGenerator = new SchemaGenerator(modelParser, models);
    
    // Test Post model VTL generation
    const postModel = models.find(m => m.name === 'Post');
    if (postModel) {
      console.log('\n📝 Post Model Access Control:');
      console.log(JSON.stringify(postModel.accessControl, null, 2));
      
      console.log('\n🔧 Generated Scan Template (for listPosts):');
      const scanTemplate = schemaGenerator.generateScanTemplate(postModel);
      console.log(scanTemplate);
      
      console.log('\n🔧 Generated PutItem Template (for createPost):');
      const putTemplate = schemaGenerator.generatePutItemTemplate(postModel);
      console.log(putTemplate);
    }
    
    // Test User model VTL generation
    const userModel = models.find(m => m.name === 'User');
    if (userModel) {
      console.log('\n👤 User Model Access Control:');
      console.log(JSON.stringify(userModel.accessControl, null, 2));
      
      console.log('\n🔧 Generated Scan Template (for listUsers):');
      const scanTemplate = schemaGenerator.generateScanTemplate(userModel);
      console.log(scanTemplate);
      
      console.log('\n🔧 Generated PutItem Template (for createUser):');
      const putTemplate = schemaGenerator.generatePutItemTemplate(userModel);
      console.log(putTemplate);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error.stack);
  }
}

testVTLGeneration();
