import { SecurityGenerator } from '../lib/utils/security-generator';
import { ModelDefinition } from '../lib/types/model';

describe('SecurityGenerator', () => {
  let securityGenerator: SecurityGenerator;

  beforeEach(() => {
    securityGenerator = new SecurityGenerator();
  });

  const mockModel: ModelDefinition = {
    name: 'Post',
    properties: {
      id: { type: 'ID', required: true },
      title: { type: 'String', required: true },
      userId: { type: 'ID', required: true, isOwner: true },
    },
    dataSource: { type: 'database', engine: 'nosql' },
    accessControl: {
      default: 'deny',
      rules: [
        { allow: 'create', groups: ['users'] },
        { allow: 'read', groups: ['users', 'admins'] },
        { allow: 'update', owner: true },
        { allow: 'delete', owner: true },
      ],
    },
  };

  describe('generateAuthorizationCheck', () => {
    it('should generate authorization check for create operation', () => {
      const result = securityGenerator.generateAuthorizationCheck(mockModel, 'create');
      
      expect(result).toContain('Authorization check for create operation');
      expect(result).toContain('$ctx.identity.sub');
      expect(result).toContain('$ctx.identity.cognito:groups');
      expect(result).toContain('users');
    });

    it('should generate authorization check for owner-based operations', () => {
      const result = securityGenerator.generateAuthorizationCheck(mockModel, 'update');
      
      expect(result).toContain('Authorization check for update operation');
      expect(result).toContain('Owner-based access');
      expect(result).toContain('needsOwnershipCheck');
    });

    it('should handle models without access control', () => {
      const modelWithoutAuth: ModelDefinition = {
        ...mockModel,
        accessControl: undefined,
      };
      
      const result = securityGenerator.generateAuthorizationCheck(modelWithoutAuth, 'read');
      expect(result).toContain('No access control defined');
    });
  });

  describe('generateOwnershipVerification', () => {
    it('should generate ownership verification for update operations', () => {
      const result = securityGenerator.generateOwnershipVerification(mockModel, 'update');
      
      expect(result).toContain('Ownership verification for update operation');
      expect(result).toContain('needsOwnershipCheck');
      expect(result).toContain('userId');
      expect(result).toContain('$util.unauthorized()');
    });

    it('should return empty string for operations without owner rules', () => {
      const result = securityGenerator.generateOwnershipVerification(mockModel, 'read');
      
      expect(result).toBe('');
    });

    it('should generate ownership verification for update operations', () => {
      const result = securityGenerator.generateOwnershipVerification(mockModel, 'update');
      
      expect(result).toContain('Ownership verification for update operation');
      expect(result).toContain('$util.unauthorized()');
    });

    it('should return empty string for models without owner field', () => {
      const modelWithoutOwner: ModelDefinition = {
        ...mockModel,
        properties: {
          id: { type: 'ID', required: true },
          title: { type: 'String', required: true },
        },
      };
      
      const result = securityGenerator.generateOwnershipVerification(modelWithoutOwner, 'read');
      expect(result).toBe('');
    });
  });

  describe('generateGroupCheck', () => {
    it('should generate group-based authorization check', () => {
      const result = securityGenerator.generateGroupCheck(['users', 'admins']);
      
      expect(result).toContain('Group-based authorization');
      expect(result).toContain('$ctx.identity.cognito:groups');
      expect(result).toContain('users');
      expect(result).toContain('admins');
      expect(result).toContain('$util.unauthorized()');
    });

    it('should return empty string for empty groups array', () => {
      const result = securityGenerator.generateGroupCheck([]);
      expect(result).toBe('');
    });
  });

  describe('generatePreOperationOwnershipCheck', () => {
    it('should generate pre-operation ownership check for update', () => {
      const result = securityGenerator.generatePreOperationOwnershipCheck(mockModel, 'update');
      
      expect(result).toContain('Pre-operation ownership check for update');
      expect(result).toContain('GetItem');
      expect(result).toContain('needsOwnershipCheck');
    });

    it('should generate pre-operation ownership check for delete', () => {
      const result = securityGenerator.generatePreOperationOwnershipCheck(mockModel, 'delete');
      
      expect(result).toContain('Pre-operation ownership check for delete');
      expect(result).toContain('GetItem');
    });
  });
});
