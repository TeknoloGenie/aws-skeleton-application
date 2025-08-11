# Task Planning Rules - MANDATORY DISCUSSION AND ANALYSIS

**CRITICAL**: NEVER provide code directly without first discussing, outlining, and planning the task

**REQUIRED PROCESS** for all tasks (regardless of size):

1. **Task Analysis**: Before writing any code
   - Understand the full scope of the request
   - Identify all components that will be affected
   - Determine the complexity level (small/medium/large)
   - List all files that need to be created or modified

2. **Version Classification**: Determine change type for proper versioning
   - Analyze if this is a bug fix (patch), new feature (minor), or breaking change (major)
   - If uncertain about classification, ask user for clarification
   - Document the reasoning for the classification choice
   - **Patch (0.0.1)**: Bug fixes, hotfixes, security patches
   - **Minor (0.1.0)**: New features, improvements, enhancements
   - **Major (1.0.0)**: Breaking changes, API changes, architecture changes

3. **Related Feature Examination**: Check for connections to existing features
   - Examine related models, components, and services
   - Identify potential breaking changes
   - Check for conflicts with existing functionality
   - Review dependencies and relationships

4. **Planning Discussion**: Present a comprehensive plan
   - Outline the approach and implementation strategy
   - Highlight any risks or concerns
   - Propose alternatives if applicable
   - Estimate effort and complexity

5. **Wait for Approval**: Do NOT proceed with implementation until approved
   - User may approve the plan as-is
   - User may request modifications to the approach
   - User may want to discuss alternatives
   - User may decide to postpone or cancel

**FORBIDDEN ACTIONS** before planning approval:
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

**WHEN UNCERTAIN ABOUT VERSION CLASSIFICATION**:
```
Assistant: "I'm analyzing this task but need clarification on version classification:

The task could be classified as either:
- PATCH: If this fixes a missing functionality that should have been there
- MINOR: If this is a new feature enhancement

How would you classify this change for versioning purposes?"
```

**APPLIES TO ALL TASKS**:
- New feature development
- Bug fixes and modifications
- Component updates
- Model changes
- API modifications
- UI/UX improvements
- Any code-related work
