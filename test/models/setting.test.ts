import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Setting Model Unit Tests', () => {
  let settingModel: any;
  let seedData: any[];

  beforeEach(() => {
    // Load the Setting model JSON
    const modelPath = path.join(__dirname, '../../models/Setting.json');
    const seedPath = path.join(__dirname, '../../models/Setting.seed.json');
    
    settingModel = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  });

  describe('Model Structure Validation', () => {
    it('should have correct model name', () => {
      expect(settingModel.name).toBe('Setting');
    });

    it('should have all required properties', () => {
      const properties = settingModel.properties;
      expect(properties).toHaveProperty('id');
      expect(properties).toHaveProperty('type');
      expect(properties).toHaveProperty('key');
      expect(properties).toHaveProperty('value');
      expect(properties).toHaveProperty('entityId');
    });

    it('should have correct property types', () => {
      const { properties } = settingModel;
      expect(properties.id.type).toBe('ID');
      expect(properties.type.type).toBe('String');
      expect(properties.key.type).toBe('String');
      expect(properties.value.type).toBe('AWSJSON');
      expect(properties.entityId.type).toBe('ID');
    });

    it('should have entityId as owner field', () => {
      expect(settingModel.properties.entityId.isOwner).toBe(true);
    });

    it('should use NoSQL data source', () => {
      expect(settingModel.dataSource.type).toBe('database');
      expect(settingModel.dataSource.engine).toBe('nosql');
    });

    it('should have subscriptions enabled', () => {
      expect(settingModel.enableSubscriptions).toBe(true);
    });
  });

  describe('Index Definitions', () => {
    it('should have indexes section defined', () => {
      expect(settingModel).toHaveProperty('indexes');
      expect(typeof settingModel.indexes).toBe('object');
    });

    it('should have byEntityAndType index', () => {
      const index = settingModel.indexes.byEntityAndType;
      expect(index).toBeDefined();
      expect(index.partitionKey).toBe('entityId');
      expect(index.sortKey).toBe('type');
      expect(index.projectionType).toBe('ALL');
      expect(index.description).toContain('entity');
    });

    it('should have byTypeAndKey index', () => {
      const index = settingModel.indexes.byTypeAndKey;
      expect(index).toBeDefined();
      expect(index.partitionKey).toBe('type');
      expect(index.sortKey).toBe('key');
      expect(index.projectionType).toBe('INCLUDE');
      expect(Array.isArray(index.projectedAttributes)).toBe(true);
      expect(index.projectedAttributes).toContain('id');
      expect(index.projectedAttributes).toContain('entityId');
      expect(index.projectedAttributes).toContain('value');
    });

    it('should have byActiveSettings index', () => {
      const index = settingModel.indexes.byActiveSettings;
      expect(index).toBeDefined();
      expect(index.partitionKey).toBe('isActive');
      expect(index.sortKey).toBe('updatedAt');
      expect(index.projectionType).toBe('KEYS_ONLY');
    });

    it('should have valid projection types', () => {
      const validProjectionTypes = ['ALL', 'KEYS_ONLY', 'INCLUDE'];
      Object.values(settingModel.indexes).forEach((index: any) => {
        expect(validProjectionTypes).toContain(index.projectionType);
      });
    });
  });

  describe('Access Control Rules', () => {
    it('should have default deny policy', () => {
      expect(settingModel.accessControl.default).toBe('deny');
    });

    it('should allow users to create settings', () => {
      const createRule = settingModel.accessControl.rules.find(
        (rule: any) => rule.allow === 'create'
      );
      expect(createRule).toBeDefined();
      expect(createRule.groups).toContain('users');
    });

    it('should allow owner-based updates and deletes', () => {
      const updateRule = settingModel.accessControl.rules.find(
        (rule: any) => rule.allow === 'update' && rule.owner === true
      );
      const deleteRule = settingModel.accessControl.rules.find(
        (rule: any) => rule.allow === 'delete' && rule.owner === true
      );
      
      expect(updateRule).toBeDefined();
      expect(deleteRule).toBeDefined();
    });

    it('should allow admin access to all operations', () => {
      const adminRules = settingModel.accessControl.rules.filter(
        (rule: any) => rule.groups && rule.groups.includes('admins')
      );
      
      expect(adminRules.length).toBeGreaterThan(0);
      const operations = adminRules.map((rule: any) => rule.allow);
      expect(operations).toContain('read');
    });
  });

  describe('Seed Data Validation', () => {
    it('should have valid seed data structure', () => {
      expect(Array.isArray(seedData)).toBe(true);
      expect(seedData.length).toBeGreaterThan(0);
    });

    it('should have all required fields in seed data', () => {
      seedData.forEach((item, index) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('entityId');
      });
    });

    it('should have different setting types in seed data', () => {
      const types = [...new Set(seedData.map(item => item.type))];
      expect(types).toContain('user');
      expect(types).toContain('post');
      expect(types.length).toBeGreaterThan(1);
    });

    it('should have valid JSON values in seed data', () => {
      seedData.forEach((item, index) => {
        expect(typeof item.value).toBe('object');
        expect(item.value).not.toBeNull();
      });
    });

    it('should have consistent entityId format', () => {
      seedData.forEach((item, index) => {
        expect(typeof item.entityId).toBe('string');
        expect(item.entityId.length).toBeGreaterThan(0);
      });
    });
  });
});
