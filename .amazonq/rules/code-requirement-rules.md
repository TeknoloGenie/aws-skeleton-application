Add debug logging → Wrap all debug logs in `if (process.env.STAGE === 'development')`
Monitor during testing → Use debug output to validate logic and find issues
Clean before completion → Remove temporary debug code, keep valuable logs
Never log secrets → No passwords, tokens, or PII in debug output

Reference: See `.amazonq/guides/debugging-guide.md` for patterns and examples
