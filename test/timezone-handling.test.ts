import { SchemaGenerator } from '../lib/utils/schema-generator';
import { ModelParser } from '../lib/utils/model-parser';
import { ModelDefinition } from '../lib/types/model';

describe('Timezone Handling', () => {
  let schemaGenerator: SchemaGenerator;
  let modelParser: ModelParser;

  beforeEach(() => {
    modelParser = new ModelParser();
    schemaGenerator = new SchemaGenerator(modelParser, []);
  });

  test('should generate timezone conversion for datetime fields', () => {
    const model: ModelDefinition = {
      name: 'TestModel',
      properties: {
        id: { type: 'ID', required: true },
        createdAt: { type: 'AWSDateTime', required: true },
        updatedAt: { type: 'AWSDateTime', required: false },
        name: { type: 'String', required: true }
      },
      dataSource: { type: 'database', engine: 'nosql' }
    };

    const conversion = (schemaGenerator as any).generateTimezoneConversion(model);
    
    expect(conversion).toContain('createdAt_local');
    expect(conversion).toContain('updatedAt_local');
    expect(conversion).toContain('$userTimezone');
    expect(conversion).not.toContain('name_local');
  });

  test('should handle models without datetime fields', () => {
    const model: ModelDefinition = {
      name: 'TestModel',
      properties: {
        id: { type: 'ID', required: true },
        name: { type: 'String', required: true }
      },
      dataSource: { type: 'database', engine: 'nosql' }
    };

    const conversion = (schemaGenerator as any).generateTimezoneConversion(model);
    
    expect(conversion).toBe('');
  });

  test('should include timezone header in resolver templates', () => {
    const model: ModelDefinition = {
      name: 'TestModel',
      properties: {
        id: { type: 'ID', required: true },
        createdAt: { type: 'AWSDateTime', required: true }
      },
      dataSource: { type: 'database', engine: 'nosql' }
    };

    const resolvers = schemaGenerator.generateDynamoDBResolvers(model);
    
    expect(resolvers.request).toContain('x-user-timezone');
    expect(resolvers.request).toContain('$userTimezone');
    expect(resolvers.response).toContain('$userTimezone');
  });
});