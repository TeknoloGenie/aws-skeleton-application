# Debugging Guide

## Debug Logging Standards

### Basic Pattern
```typescript
if (process.env.STAGE === 'development') {
  console.log('[DEBUG] Function entry:', { functionName: 'myFunction', args: arguments });
  console.log('[DEBUG] Variable state:', { variable1, variable2, variable3 });
  console.log('[DEBUG] Processing step:', stepName, stepData);
  console.log('[DEBUG] Function exit:', { result, executionTime: Date.now() - startTime });
}
```

### Debug Log Categories
- `[DEBUG-ENTRY]` - Function entry points
- `[DEBUG-STATE]` - Variable state snapshots
- `[DEBUG-FLOW]` - Logic flow checkpoints
- `[DEBUG-ERROR]` - Error handling and recovery
- `[DEBUG-PERF]` - Performance measurements
- `[DEBUG-DATA]` - Data transformation steps

### Lambda Function Debug Pattern
```typescript
if (process.env.STAGE === 'development') {
  console.log('[DEBUG-LAMBDA]', {
    functionName: context.functionName,
    requestId: context.awsRequestId,
    remainingTime: context.getRemainingTimeInMillis(),
    event: JSON.stringify(event, null, 2)
  });
}
```

### Frontend Debug Pattern
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG-COMPONENT]', {
    component: 'ComponentName',
    props: props,
    state: state,
    action: 'actionName',
    timestamp: new Date().toISOString()
  });
}
```

### GraphQL Resolver Debug Pattern
```typescript
if (process.env.STAGE === 'development') {
  console.log('[DEBUG-RESOLVER]', {
    typeName: '$context.info.parentTypeName',
    fieldName: '$context.info.fieldName',
    arguments: '$context.arguments',
    identity: '$context.identity'
  });
}
```

### Production Safety Rules
- **Never log sensitive data** (passwords, tokens, PII)
- **Always use environment checks** to prevent production logging
- **Use structured logging** for easy parsing and filtering
- **Include correlation IDs** for tracing across services

### Testing Phase Integration
During testing, debug logs should be:
1. **Actively monitored** for unexpected values or behaviors
2. **Used to validate** logic flow and data transformations
3. **Analyzed for optimization** opportunities
4. **Documented** if they reveal important insights

### Debug Log Cleanup Checklist
Before task completion:
- [ ] Review all debug logs for sensitive information
- [ ] Ensure all debug logs are properly wrapped in environment checks
- [ ] Remove any temporary debug code not following standards
- [ ] Verify debug logs provide value for future development
