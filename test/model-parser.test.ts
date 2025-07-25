import { ModelParser } from '../lib/utils/model-parser';
import { ModelDefinition } from '../lib/types/model';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ModelParser', () => {
  let modelParser: ModelParser;
  const testModelsDir = 'test-models';

  beforeEach(() => {
    modelParser = new ModelParser(testModelsDir);
    jest.clearAllMocks();
  });

  describe('parseModels', () => {
    it('should return empty array when models directory does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = modelParser.parseModels();
      
      expect(result).toEqual([]);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(path.resolve(testModelsDir));
    });

    it('should parse valid model files', () => {
      const mockModel = {
        name: 'User',
        properties: {
          id: { type: 'ID', required: true },
          name: { type: 'String', required: true }
        },
        dataSource: {
          type: 'database',
          engine: 'nosql'
        }
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['User.json', 'Post.json', 'User.seed.json'] as any);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockModel));

      const result = modelParser.parseModels();

      expect(result).toHaveLength(2); // Should only parse .json files, not .seed.json
      expect(result[0]).toEqual(mockModel);
    });

    it('should handle invalid JSON files gracefully', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['Invalid.json'] as any);
      mockedFs.readFileSync.mockReturnValue('invalid json');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = modelParser.parseModels();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('generateGraphQLType', () => {
    it('should generate correct GraphQL type definition', () => {
      const model: ModelDefinition = {
        name: 'User',
        properties: {
          id: { type: 'ID', required: true },
          name: { type: 'String', required: true },
          email: { type: 'String', required: false }
        },
        dataSource: {
          type: 'database',
          engine: 'nosql'
        }
      };

      const result = modelParser.generateGraphQLType(model);

      expect(result).toContain('type User {');
      expect(result).toContain('id: ID!');
      expect(result).toContain('name: String!');
      expect(result).toContain('email: String');
      expect(result).toContain('input CreateUserInput {');
      expect(result).toContain('input UpdateUserInput {');
      expect(result).toContain('input DeleteUserInput {');
    });

    it('should include relationship fields', () => {
      const model: ModelDefinition = {
        name: 'User',
        properties: {
          id: { type: 'ID', required: true }
        },
        relationships: {
          posts: {
            type: 'hasMany',
            target: 'Post',
            foreignKey: 'userId'
          }
        },
        dataSource: {
          type: 'database',
          engine: 'nosql'
        }
      };

      const result = modelParser.generateGraphQLType(model);

      expect(result).toContain('posts: [Post]');
    });
  });
});
