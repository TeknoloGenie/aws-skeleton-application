# Package Installation Rules - MANDATORY APPROVAL PROCESS

**CRITICAL**: NEVER install ANY new packages without explicit user approval

**REQUIRED PROCESS** for all package installations:

1. **Request Permission First**: Before installing any new package
   - Identify the specific package name and version
   - Explain why the package is needed
   - Show the installation command that will be used
   - Wait for explicit approval

2. **Install Only After Approval**: Only install packages after user confirms
   - Use the exact installation command approved by user
   - Verify installation was successful
   - Confirm package is available for testing

3. **No Assumptions**: Do NOT install packages based on assumptions
   - Even if package seems obviously needed
   - Even if it's a common/popular package
   - Even if it's for testing purposes

**TASK COMPLETION WORKFLOW**:
- When a task requires a new package, STOP and request approval first
- Do NOT proceed with task implementation until package is approved and installed
- Present the package requirement as part of the task planning phase
- Wait for approval before continuing with any implementation

**FORBIDDEN ACTIONS** before approval:
- Do NOT run npm install, yarn add, or any package manager commands
- Do NOT add packages to package.json
- Do NOT install global packages
- Do NOT install development dependencies without approval

**EXAMPLE WORKFLOW**:
```
Assistant: "I need to install the following package for testing:

Package: @testing-library/react
Version: ^13.4.0
Reason: Required for React component testing
Command: npm install --save-dev @testing-library/react

May I proceed with this installation?"

User: [provides approval/rejection/modifications]
Assistant: [installs only after approval]
```

**EXAMPLE ENHANCED WORKFLOW**:
```
User: "Add unit tests for the UserSettings component"
Assistant: "To complete this task, I need to install a testing package:

Package: @testing-library/react
Reason: Required for React component testing
Command: npm install --save-dev @testing-library/react

Should I:
1. Install this package first, then proceed with test creation?
2. Or would you prefer a different testing approach?"

User: [provides approval]
Assistant: [installs package, then continues with task]
```

**APPLIES TO ALL PACKAGE TYPES**:
- Production dependencies
- Development dependencies  
- Global packages
- Peer dependencies
- Optional dependencies
- Any package manager (npm, yarn, pnpm, etc.)
