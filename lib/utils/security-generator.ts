import { ModelDefinition, AccessRule } from '../types/model';

export class SecurityGenerator {
  /**
   * Generate authorization check for resolver templates
   */
  generateAuthorizationCheck(model: ModelDefinition, operation: 'create' | 'read' | 'update' | 'delete'): string {
    if (!model.accessControl) {
      return '## No access control defined - allow all\n';
    }

    const { default: defaultAction, rules } = model.accessControl;
    const applicableRules = rules.filter(rule => rule.allow === operation);

    if (applicableRules.length === 0) {
      return defaultAction === 'allow' 
        ? '## Default allow - no specific rules\n'
        : this.generateDenyTemplate('No access rules defined for this operation');
    }

    if (process.env.STAGE === 'development') {
      console.log(`Generating authorization check for ${model.name}.${operation} with ${applicableRules.length} rules`);
    }

    let authCheck = `## Authorization check for ` + operation + ` operation\n`;
    authCheck += `#set($isAuthorized = false)\n`;
    authCheck += `#set($userId = $ctx.identity.sub)\n`;
    authCheck += `## Get user groups with fallback to empty array\n`;
    authCheck += `#set($userGroups = $util.defaultIfNull($ctx.identity["cognito:groups"], []))\n`;
    authCheck += `## Debug: Log user groups\n`;
    authCheck += `#if($util.defaultIfNull($ctx.request.headers["x-debug"], false))\n`;
    authCheck += `  $util.qr($ctx.stash.put("debug-user-id", $userId))\n`;
    authCheck += `  $util.qr($ctx.stash.put("debug-user-groups", $userGroups))\n`;
    authCheck += `#end\n\n`;

    // Check each rule
    for (let i = 0; i < applicableRules.length; i++) {
      const rule = applicableRules[i];
      authCheck += this.generateRuleCheck(rule, model, operation, i);
    }

    // Final authorization decision
    authCheck += `\n## Final authorization decision\n`;
    authCheck += `#if(!$isAuthorized)\n`;
    authCheck += `  ## Debug: Log authorization failure\n`;
    authCheck += `  #if($util.defaultIfNull($ctx.request.headers["x-debug"], false))\n`;
    authCheck += `    $util.qr($ctx.stash.put("debug-auth-failed", "User $userId with groups $userGroups not authorized for ${operation} on ${model.name}"))\n`;
    authCheck += `  #end\n`;
    authCheck += `  $util.unauthorized()\n`;
    authCheck += `#else\n`;
    authCheck += `  ## Debug: Log authorization success\n`;
    authCheck += `  #if($util.defaultIfNull($ctx.request.headers["x-debug"], false))\n`;
    authCheck += `    $util.qr($ctx.stash.put("debug-auth-success", "User $userId authorized for ${operation} on ${model.name}"))\n`;
    authCheck += `  #end\n`;
    authCheck += `#end\n\n`;

    return authCheck;
  }

  private generateRuleCheck(rule: AccessRule, model: ModelDefinition, operation: string, ruleIndex: number): string {
    let ruleCheck = `## Rule ` + (ruleIndex + 1) + `: ` + JSON.stringify(rule) + `\n`;

    if (rule.groups && rule.groups.length > 0) {
      ruleCheck += `## Check group-based access\n`;
      ruleCheck += `#if($userGroups && $userGroups.size() > 0)\n`;
      ruleCheck += `  ## Debug: Check user groups for ${model.name}.${operation}\n`;
      ruleCheck += `  #if($util.defaultIfNull($ctx.request.headers["x-debug"], false))\n`;
      ruleCheck += `    $util.qr($ctx.stash.put("debug-groups-check", "Checking groups: $userGroups against required: ${rule.groups.join(', ')}"))\n`;
      ruleCheck += `  #end\n`;
      ruleCheck += `  #foreach($group in $userGroups)\n`;
      
      // Generate individual if conditions for each group
      for (const group of rule.groups) {
        ruleCheck += `    #if($group == "` + group + `")\n`;
        ruleCheck += `      #set($isAuthorized = true)\n`;
        ruleCheck += `      ## Debug: Authorized via group ${group}\n`;
        ruleCheck += `      #if($util.defaultIfNull($ctx.request.headers["x-debug"], false))\n`;
        ruleCheck += `        $util.qr($ctx.stash.put("debug-auth-group", "Authorized via group: ${group}"))\n`;
        ruleCheck += `      #end\n`;
        ruleCheck += `      #break\n`;
        ruleCheck += `    #end\n`;
      }
      
      ruleCheck += `  #end\n`;
      ruleCheck += `#else\n`;
      ruleCheck += `  ## Debug: No user groups found\n`;
      ruleCheck += `  #if($util.defaultIfNull($ctx.request.headers["x-debug"], false))\n`;
      ruleCheck += `    $util.qr($ctx.stash.put("debug-no-groups", "No user groups found in token"))\n`;
      ruleCheck += `  #end\n`;
      ruleCheck += `#end\n\n`;
    }

    if (rule.owner) {
      const ownerField = this.getOwnerField(model);
      if (ownerField) {
        if (operation === 'create') {
          // For create operations, set the owner field
          ruleCheck += `## Owner-based access: Set owner field for create\n`;
          ruleCheck += `#if($ctx.args.input)\n`;
          ruleCheck += `  $util.qr($ctx.args.input.put("` + ownerField + `", $userId))\n`;
          ruleCheck += `  #set($isAuthorized = true)\n`;
          ruleCheck += `  ## Debug: Authorized via ownership (create)\n`;
          ruleCheck += `  #if($util.defaultIfNull($ctx.request.headers["x-debug"], false))\n`;
          ruleCheck += `    $util.qr($ctx.stash.put("debug-owner", "Authorized via ownership for create"))\n`;
          ruleCheck += `  #end\n`;
          ruleCheck += `#end\n\n`;
        } else {
          // For read/update/delete operations, check ownership
          ruleCheck += `## Owner-based access: Check ownership for ` + operation + `\n`;
          if (operation === 'read') {
            ruleCheck += `#if($ctx.args.id)\n`;
            ruleCheck += `  ## For read operations, we need to fetch the item first to check ownership\n`;
            ruleCheck += `  ## This will be handled in the response template\n`;
            ruleCheck += `  #set($needsOwnershipCheck = true)\n`;
            ruleCheck += `#end\n\n`;
          } else {
            // For update/delete, check if user owns the resource
            ruleCheck += `#if($ctx.args.id)\n`;
            ruleCheck += `  ## Check ownership in existing item\n`;
            ruleCheck += `  #set($needsOwnershipCheck = true)\n`;
            ruleCheck += `#elseif($ctx.args.input && $ctx.args.input.` + ownerField + `)\n`;
            ruleCheck += `  #if($ctx.args.input.` + ownerField + ` == $userId)\n`;
            ruleCheck += `    #set($isAuthorized = true)\n`;
            ruleCheck += `  #end\n`;
            ruleCheck += `#end\n\n`;
          }
        }
      }
    }

    return ruleCheck;
  }

