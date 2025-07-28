import { handler } from '../lib/lambda/aws-exports-generator';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe.skip('AWS Exports Generator', () => {
  const mockEvent: CloudFormationCustomResourceEvent = {
    RequestType: 'Create',
    ResponseURL: 'https://example.com',
    StackId: 'test-stack',
    RequestId: 'test-request',
    LogicalResourceId: 'test-resource',
    ResourceType: 'Custom::AwsExportsGenerator',
    ServiceToken: 'test-token',
    ResourceProperties: {
      ServiceToken: 'test-token',
      UserPoolId: 'us-east-1_TEST123',
      UserPoolClientId: 'test-client-id',
      GraphQLApiUrl: 'https://test.appsync-api.us-east-1.amazonaws.com/graphql',
      GraphQLApiId: 'test-api-id',
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.USER_POOL_ID = 'us-east-1_TEST123';
    process.env.USER_POOL_CLIENT_ID = 'test-client-id';
    process.env.GRAPHQL_API_URL = 'https://test.appsync-api.us-east-1.amazonaws.com/graphql';
    process.env.GRAPHQL_API_ID = 'test-api-id';
    process.env.AWS_REGION = 'us-east-1';
    process.env.APP_NAME = 'TestApp';
    process.env.STAGE = 'test';
    process.env.MODELS = JSON.stringify([
      { name: 'User', hasSubscriptions: true, hasRateLimit: false },
      { name: 'Post', hasSubscriptions: false, hasRateLimit: false },
      { name: 'GeoData', hasSubscriptions: false, hasRateLimit: true },
    ]);

    // Mock fs methods
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation();
    mockFs.writeFileSync.mockImplementation();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.USER_POOL_ID;
    delete process.env.USER_POOL_CLIENT_ID;
    delete process.env.GRAPHQL_API_URL;
    delete process.env.GRAPHQL_API_ID;
    delete process.env.AWS_REGION;
    delete process.env.APP_NAME;
    delete process.env.STAGE;
    delete process.env.MODELS;
  });

  it('should generate aws-exports.js successfully', async () => {
    const result = await handler(mockEvent);

    expect(result.Status).toBe('SUCCESS');
    expect(result.Data?.ConfigGenerated).toBe('true');
    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // JS and TS versions
  });

  it('should generate correct aws-exports.js content', async () => {
    await handler(mockEvent);

    const writeFileCall = mockFs.writeFileSync.mock.calls.find(call => 
      call[0].toString().includes('aws-exports.js')
    );
    
    expect(writeFileCall).toBeDefined();
    const generatedContent = writeFileCall![1] as string;

    // Check that the generated content includes expected values
    expect(generatedContent).toContain('us-east-1_TEST123');
    expect(generatedContent).toContain('test-client-id');
    expect(generatedContent).toContain('https://test.appsync-api.us-east-1.amazonaws.com/graphql');
    expect(generatedContent).toContain('us-east-1');
    expect(generatedContent).toContain('TestApp');
    expect(generatedContent).toContain('test');
  });

  it('should include real-time endpoint when subscriptions are enabled', async () => {
    await handler(mockEvent);

    const writeFileCall = mockFs.writeFileSync.mock.calls.find(call => 
      call[0].toString().includes('aws-exports.js')
    );
    
    const generatedContent = writeFileCall![1] as string;
    expect(generatedContent).toContain('aws_appsync_realTimeEndpoint');
    expect(generatedContent).toContain('wss://test.appsync-api.us-east-1.amazonaws.com/realtime');
  });

  it('should include job completion endpoint when rate limiting is enabled', async () => {
    await handler(mockEvent);

    const writeFileCall = mockFs.writeFileSync.mock.calls.find(call => 
      call[0].toString().includes('aws-exports.js')
    );
    
    const generatedContent = writeFileCall![1] as string;
    expect(generatedContent).toContain('aws_appsync_jobCompletionEndpoint');
  });

  it('should create directory if it does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);

    await handler(mockEvent);

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('frontend/src'),
      { recursive: true }
    );
  });

  it('should generate TypeScript version', async () => {
    await handler(mockEvent);

    const tsWriteCall = mockFs.writeFileSync.mock.calls.find(call => 
      call[0].toString().includes('aws-exports.ts')
    );
    
    expect(tsWriteCall).toBeDefined();
    const tsContent = tsWriteCall![1] as string;
    expect(tsContent).toContain('const awsmobile: any = {');
  });

  it('should handle missing environment variables', async () => {
    delete process.env.USER_POOL_ID;

    const result = await handler(mockEvent);

    expect(result.Status).toBe('FAILED');
    expect(result.Reason).toContain('Missing required environment variables');
  });

  it('should handle file system errors', async () => {
    mockFs.writeFileSync.mockImplementation(() => {
      throw new Error('File system error');
    });

    const result = await handler(mockEvent);

    expect(result.Status).toBe('FAILED');
    expect(result.Reason).toContain('File system error');
  });

  it('should include model information in generated config', async () => {
    await handler(mockEvent);

    const writeFileCall = mockFs.writeFileSync.mock.calls.find(call => 
      call[0].toString().includes('aws-exports.js')
    );
    
    const generatedContent = writeFileCall![1] as string;
    expect(generatedContent).toContain('"models"');
    expect(generatedContent).toContain('User');
    expect(generatedContent).toContain('Post');
    expect(generatedContent).toContain('GeoData');
  });
});
