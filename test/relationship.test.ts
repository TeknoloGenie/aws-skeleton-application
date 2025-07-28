import { RelationshipGenerator } from '../lib/utils/relationship-generator';
import { ModelDefinition } from '../lib/types/model';

describe('RelationshipGenerator', () => {
  let relationshipGenerator: RelationshipGenerator;
  let mockModels: ModelDefinition[];

  beforeEach(() => {
    mockModels = [
      {
        name: 'User',
        properties: {
          id: { type: 'ID', required: true },
          name: { type: 'String', required: true },
          userId: { type: 'ID', required: true, isOwner: true },
        },
        dataSource: { type: 'database', engine: 'nosql' },
        relationships: {
          posts: {
            type: 'hasMany',
            target: 'Post',
            foreignKey: 'userId',
          },
        },
      },
      {
        name: 'Post',
        properties: {
          id: { type: 'ID', required: true },
          title: { type: 'String', required: true },
          userId: { type: 'ID', required: true, isOwner: true },
        },
        dataSource: { type: 'database', engine: 'nosql' },
        relationships: {
          user: {
            type: 'belongsTo',
            target: 'User',
            foreignKey: 'userId',
          },
        },
        accessControl: {
          default: 'deny',
          rules: [
            { allow: 'read', groups: ['users'] },
            { allow: 'read', owner: true },
          ],
        },
      },
    ];

    relationshipGenerator = new RelationshipGenerator(mockModels);
  });

  describe('generateRelationshipFields', () => {
    it('should generate GraphQL fields for hasMany relationships', () => {
      const result = relationshipGenerator.generateRelationshipFields(mockModels[0]);
      
      expect(result).toContain('posts: [Post!]!');
    });

    it('should generate GraphQL fields for belongsTo relationships', () => {
      const result = relationshipGenerator.generateRelationshipFields(mockModels[1]);
      
      expect(result).toContain('user: User');
    });

    it('should return empty string for models without relationships', () => {
      const modelWithoutRelationships: ModelDefinition = {
        ...mockModels[0],
        relationships: undefined,
      };
      
      const result = relationshipGenerator.generateRelationshipFields(modelWithoutRelationships);
      expect(result).toBe('');
    });
  });

  describe('generateRelationshipResolvers', () => {
    it('should generate resolvers for all relationships', () => {
      const result = relationshipGenerator.generateRelationshipResolvers(mockModels[0]);
      
      expect(result).toHaveLength(1);
      expect(result[0].fieldName).toBe('posts');
      expect(result[0].relationship.type).toBe('hasMany');
    });

    it('should generate hasMany request template for DynamoDB', () => {
      const result = relationshipGenerator.generateRelationshipResolvers(mockModels[0]);
      const resolver = result[0];
      
      expect(resolver.requestTemplate).toContain('Query');
      expect(resolver.requestTemplate).toContain('userIdIndex');
      expect(resolver.requestTemplate).toContain('$ctx.source.id');
    });

    it('should generate belongsTo request template for DynamoDB', () => {
      const result = relationshipGenerator.generateRelationshipResolvers(mockModels[1]);
      const resolver = result[0];
      
      expect(resolver.requestTemplate).toContain('GetItem');
      expect(resolver.requestTemplate).toContain('$ctx.source.userId');
    });

    it('should include authorization in response templates', () => {
      const result = relationshipGenerator.generateRelationshipResolvers(mockModels[1]);
      const resolver = result[0];
      
      expect(resolver.responseTemplate).toContain('Apply relationship-based authorization');
      expect(resolver.responseTemplate).toContain('$canAccessItem');
    });
  });

  describe('generateGSIDefinitions', () => {
    it('should generate GSI for hasMany relationships', () => {
      const result = relationshipGenerator.generateGSIDefinitions(mockModels[1]); // Post model
      
      expect(result).toHaveLength(1);
      expect(result[0].indexName).toBe('userIdIndex');
      expect(result[0].partitionKey).toBe('userId');
    });

    it('should not generate GSI for belongsTo relationships', () => {
      const result = relationshipGenerator.generateGSIDefinitions(mockModels[0]); // User model
      
      expect(result).toHaveLength(0);
    });
  });

  describe('validateRelationships', () => {
    it('should validate that target models exist', () => {
      const invalidModels: ModelDefinition[] = [
        {
          ...mockModels[0],
          relationships: {
            posts: {
              type: 'hasMany',
              target: 'NonExistentModel',
            },
          },
        },
      ];

      const generator = new RelationshipGenerator(invalidModels);
      const errors = generator.validateRelationships();
      
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('NonExistentModel');
    });

    it('should validate that foreign keys exist for belongsTo relationships', () => {
      const invalidModels: ModelDefinition[] = [
        {
          name: 'Post',
          properties: {
            id: { type: 'ID', required: true },
            title: { type: 'String', required: true },
            // Missing userId foreign key
          },
          dataSource: { type: 'database', engine: 'nosql' },
          relationships: {
            user: {
              type: 'belongsTo',
              target: 'User',
              foreignKey: 'userId',
            },
          },
        },
        mockModels[0], // User model
      ];

      const generator = new RelationshipGenerator(invalidModels);
      const errors = generator.validateRelationships();
      
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('Foreign key \'userId\' not found');
    });

    it('should return no errors for valid relationships', () => {
      const errors = relationshipGenerator.validateRelationships();
      expect(errors).toHaveLength(0);
    });
  });
});
