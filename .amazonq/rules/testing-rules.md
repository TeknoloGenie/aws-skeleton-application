# Testing Rules - MANDATORY TEST REQUIREMENTS

**CRITICAL**: All code changes require appropriate testing

## **TEST PROCESS**
**Analyze changes** → Determine test type needed (Unit/Integration/E2E/Acceptance)
**Summarize test plan** → Wait for your approval or additional test requests
**Create passing test** → Write test that validates the work completed
**Handle failures** → If test fails, provide code fix recommendations
**Proceed on success** → If test passes, continue to versioning-rules

## **CODE COVERAGE REQUIREMENTS**
**Minimum Coverage** → Maintain minimum 70% test coverage
**Coverage Validation** → Run coverage reports after test creation
**Coverage Commands**:
```bash
# Run tests with coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## **TEST TYPES**
- **Unit Tests** → Individual functions and components
- **Integration Tests** → Component interactions and API endpoints
- **E2E Tests** → Full user workflows and scenarios
- **Acceptance Tests** → Business requirement validation
