# Code Quality Rules - MANDATORY VALIDATION

**CRITICAL**: ALL code changes MUST pass validation before submission

## **REQUIRED VALIDATIONS**
**TypeScript Validation** → All code must pass TypeScript strict checks with no errors
**ESLint Compliance** → All code must pass ESLint checks with no errors or warnings
**Code Review** → Self-review checklist before requesting approval

## **VALIDATION PROCESS**
Before providing any code changes:
1. **Run TypeScript checks** → `npx tsc --noEmit`
2. **Run ESLint checks** → `npx eslint . --ext .ts,.tsx,.js,.jsx`
3. **Fix all errors** → No warnings or errors allowed
4. **Self-review code** → Check logic, formatting, and best practices

## **FORBIDDEN ACTIONS**
- **NEVER provide code** that fails TypeScript validation
- **NEVER provide code** that fails ESLint validation
- **NEVER skip validation checks** when writing code
- **NEVER submit code** without self-review

## **VALIDATION COMMANDS**
```bash
# TypeScript validation
npx tsc --noEmit

# ESLint validation  
npx eslint . --ext .ts,.tsx,.js,.jsx

# Fix ESLint issues automatically
npx eslint . --ext .ts,.tsx,.js,.jsx --fix
```
