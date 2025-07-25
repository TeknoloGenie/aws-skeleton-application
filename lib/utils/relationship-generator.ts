import { ModelDefinition, RelationshipDefinition } from '../types/model';

export class RelationshipGenerator {
  private models: ModelDefinition[];

  constructor(models: ModelDefinition[]) {
    this.models = models;
  }

  /**
   * Generate GraphQL schema fields for relationships
   */
  generateRelationshipFields(model: ModelDefinition): string {
    if (!model.relationships) {
      return '';
    }

    let fields = '';
    for (const [fieldName, relationship] of Object.entries(model.relationships)) {
      const targetModel = this.findModel(relationship.target);
      if (!targetModel) {
        console.warn(`Target model ${relationship.target} not found for relationship ${fieldName}`);
        continue;
      }

      switch (relationship.type) {
        case 'hasMany':
          fields += `  ${fieldName}: [${relationship.target}!]!\n`;
          break;
        case 'belongsTo':
        case 'hasOne':
          fields += `  ${fieldName}: ${relationship.target}\n`;
          break;
      }
    }

    return fields;
  }

  /**
   * Generate relationship resolver templates
   */
  generateRelationshipResolvers(model: ModelDefinition): Array<{
    fieldName: string;
    relationship: RelationshipDefinition;
    requestTemplate: string;
    responseTemplate: string;
  }> {
    if (!model.relationships) {
      return [];
    }

    const resolvers = [];
    for (const [fieldName, relationship] of Object.entries(model.relationships)) {
      const targetModel = this.findModel(relationship.target);
      if (!targetModel) {
        continue;
      }

      const resolver = {
        fieldName,
        relationship,
        requestTemplate: this.generateRelationshipRequestTemplate(model, fieldName, relationship, targetModel),
        responseTemplate: this.generateRelationshipResponseTemplate(relationship, targetModel),
      };

      resolvers.push(resolver);
    }

    return resolvers;
  }

  private generateRelationshipRequestTemplate(
    sourceModel: ModelDefinition,
    fieldName: string,
    relationship: RelationshipDefinition,
    targetModel: ModelDefinition
  ): string {
    const foreignKey = relationship.foreignKey || this.getDefaultForeignKey(sourceModel, targetModel, relationship);

    switch (relationship.type) {
      case 'hasMany':
        return this.generateHasManyRequestTemplate(sourceModel, relationship, targetModel, foreignKey);
      case 'belongsTo':
        return this.generateBelongsToRequestTemplate(sourceModel, relationship, targetModel, foreignKey);
      case 'hasOne':
        return this.generateHasOneRequestTemplate(sourceModel, relationship, targetModel, foreignKey);
      default:
        return '';
    }
  }

  private generateHasManyRequestTemplate(
    sourceModel: ModelDefinition,
    relationship: RelationshipDefinition,
    targetModel: ModelDefinition,
    foreignKey: string
  ): string {
    if (targetModel.dataSource.type === 'database' && targetModel.dataSource.engine === 'nosql') {
      return `
## HasMany relationship query for DynamoDB
{
  "version": "2018-05-29",
  "operation": "Query",
  "index": "${foreignKey}Index",
  "query": {
    "expression": "#foreignKey = :foreignKeyValue",
    "expressionNames": {
      "#foreignKey": "${foreignKey}"
    },
    "expressionValues": {
      ":foreignKeyValue": $util.dynamodb.toDynamoDBJson($ctx.source.id)
    }
  },
  "limit": $util.defaultIfNull($ctx.args.limit, 20),
  "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
}`;
    } else if (targetModel.dataSource.type === 'database' && targetModel.dataSource.engine === 'sql') {
      return `
## HasMany relationship query for RDS
{
  "version": "2018-05-29",
  "statements": [
    "SELECT * FROM ${targetModel.name.toLowerCase()}s WHERE ${foreignKey} = ? LIMIT ?"
  ],
  "variableMap": {
    ":foreignKeyValue": $util.toJson($ctx.source.id),
    ":limit": $util.defaultIfNull($ctx.args.limit, 20)
  }
}`;
    }
    return '';
  }

  private generateBelongsToRequestTemplate(
    sourceModel: ModelDefinition,
    relationship: RelationshipDefinition,
    targetModel: ModelDefinition,
    foreignKey: string
  ): string {
    if (targetModel.dataSource.type === 'database' && targetModel.dataSource.engine === 'nosql') {
      return `
## BelongsTo relationship query for DynamoDB
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.source.${foreignKey})
  }
}`;
    } else if (targetModel.dataSource.type === 'database' && targetModel.dataSource.engine === 'sql') {
      return `
## BelongsTo relationship query for RDS
{
  "version": "2018-05-29",
  "statements": [
    "SELECT * FROM ${targetModel.name.toLowerCase()}s WHERE id = ?"
  ],
  "variableMap": {
    ":id": $util.toJson($ctx.source.${foreignKey})
  }
}`;
    }
    return '';
  }

  private generateHasOneRequestTemplate(
    sourceModel: ModelDefinition,
    relationship: RelationshipDefinition,
    targetModel: ModelDefinition,
    foreignKey: string
  ): string {
    if (targetModel.dataSource.type === 'database' && targetModel.dataSource.engine === 'nosql') {
      return `
## HasOne relationship query for DynamoDB
{
  "version": "2018-05-29",
  "operation": "Query",
  "index": "${foreignKey}Index",
  "query": {
    "expression": "#foreignKey = :foreignKeyValue",
    "expressionNames": {
      "#foreignKey": "${foreignKey}"
    },
    "expressionValues": {
      ":foreignKeyValue": $util.dynamodb.toDynamoDBJson($ctx.source.id)
    }
  },
  "limit": 1
}`;
    } else if (targetModel.dataSource.type === 'database' && targetModel.dataSource.engine === 'sql') {
      return `
## HasOne relationship query for RDS
{
  "version": "2018-05-29",
  "statements": [
    "SELECT * FROM ${targetModel.name.toLowerCase()}s WHERE ${foreignKey} = ? LIMIT 1"
  ],
  "variableMap": {
    ":foreignKeyValue": $util.toJson($ctx.source.id)
  }
}`;
    }
    return '';
  }

