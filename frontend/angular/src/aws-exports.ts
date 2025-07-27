// Fallback AWS configuration for development
const awsExports = {
  aws_project_region: 'us-east-1',
  aws_project_name: 'MyApp',
  aws_project_stage: 'dev',
  aws_cognito_identity_pool_id: 'us-east-1:12345678-1234-1234-1234-123456789012',
  aws_cognito_region: 'us-east-1',
  aws_user_pools_id: 'us-east-1_XXXXXXXXX',
  aws_user_pools_web_client_id: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  oauth: {},
  aws_cognito_username_attributes: ['email'],
  aws_cognito_social_providers: [],
  aws_cognito_signup_attributes: ['email', 'given_name', 'family_name'],
  aws_cognito_mfa_configuration: 'OFF',
  aws_cognito_mfa_types: ['SMS'],
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: []
  },
  aws_cognito_verification_mechanisms: ['email'],
  aws_appsync_graphqlEndpoint: 'https://localhost:3000/graphql',
  aws_appsync_region: 'us-east-1',
  aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  aws_appsync_apiKey: 'da2-xxxxxxxxxxxxxxxxxxxxxxxxxx',
  aws_appsync_realTimeEndpoint: 'wss://localhost:3000/graphql',
  models: [],
  generated_at: new Date().toISOString(),
  api_id: 'xxxxxxxxxxxxxxxxxxxxxxxxxx'
};

export default awsExports;
