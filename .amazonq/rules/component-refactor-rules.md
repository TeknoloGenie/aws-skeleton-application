# Component Refactor Rules - MANDATORY MIGRATION PROCESS

**CRITICAL**: When refactoring component names, MUST update analytics logs

**REQUIRED PROCESS** for component name changes:

1. **Pre-Refactor Planning**: Before changing any component name
   - Document current component name and new component name
   - Identify all affected analytics logs in database
   - Plan migration strategy for historical data

2. **Migration Script Execution**: Use provided migration script
   - Run component migration script BEFORE deploying refactored code
   - Verify migration completed successfully
   - Test analytics dashboard shows updated component names

3. **Code Update Process**: Update component names systematically
   - Update component registration calls
   - Update analytics tracking calls
   - Update test files and documentation
   - Update any hardcoded component references

**MIGRATION SCRIPT USAGE**:

```bash
# Run migration script
npm run migrate:component-name -- --old="old-component-name" --new="new-component-name"

# Verify migration
npm run verify:component-migration -- --component="new-component-name"
```

**FORBIDDEN ACTIONS** during refactoring:
- Do NOT change component names without running migration script
- Do NOT deploy refactored code before migrating analytics data
- Do NOT delete old component references until migration is verified
- Do NOT skip testing analytics dashboard after migration

**VALIDATION CHECKLIST**:
- [ ] Migration script executed successfully
- [ ] Analytics dashboard shows new component name
- [ ] Historical data preserved with new component name
- [ ] No broken analytics tracking in refactored component
- [ ] Tests updated and passing

**ROLLBACK PROCEDURE**:
If migration fails:
1. Revert code changes immediately
2. Run reverse migration script
3. Verify analytics data integrity
4. Plan alternative refactoring approach

**APPLIES TO**:
- Component file renames
- Component class/function name changes
- Component analytics registration updates
- Directory structure changes affecting components