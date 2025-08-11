import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Setting Model Integration Tests', () => {
  let settingModel: any;
  let seedData: any[];

  beforeAll(() => {
    // Load the Setting model and seed data
    const modelPath = path.join(__dirname, '../../models/Setting.json');
    const seedPath = path.join(__dirname, '../../models/Setting.seed.json');
    
    settingModel = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  });

  describe('Framework Integration', () => {
    it('should have valid model structure for CDK generation', () => {
      // Validate required top-level properties for CDK stack generation
      expect(settingModel).toHaveProperty('name');
      expect(settingModel).toHaveProperty('properties');
      expect(settingModel).toHaveProperty('dataSource');
      expect(settingModel).toHaveProperty('accessControl');
      expect(settingModel).toHaveProperty('indexes');
      expect(settingModel).toHaveProperty('enableSubscriptions');
      
      // Validate model name is valid for AWS resource naming
      expect(settingModel.name).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
      expect(settingModel.name.length).toBeLessThanOrEqual(64);
    });

    it('should have valid data source configuration', () => {
      const { dataSource } = settingModel;
      
      expect(dataSource.type).toBe('database');
      expect(dataSource.engine).toBe('nosql');
      
      // Validate that NoSQL engine will generate DynamoDB table
      expect(['nosql', 'sql']).toContain(dataSource.engine);
    });

    it('should have valid property definitions for GraphQL schema generation', () => {
      const { properties } = settingModel;
      const validGraphQLTypes = ['ID', 'String', 'Int', 'Float', 'Boolean', 'AWSDateTime', 'AWSJSON'];
      
      Object.entries(properties).forEach(([propName, propDef]: [string, any]) => {
        // Validate property name is valid for GraphQL
        expect(propName).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
        
        // Validate property type is supported
        expect(validGraphQLTypes).toContain(propDef.type);
        
        // Validate required field is boolean if present
        if (propDef.hasOwnProperty('required')) {
          expect(typeof propDef.required).toBe('boolean');
        }
        
        // Validate isOwner field is boolean if present
        if (propDef.hasOwnProperty('isOwner')) {
          expect(typeof propDef.isOwner).toBe('boolean');
        }
      });
    });

    it('should have valid access control configuration', () => {
      const { accessControl } = settingModel;
      
      // Validate default policy
      expect(['allow', 'deny']).toContain(accessControl.default);
      
      // Validate rules structure
      expect(Array.isArray(accessControl.rules)).toBe(true);
      expect(accessControl.rules.length).toBeGreaterThan(0);
      
      accessControl.rules.forEach((rule: any, index: number) => {
        // Validate rule has allow property
        expect(rule).toHaveProperty('allow');
        expect(['create', 'read', 'update', 'delete']).toContain(rule.allow);
        
        // Validate rule has either groups or owner property
        const hasGroups = rule.hasOwnProperty('groups');
        const hasOwner = rule.hasOwnProperty('owner');
        expect(hasGroups || hasOwner).toBe(true);
        
        if (hasGroups) {
          expect(Array.isArray(rule.groups)).toBe(true);
          expect(rule.groups.length).toBeGreaterThan(0);
        }
        
        if (hasOwner) {
          expect(typeof rule.owner).toBe('boolean');
        }
      });
    });

    it('should have valid index definitions for DynamoDB GSI generation', () => {
      const { indexes, properties } = settingModel;
      
      expect(typeof indexes).toBe('object');
      expect(Object.keys(indexes).length).toBeGreaterThan(0);
      
      Object.entries(indexes).forEach(([indexName, indexDef]: [string, any]) => {
        // Validate index name is valid for DynamoDB
        expect(indexName).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
        expect(indexName.length).toBeLessThanOrEqual(255);
        
        // Validate partition key exists in model properties
        expect(indexDef).toHaveProperty('partitionKey');
        expect(properties).toHaveProperty(indexDef.partitionKey);
        
        // Validate sort key exists in model properties if defined
        if (indexDef.sortKey) {
          expect(properties).toHaveProperty(indexDef.sortKey);
        }
        
        // Validate projection type
        expect(['ALL', 'KEYS_ONLY', 'INCLUDE']).toContain(indexDef.projectionType);
        
        // Validate projected attributes if INCLUDE projection
        if (indexDef.projectionType === 'INCLUDE') {
          expect(indexDef).toHaveProperty('projectedAttributes');
          expect(Array.isArray(indexDef.projectedAttributes)).toBe(true);
          expect(indexDef.projectedAttributes.length).toBeGreaterThan(0);
          
          // Validate projected attributes exist in model properties
          indexDef.projectedAttributes.forEach((attr: string) => {
            expect(properties).toHaveProperty(attr);
          });
        }
        
        // Validate description if present
        if (indexDef.description) {
          expect(typeof indexDef.description).toBe('string');
          expect(indexDef.description.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Index Design Validation', () => {
    it('should have optimal index design for query patterns', () => {
      const { indexes } = settingModel;
      
      // Validate byEntityAndType index for entity-based queries
      expect(indexes.byEntityAndType).toBeDefined();
      expect(indexes.byEntityAndType.partitionKey).toBe('entityId');
      expect(indexes.byEntityAndType.sortKey).toBe('type');
      expect(indexes.byEntityAndType.projectionType).toBe('ALL');
      
      // Validate byTypeAndKey index for type-based queries
      expect(indexes.byTypeAndKey).toBeDefined();
      expect(indexes.byTypeAndKey.partitionKey).toBe('type');
      expect(indexes.byTypeAndKey.sortKey).toBe('key');
      expect(indexes.byTypeAndKey.projectionType).toBe('INCLUDE');
      
      // Validate byActiveSettings index for active settings queries
      expect(indexes.byActiveSettings).toBeDefined();
      expect(indexes.byActiveSettings.partitionKey).toBe('isActive');
      expect(indexes.byActiveSettings.sortKey).toBe('updatedAt');
      expect(indexes.byActiveSettings.projectionType).toBe('KEYS_ONLY');
    });

    it('should have cost-optimized projection configurations', () => {
      const { indexes } = settingModel;
      
      // ALL projection for frequently accessed complete records
      expect(indexes.byEntityAndType.projectionType).toBe('ALL');
      
      // INCLUDE projection with specific attributes for targeted queries
      expect(indexes.byTypeAndKey.projectionType).toBe('INCLUDE');
      expect(indexes.byTypeAndKey.projectedAttributes).toContain('id');
      expect(indexes.byTypeAndKey.projectedAttributes).toContain('entityId');
      expect(indexes.byTypeAndKey.projectedAttributes).toContain('value');
      
      // KEYS_ONLY projection for minimal storage cost
      expect(indexes.byActiveSettings.projectionType).toBe('KEYS_ONLY');
    });
  });

  describe('Seed Data Integration', () => {
    it('should have seed data compatible with model schema', () => {
      const { properties } = settingModel;
      
      // Validate seed data structure
      expect(Array.isArray(seedData)).toBe(true);
      expect(seedData.length).toBeGreaterThan(0);
      
      // Get required properties
      const requiredProps = Object.keys(properties).filter(
        prop => properties[prop].required === true
      );
      
      seedData.forEach((item, index) => {
        // Validate required properties are present
        requiredProps.forEach(prop => {
          expect(item).toHaveProperty(prop);
        });
        
        // Validate property types match model definition
        Object.entries(properties).forEach(([propName, propDef]: [string, any]) => {
          if (item.hasOwnProperty(propName)) {
            const value = item[propName];
            
            switch (propDef.type) {
              case 'ID':
              case 'String':
                expect(typeof value).toBe('string');
                break;
              case 'Int':
                expect(typeof value).toBe('number');
                expect(Number.isInteger(value)).toBe(true);
                break;
              case 'Float':
                expect(typeof value).toBe('number');
                break;
              case 'Boolean':
                expect(typeof value).toBe('boolean');
                break;
              case 'AWSDateTime':
                expect(typeof value).toBe('string');
                expect(new Date(value).toISOString()).toBe(value);
                break;
              case 'AWSJSON':
                expect(typeof value).toBe('object');
                expect(value).not.toBeNull();
                break;
            }
          }
        });
      });
    });

    it('should have diverse seed data for testing different scenarios', () => {
      // Validate different setting types are represented
      const types = [...new Set(seedData.map(item => item.type))];
      expect(types.length).toBeGreaterThanOrEqual(2);
      expect(types).toContain('user');
      
      // Validate different keys are represented
      const keys = [...new Set(seedData.map(item => item.key))];
      expect(keys.length).toBeGreaterThanOrEqual(2);
      
      // Validate different entity IDs are represented
      const entityIds = [...new Set(seedData.map(item => item.entityId))];
      expect(entityIds.length).toBeGreaterThanOrEqual(2);
      
      // Validate both active and inactive settings if isActive field exists
      const activeSettings = seedData.filter(item => item.hasOwnProperty('isActive'));
      if (activeSettings.length > 0) {
        const activeValues = [...new Set(activeSettings.map(item => item.isActive))];
        // Should have at least some active settings
        expect(activeValues).toContain(true);
      }
    });
  });

  describe('Security Integration', () => {
    it('should have owner field properly configured', () => {
      const { properties } = settingModel;
      
      // Find the owner field
      const ownerFields = Object.entries(properties).filter(
        ([_, propDef]: [string, any]) => propDef.isOwner === true
      );
      
      expect(ownerFields.length).toBe(1);
      expect(ownerFields[0][0]).toBe('entityId');
      expect((ownerFields[0][1] as any).type).toBe('ID');
      expect((ownerFields[0][1] as any).required).toBe(true);
    });

    it('should have balanced access control rules', () => {
      const { accessControl } = settingModel;
      
      // Should have create rules for users
      const createRules = accessControl.rules.filter((rule: any) => rule.allow === 'create');
      expect(createRules.length).toBeGreaterThan(0);
      
      // Should have owner-based update/delete rules
      const ownerRules = accessControl.rules.filter((rule: any) => rule.owner === true);
      expect(ownerRules.length).toBeGreaterThan(0);
      
      // Should have admin rules
      const adminRules = accessControl.rules.filter(
        (rule: any) => rule.groups && rule.groups.includes('admins')
      );
      expect(adminRules.length).toBeGreaterThan(0);
      
      // Should have default deny policy for security
      expect(accessControl.default).toBe('deny');
    });
  });

  describe('Subscription Integration', () => {
    it('should have subscriptions enabled for real-time updates', () => {
      expect(settingModel.enableSubscriptions).toBe(true);
    });
  });
});