  /**
   * Generate ownership verification for response templates
   */
  generateOwnershipVerification(model: ModelDefinition, operation: 'read' | 'update' | 'delete'): string {
    const ownerField = this.getOwnerField(model);
    if (!ownerField || !model.accessControl) {
      return '';
    }

    const hasOwnerRule = model.accessControl.rules.some(rule => 
      rule.allow === operation && rule.owner
    );

    if (!hasOwnerRule) {
      return '';
    }

    let verification = `## Ownership verification for ` + operation + ` operation\n`;
    verification += `#if($ctx.stash.needsOwnershipCheck)\n`;
    verification += `  #set($userId = $ctx.identity.sub)\n`;
    
    if (operation === 'read') {
      verification += `  #if($ctx.result && $ctx.result.` + ownerField + ` != $userId)\n`;
      verification += `    ## User doesn't own this resource\n`;
      verification += `    #set($ctx.result = null)\n`;
      verification += `  #end\n`;
    } else {
      verification += `  #if($ctx.result && $ctx.result.` + ownerField + ` != $userId)\n`;
      verification += `    $util.unauthorized()\n`;
      verification += `  #end\n`;
    }
    
    verification += `#end\n\n`;

    return verification;
  }

  /**
   * Generate pre-operation ownership check for update/delete
   */
  generatePreOperationOwnershipCheck(model: ModelDefinition, operation: 'update' | 'delete'): string {
    const ownerField = this.getOwnerField(model);
    if (!ownerField || !model.accessControl) {
      return '';
    }

    const hasOwnerRule = model.accessControl.rules.some(rule => 
      rule.allow === operation && rule.owner
    );

    if (!hasOwnerRule) {
      return '';
    }

    return `
      ## Pre-operation ownership check for ` + operation + `
      #if($ctx.stash.needsOwnershipCheck && $ctx.args.id)
        {
          "version": "2018-05-29",
          "operation": "GetItem",
          "key": {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
          }
        }
      #else
        ## Skip ownership check
        {}
      #end
    `;
  }

  private getOwnerField(model: ModelDefinition): string | null {
    for (const [fieldName, fieldDef] of Object.entries(model.properties)) {
      if (fieldDef.isOwner) {
        return fieldName;
      }
    }
    return null;
  }

  private generateDenyTemplate(reason: string): string {
    return `## Access denied: ` + reason + `\n$util.unauthorized()\n`;
  }

  /**
   * Generate group-based authorization check
   */
  generateGroupCheck(allowedGroups: string[]): string {
    if (allowedGroups.length === 0) {
      return '';
    }

    let groupCheck = `## Group-based authorization\n`;
    groupCheck += `#set($userGroups = $ctx.identity["cognito:groups"])\n`;
    groupCheck += `#set($hasRequiredGroup = false)\n`;
    groupCheck += `#if($userGroups)\n`;
    groupCheck += `  #foreach($group in $userGroups)\n`;
    
    // Generate individual if conditions for each group instead of using JavaScript join
    for (const group of allowedGroups) {
      groupCheck += `    #if($group == "` + group + `")\n`;
      groupCheck += `      #set($hasRequiredGroup = true)\n`;
      groupCheck += `    #end\n`;
    }
    
    groupCheck += `  #end\n`;
    groupCheck += `#end\n`;
    groupCheck += `#if(!$hasRequiredGroup)\n`;
    groupCheck += `  $util.unauthorized()\n`;
    groupCheck += `#end\n\n`;

    return groupCheck;
  }

  /**
   * Generate field-level authorization for sensitive data
   */
  generateFieldLevelAuth(model: ModelDefinition, userGroups: string[]): string {
    // This could be extended to support field-level permissions
    // For now, we'll implement basic field filtering based on groups
    
    let fieldAuth = `## Field-level authorization\n`;
    fieldAuth += `#set($userGroups = $ctx.identity["cognito:groups"])\n`;
    fieldAuth += `#set($isAdmin = false)\n`;
    fieldAuth += `#if($userGroups && $userGroups.contains("admins"))\n`;
    fieldAuth += `  #set($isAdmin = true)\n`;
    fieldAuth += `#end\n\n`;

    return fieldAuth;
  }
}
