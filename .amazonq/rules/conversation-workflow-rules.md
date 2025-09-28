# Conversation Workflow Rules - MANDATORY CLASSIFICATION

**CRITICAL**: Every conversation MUST begin with workflow classification

## **WORKFLOW CLASSIFICATION**
At conversation start, determine:
- **Task** - Development work (new features, modifications, fixes)
- **QA Finding** - Bug reports or issues found during testing
- **Discussion** - Information gathering, planning, or analysis

## **WORKFLOW EXECUTION ORDER**
1. **Task/QA Finding** → Run Discussion workflow FIRST → Then proceed with specific workflow
2. **Discussion** → Execute Discussion workflow only

## **DISCUSSION WORKFLOW** (Required for all workflows)
- Review all related files and existing tests
- Analyze current implementation and dependencies
- Identify affected components and services
- Present findings before proceeding

**CRITICAL DISCUSSION RESTRICTIONS:**
- **NEVER provide code changes** during Discussion workflow
- **NEVER write, modify, or create files** during Discussion workflow
- **ONLY provide analysis, findings, and recommendations**
- Code changes ONLY allowed after user says **"Convert to Task"** or **"Convert to QA Finding"**

## **TASK WORKFLOW** (After Discussion)
**Required Information:**
- Frontend or Backend task?
- **New Feature** or **Improvement** of existing feature?
  - **New Feature** → MINOR version (+0.1.0)
  - **Improvement** → MINOR version (+0.1.0)
- Task title
- Task description  
- Component/service files to work on (use best judgment if not provided)

**Before Implementation:**
- MUST provide list of tests to update/create
- MUST get approval for test plan
- MUST follow task-planning-rules.md

## **QA FINDING WORKFLOW** (After Discussion)
**Required Information:**
- Frontend: Steps to replicate issue in UI
- Backend: Sample data being passed to API
- Expected vs actual behavior
- **Versioning**: QA Findings → PATCH version (+0.0.1)

**Before Implementation:**
- MUST provide list of tests to update/create
- MUST get approval for test plan
- MUST follow debugging procedures

## **WORKFLOW CONVERSION**
- Discussion can ONLY be converted to Task/QA Finding when user explicitly says:
  - **"Convert to Task"** → Switch to Task workflow
  - **"Convert to QA Finding"** → Switch to QA Finding workflow
- After conversion, follow the respective workflow rules

## **VERSIONING RULES**
- **Task (New Feature/Improvement)** → MINOR (+0.1.0)
- **QA Finding (Bug Fix)** → PATCH (+0.0.1)
- **Breaking Changes** → MAJOR (+1.0.0) - requires explicit user confirmation
