import { jest } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.STAGE = process.env.STAGE || 'development';
  process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
  
  // Mock console methods in test environment to reduce noise
  if (process.env.JEST_SILENT === 'true') {
    global.console = {
      ...console,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  }
});

// Global test teardown
afterAll(() => {
  // Cleanup any global resources
});

// Increase timeout for integration and E2E tests
if (process.env.TEST_TYPE === 'integration' || process.env.TEST_TYPE === 'e2e') {
  jest.setTimeout(60000);
}

// Mock AWS SDK clients for unit tests
if (process.env.TEST_TYPE === 'unit') {
  jest.mock('@aws-sdk/client-dynamodb');
  jest.mock('@aws-sdk/client-appsync');
  jest.mock('@aws-sdk/client-secrets-manager');
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
