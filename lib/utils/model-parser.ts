import * as fs from 'fs';
import * as path from 'path';
import { ModelDefinition, SeedData } from '../types/model';

export class ModelParser {
  private modelsDir: string;

  constructor(modelsDir: string = 'models') {
    this.modelsDir = path.resolve(modelsDir);
  }

  /**
   * Parse all model.json files from the models directory
   */
  parseModels(): ModelDefinition[] {
    const models: ModelDefinition[] = [];

    if (!fs.existsSync(this.modelsDir)) {
      console.warn(`Models directory ${this.modelsDir} does not exist`);
      return models;
    }

    const files = fs.readdirSync(this.modelsDir);
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('.seed.json')) {
        const filePath = path.join(this.modelsDir, file);
        try {
          const modelData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          models.push(modelData as ModelDefinition);
        } catch (error) {
          console.error(`Error parsing model file ${file}:`, error);
        }
      }
    }

    return models;
  }

  /**
   * Parse seed data files
   */
  parseSeedData(): SeedData {
    const seedData: SeedData = {};

    if (!fs.existsSync(this.modelsDir)) {
      return seedData;
    }

    const files = fs.readdirSync(this.modelsDir);
    
    for (const file of files) {
      if (file.endsWith('.seed.json')) {
        const modelName = file.replace('.seed.json', '');
        const filePath = path.join(this.modelsDir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          seedData[modelName] = data;
        } catch (error) {
          console.error(`Error parsing seed file ${file}:`, error);
        }
      }
    }

    return seedData;
  }

  /**
   * Archive seed file after processing
   */
  archiveSeedFile(modelName: string): void {
    const seedFile = path.join(this.modelsDir, `${modelName}.seed.json`);
    const archiveFile = path.join(this.modelsDir, `${modelName}.seed.json.processed`);
    
    if (fs.existsSync(seedFile)) {
      fs.renameSync(seedFile, archiveFile);
    }
  }

  /**
   * Generate GraphQL type definition from model
   */
  generateGraphQLType(model: ModelDefinition): string {
    let typeDef = `type ${model.name} {\n`;
    
    for (const [propName, propDef] of Object.entries(model.properties)) {
      const required = propDef.required ? '!' : '';
      typeDef += `  ${propName}: ${propDef.type}${required}\n`;
    }

    // Add relationship fields
    if (model.relationships) {
      for (const [fieldName, relationship] of Object.entries(model.relationships)) {
        if (relationship.type === 'hasMany') {
          typeDef += `  ${fieldName}: [${relationship.target}]\n`;
        } else {
          typeDef += `  ${fieldName}: ${relationship.target}\n`;
        }
      }
    }

    typeDef += '}\n\n';

    // Generate input types
    typeDef += this.generateInputTypes(model);

    return typeDef;
  }

  /**
   * Generate GraphQL input types for mutations
   */
  private generateInputTypes(model: ModelDefinition): string {
    let inputTypes = '';

    // Get owner field to exclude from create input
    const ownerField = this.getOwnerField(model);

    // Create input - exclude id, timestamps, and owner field (auto-populated)
    inputTypes += `input Create${model.name}Input {\n`;
    for (const [propName, propDef] of Object.entries(model.properties)) {
      if (propName !== 'id' && 
          propName !== 'createdAt' && 
          propName !== 'updatedAt' &&
          propName !== ownerField) {
        const required = propDef.required ? '!' : '';
        inputTypes += `  ${propName}: ${propDef.type}${required}\n`;
      }
    }
    inputTypes += '}\n\n';

    // Update input - exclude timestamps (auto-updated)
    inputTypes += `input Update${model.name}Input {\n`;
    inputTypes += `  id: ID!\n`;
    for (const [propName, propDef] of Object.entries(model.properties)) {
      if (propName !== 'id' && 
          propName !== 'createdAt' && 
          propName !== 'updatedAt') {
        inputTypes += `  ${propName}: ${propDef.type}\n`;
      }
    }
    inputTypes += '}\n\n';

    // Delete input
    inputTypes += `input Delete${model.name}Input {\n`;
    inputTypes += `  id: ID!\n`;
    inputTypes += '}\n\n';

    return inputTypes;
  }

  /**
   * Get the owner field name from model properties
   */
  private getOwnerField(model: ModelDefinition): string | null {
    for (const [fieldName, fieldDef] of Object.entries(model.properties)) {
      if (fieldDef.isOwner) {
        return fieldName;
      }
    }
    return null;
  }

  /**
   * Generate GraphQL queries and mutations
   */
  generateGraphQLOperations(model: ModelDefinition): string {
    let operations = '';

    // Queries
    operations += `  get${model.name}(id: ID!): ${model.name}\n`;
    operations += `  list${model.name}s: [${model.name}]\n`;

    // Mutations
    operations += `  create${model.name}(input: Create${model.name}Input!): ${model.name}\n`;
    operations += `  update${model.name}(input: Update${model.name}Input!): ${model.name}\n`;
    operations += `  delete${model.name}(input: Delete${model.name}Input!): ${model.name}\n`;

    return operations;
  }

  /**
   * Generate GraphQL subscriptions if enabled
   */
  generateGraphQLSubscriptions(model: ModelDefinition): string {
    if (!model.enableSubscriptions) {
      return '';
    }

    let subscriptions = '';
    subscriptions += `  onCreate${model.name}: ${model.name}\n`;
    subscriptions += `  onUpdate${model.name}: ${model.name}\n`;
    subscriptions += `  onDelete${model.name}: ${model.name}\n`;

    return subscriptions;
  }
}