  private generateRelationshipResponseTemplate(
    relationship: RelationshipDefinition,
    targetModel: ModelDefinition
  ): string {
    const baseResponse = `
## Relationship response template
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#end

## Apply relationship-based authorization
${this.generateRelationshipAuthorization(targetModel)}
`;

    switch (relationship.type) {
      case 'hasMany':
        return baseResponse + `
## HasMany relationship response
#if($ctx.result && $ctx.result.items)
  #set($filteredItems = [])
  #foreach($item in $ctx.result.items)
    #if($canAccessItem)
      $util.qr($filteredItems.add($item))
    #end
  #end
  {
    "items": $util.toJson($filteredItems),
    "nextToken": $util.toJson($ctx.result.nextToken)
  }
#else
  {
    "items": [],
    "nextToken": null
  }
#end`;

      case 'belongsTo':
      case 'hasOne':
        return baseResponse + `
## BelongsTo/HasOne relationship response
#if($ctx.result && $canAccessItem)
  $util.toJson($ctx.result)
#else
  null
#end`;

      default:
        return baseResponse + '$util.toJson($ctx.result)';
    }
  }

  private generateRelationshipAuthorization(targetModel: ModelDefinition): string {
    if (!targetModel.accessControl) {
      return '#set($canAccessItem = true)';
    }

    const ownerField = this.getOwnerField(targetModel);
    const readRules = targetModel.accessControl.rules.filter(rule => rule.allow === 'read');

    if (readRules.length === 0) {
      return targetModel.accessControl.default === 'allow' 
        ? '#set($canAccessItem = true)'
        : '#set($canAccessItem = false)';
    }

    let authCheck = `
## Relationship authorization check
#set($canAccessItem = false)
#set($userId = $ctx.identity.sub)
#set($userGroups = $ctx.identity.cognito:groups)
`;

    for (const rule of readRules) {
      if (rule.groups && rule.groups.length > 0) {
        authCheck += `
## Check group permissions
#if($userGroups)
  #foreach($group in $userGroups)
    #if(${rule.groups.map(g => `$group == "${g}"`).join(' || ')})
      #set($canAccessItem = true)
    #end
  #end
#end
`;
      }

      if (rule.owner && ownerField) {
        authCheck += `
## Check ownership
#if($item && $item.${ownerField} == $userId)
  #set($canAccessItem = true)
#elseif($ctx.result && $ctx.result.${ownerField} == $userId)
  #set($canAccessItem = true)
#end
`;
      }
    }

    return authCheck;
  }

  private getOwnerField(model: ModelDefinition): string | null {
    for (const [fieldName, fieldDef] of Object.entries(model.properties)) {
      if (fieldDef.isOwner) {
        return fieldName;
      }
    }
    return null;
  }

  private getDefaultForeignKey(
    sourceModel: ModelDefinition,
    targetModel: ModelDefinition,
    relationship: RelationshipDefinition
  ): string {
    switch (relationship.type) {
      case 'hasMany':
      case 'hasOne':
        return `${sourceModel.name.toLowerCase()}Id`;
      case 'belongsTo':
        return `${targetModel.name.toLowerCase()}Id`;
      default:
        return 'id';
    }
  }

  private findModel(modelName: string): ModelDefinition | null {
    return this.models.find(model => model.name === modelName) || null;
  }

  /**
   * Generate GSI (Global Secondary Index) definitions for DynamoDB relationships
   */
  generateGSIDefinitions(model: ModelDefinition): Array<{
    indexName: string;
    partitionKey: string;
    sortKey?: string;
  }> {
    const gsiDefinitions = [];

    // Check if this model is referenced by other models
    for (const otherModel of this.models) {
      if (!otherModel.relationships) continue;

      for (const [fieldName, relationship] of Object.entries(otherModel.relationships)) {
        if (relationship.target === model.name) {
          const foreignKey = relationship.foreignKey || this.getDefaultForeignKey(otherModel, model, relationship);
          
          if (relationship.type === 'hasMany' || relationship.type === 'hasOne') {
            gsiDefinitions.push({
              indexName: `${foreignKey}Index`,
              partitionKey: foreignKey,
            });
          }
        }
      }
    }

    return gsiDefinitions;
  }

  /**
   * Validate relationship definitions
   */
  validateRelationships(): Array<{ model: string; field: string; error: string }> {
    const errors = [];

    for (const model of this.models) {
      if (!model.relationships) continue;

      for (const [fieldName, relationship] of Object.entries(model.relationships)) {
        const targetModel = this.findModel(relationship.target);
        
        if (!targetModel) {
          errors.push({
            model: model.name,
            field: fieldName,
            error: `Target model '${relationship.target}' not found`,
          });
          continue;
        }

        // Validate foreign key exists
        const foreignKey = relationship.foreignKey || this.getDefaultForeignKey(model, targetModel, relationship);
        
        if (relationship.type === 'belongsTo') {
          if (!model.properties[foreignKey]) {
            errors.push({
              model: model.name,
              field: fieldName,
              error: `Foreign key '${foreignKey}' not found in model properties`,
            });
          }
        }
      }
    }

    return errors;
  }
}
