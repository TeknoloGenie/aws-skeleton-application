# Debug Tools

This directory contains debugging and testing utilities for the AWS Application Accelerator Framework.

## Scripts

- **`auth-debug.js`** - Comprehensive authentication and GraphQL testing with Amplify
- **`simple-auth-test.js`** - Simplified auth testing using direct HTTPS calls
- **`create-user-test.js`** - Direct user record creation via GraphQL
- **`vtl-generation.js`** - Test VTL template generation from models
- **`exact-match.js`** - Test exact parameter matching with Lambda functions
- **`minimal-cognito.js`** - Minimal Cognito operations testing

## Usage

```bash
# Authentication testing
node debug/auth-debug.js <email> <password>
node debug/simple-auth-test.js <email> <password>

# User creation testing
node debug/simple-auth-test.js <email> <password>  # Get token first
node debug/create-user-test.js <id-token>

# VTL template testing
node debug/vtl-generation.js

# Cognito testing
node debug/exact-match.js
node debug/minimal-cognito.js
```

## Payloads

- **`payloads/`** - Test JSON payloads for various scenarios

## VTL Samples

- **`vtl-samples/`** - Sample VTL templates for reference
