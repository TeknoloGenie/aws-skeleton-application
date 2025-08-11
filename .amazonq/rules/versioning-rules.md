# Versioning Rules - STRICT ENFORCEMENT

**CRITICAL**: NEVER proceed with ANY of the following steps until the user types the EXACT phrase "This task is complete"

**FORBIDDEN ACTIONS** until completion phrase:
- Do NOT create tests
- Do NOT update version numbers  
- Do NOT generate changelogs
- Do NOT commit changes
- Do NOT run versioning workflows
- Do NOT proceed with any versioning-related activities

**REQUIRED**: Wait for user to type exactly: "This task is complete"

Only after receiving that exact phrase:
Create test → Write appropriate test type (Unit/Integration/E2E/Acceptance), get approval before code changes
Version on test pass → Patch (+0.0.1) for hotfixes/issues, Minor (+0.1.0) for features/improvements
Generate changelog → Document version changes and save to changelog folder
Commit with approval → Present version + changelog + conventional commit message for approval, then commit (no push)
