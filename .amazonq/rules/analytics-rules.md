# Analytics Rules - MANDATORY TRACKING REQUIREMENTS

**CRITICAL**: ALL frontend components and pages MUST implement analytics tracking

**REQUIRED PROCESS** for all components:

1. **Component Registration**: Every component must define a unique name for analytics
   - Use kebab-case naming: `user-profile`, `post-list`, `admin-dashboard`
   - Name must be descriptive and stable across refactors
   - Register component name in analytics service on mount

2. **Action Tracking**: Track all meaningful user interactions
   - **REQUIRED ACTIONS**: `view`, `click`, `submit`, `error`
   - **OPTIONAL ACTIONS**: `hover`, `focus`, `scroll`, `resize`
   - Use descriptive action names: `submit-form`, `click-delete-button`

3. **Error Tracking**: All errors must be logged with context
   - Catch and log all try/catch blocks
   - Log validation errors with field names
   - Include error messages and stack traces (sanitized)

4. **Sensitive Data Handling**: Never log sensitive information
   - **FORBIDDEN**: passwords, tokens, credit cards, SSNs
   - **ENCRYPT**: email addresses, phone numbers, addresses
   - **ALLOWED**: user IDs, component names, action types

**IMPLEMENTATION REQUIREMENTS**:

```javascript
// Component registration (required on mount)
useAnalytics('component-name');

// Action tracking (required for interactions)
trackAction('click', 'button-name', { metadata });

// Error tracking (required in catch blocks)
trackError('validation-failed', { field: 'email', component: 'login-form' });
```

**FORBIDDEN ACTIONS** without analytics:
- Do NOT create components without analytics registration
- Do NOT handle user interactions without tracking
- Do NOT catch errors without logging
- Do NOT log sensitive data in plain text

**APPLIES TO ALL**:
- Vue components (.vue files)
- React components (.jsx/.tsx files)
- Angular components (.component.ts files)
- Shared utilities and services
- Error boundaries and handlers

**VALIDATION**: Analytics tracking will be validated in code reviews and automated tests