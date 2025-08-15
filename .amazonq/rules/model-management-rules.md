# Model Management Rules - MANDATORY UPDATE PROCESS

**CRITICAL**: When creating new models, MUST update admin dashboard components

**REQUIRED PROCESS** for new model creation:

1. **Model Definition**: Create new model JSON file in `/models` directory
   - Follow existing model structure and naming conventions
   - Include proper access control and relationships
   - Add appropriate indexes for admin queries

2. **Admin Dashboard Updates**: Update all admin dashboard components
   - **Vue**: Update `availableModels` array in `DataManagement.vue`
   - **React**: Update `availableModels` array in `DataManagement.tsx`
   - **Angular**: Update `availableModels` array in `data-management.component.ts`
   - Add model-specific field mappings in `getModelFields()` function

3. **GraphQL Schema Updates**: Ensure proper GraphQL operations
   - Verify list, create, update, delete operations are generated
   - Test admin access permissions for new model
   - Validate relationship queries work correctly

**IMPLEMENTATION REQUIREMENTS**:

```javascript
// Add to availableModels array
const availableModels = ['User', 'Post', 'Setting', 'Log', 'NewModel'];

// Add to getModelFields function
case 'NewModel':
  return `${commonFields} field1 field2 field3`;
```

**FORBIDDEN ACTIONS** without dashboard updates:
- Do NOT create models without updating admin components
- Do NOT deploy new models without testing admin access
- Do NOT skip field mapping updates
- Do NOT forget to test CRUD operations in admin dashboard

**VALIDATION CHECKLIST**:
- [ ] Model JSON file created with proper structure
- [ ] All three admin dashboard components updated
- [ ] Field mappings added to getModelFields functions
- [ ] Admin CRUD operations tested
- [ ] Access control verified for admin group
- [ ] Export functionality works for new model

**APPLIES TO**:
- New model creation
- Model field additions
- Model relationship changes
- Access control modifications

**TESTING REQUIREMENTS**:
- Test all CRUD operations in admin dashboard
- Verify export functionality (CSV/JSON)
- Test bulk operations if applicable
- Validate search and filtering works