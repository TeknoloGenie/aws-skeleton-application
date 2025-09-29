# Chat Rules - Conversation Management and Workflow Classification

**CONVERSATION INITIALIZATION**: Only at the start of NEW conversations, ask workflow classification
- Ask: "What type of work are we doing today?"
  - **Task** - Development work
  - **QA Finding** - Bug report/issue
  - **Discussion** - Information gathering
- Execute appropriate workflow based on classification
- Always run Discussion workflow before Task/QA Finding workflows

**CONVERSATION SAVING**: When user says "Save conversation"
- Save new conversation if none previously saved in current session
- Use descriptive title that summarizes the conversation content
- Save to conversations folder with conversation content
- Display only "Conversation saved successfully"

**WORKFLOW EXECUTION**: Follow conversation-workflow-rules.md strictly
- Discussion → Review files and tests first
- Task → Get task details, then create test plan
- QA Finding → Get replication steps, then create test plan
