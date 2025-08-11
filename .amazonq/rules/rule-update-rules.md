# Rule Update Rules - MANDATORY APPROVAL PROCESS

**CRITICAL**: When updating ANY rule file, NEVER implement changes directly

**REQUIRED PROCESS** for all rule updates:

1. **Present Changes First**: Show the proposed changes in a clear format
   - Display current rule content
   - Show proposed new content
   - Highlight what will be added, modified, or removed
   - Explain the reasoning for the changes

2. **Wait for Feedback**: Do NOT implement until user provides feedback
   - User may approve as-is
   - User may request modifications
   - User may reject the changes
   - User may provide additional requirements

3. **Implement Only After Approval**: Only make the actual file changes after explicit approval

**FORBIDDEN ACTIONS** before approval:
- Do NOT write to rule files directly
- Do NOT use fs_write to update rules
- Do NOT make any changes to .amazonq/rules/ directory
- Do NOT proceed without explicit user approval

**EXAMPLE WORKFLOW**:
```
User: "Update the versioning rules to add X"
Assistant: "Here are the proposed changes to versioning-rules.md:

CURRENT:
[show current content]

PROPOSED:
[show new content with changes highlighted]

CHANGES:
- Added: [specific additions]
- Modified: [specific modifications]
- Removed: [specific removals]

Should I implement these changes?"

User: [provides feedback/approval]
Assistant: [implements only after approval]
```

**APPLIES TO ALL RULE FILES**:
- versioning-rules.md
- code-requirement-rules.md
- documentation-rules.md
- security-rules.md
- testing-rules.md
- code-quality-rules.md
- infrastructure-rules.md
- chat-rules.md
- rule-update-rules.md (this file)
- Any other files in .amazonq/rules/ directory
