# Task Planning Rules - MANDATORY DISCUSSION AND TEST PLANNING

**CRITICAL**: NEVER provide code directly without following workflow

**REQUIRED PROCESS**:

1. **Workflow Classification**: Determine Task/QA Finding/Discussion
2. **Discussion Phase**: Review related files and tests (MANDATORY)
3. **Task Information Gathering**: 
   - Frontend or Backend?
   - New Feature or Improvement?
   - Task title and description
   - Component/service files involved
4. **Test Planning**: MUST provide test update/creation list BEFORE coding
5. **Implementation**: Only after test plan approval

**FORBIDDEN ACTIONS** before test plan approval:
- Do NOT write any code files
- Do NOT create components or services  
- Do NOT modify existing files
- Do NOT install packages (follow package-installation-rules.md)
- Do NOT proceed with implementation

**EXAMPLE WORKFLOW**:
```
User: "Add a delete button to the user profile"
Assistant: "Let me analyze this task and create a plan:

TASK ANALYSIS:
- Scope: Add delete functionality to user profile
- Affected components: UserProfile.vue, user service, API routes
- Complexity: Medium (involves UI, API, and data deletion)

VERSION CLASSIFICATION:
- Type: MINOR (0.1.0) - New feature addition
- Reasoning: Adding new functionality that doesn't break existing features

RELATED FEATURE EXAMINATION:
- Examined User model and relationships
- Found: User has posts and settings relationships
- Potential breaking change: Deleting user may orphan related data
- Conflict risk: Need cascade delete or data cleanup strategy

PROPOSED PLAN:
1. Add delete button to UserProfile component
2. Create confirmation dialog for safety
3. Implement cascade delete for user's posts and settings
4. Add error handling and success feedback
5. Update User model if needed for soft delete option

RISKS/CONCERNS:
- Data loss is irreversible
- May need soft delete instead of hard delete
- Need to handle user session cleanup

Should I proceed with this approach, or would you prefer to discuss alternatives?"

User: [provides feedback/approval]
Assistant: [implements only after approval]
```

**APPLIES TO ALL TASKS**:
- New feature development
- Bug fixes and modifications
- Component updates
- Model changes
- API modifications
- UI/UX improvements
- Any code-related work
