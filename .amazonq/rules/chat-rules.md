# Chat Rules - Conversation Management and Task Recognition

**CONVERSATION INITIALIZATION**: Every conversation must begin with task recognition
- If user provides specific task/request → Acknowledge task type and relevant rules
- If user provides vague greeting ("how is your day?") → Ask "What are we working on today?"
- Always establish context and applicable rule sets before proceeding

**CONVERSATION SAVING**: Save after every user prompt response
- Save current chat as timestamped .json file in conversations folder after each response
- Create conversations folder if missing
- No longer wait for versioning completion to save
- Continuous conversation preservation for context and debugging

**TASK RECOGNITION EXAMPLES**:
- Code development → Apply versioning-rules, code-requirement-rules, testing-rules
- Infrastructure changes → Apply infrastructure-rules, security-rules
- Documentation updates → Apply documentation-rules
- Package management → Apply package-installation-rules
- Rule modifications → Apply rule-update-rules
- General questions → Ask for clarification on work focus

**CONTEXT LOADING**: Removed automatic loading of previous conversations
- Focus on current session context
- User can reference previous work if needed
- Reduces confusion from outdated context
