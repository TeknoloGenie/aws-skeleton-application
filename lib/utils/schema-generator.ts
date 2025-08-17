import { ModelDefinition } from '../types/model';
import { ModelParser } from './model-parser';
import { SecurityGenerator } from './security-generator';
import { RelationshipGenerator } from './relationship-generator';

export class SchemaGenerator {
  private modelParser: ModelParser;
  private securityGenerator: SecurityGenerator;
  public relationshipGenerator: RelationshipGenerator;

  constructor(modelParser: ModelParser, models: ModelDefinition[]) {
    this.modelParser = modelParser;
    this.securityGenerator = new SecurityGenerator();
    this.relationshipGenerator = new RelationshipGenerator(models);
  }

  /**
   * Generate complete GraphQL schema from models
   */
  generateSchema(models: ModelDefinition[]): string {
    let schema = '';

    // Add scalar types
    schema += this.generateScalarTypes();

    // Add model types
    for (const model of models) {
      schema += this.modelParser.generateGraphQLType(model);
    }

    // Add Query type
    schema += 'type Query {\n';
    for (const model of models) {
      schema += this.modelParser.generateGraphQLOperations(model);
    }
    schema += '}\n\n';

    // Add Mutation type
    schema += 'type Mutation {\n';
    for (const model of models) {
      schema += this.modelParser.generateGraphQLOperations(model);
    }
    schema += '}\n\n';

    // Add Subscription type if any model has subscriptions enabled or rate limiting
    const hasSubscriptions = models.some(model => model.enableSubscriptions);
    const hasRateLimitedApis = models.some(model => 
      model.dataSource.type === 'thirdPartyApi' && model.dataSource.limits
    );
    
    if (hasSubscriptions || hasRateLimitedApis) {
      schema += 'type Subscription {\n';
      for (const model of models) {
        schema += this.modelParser.generateGraphQLSubscriptions(model);
      }
      // Add job completion subscription for rate-limited APIs
      if (hasRateLimitedApis) {
        schema += '  onJobCompleted(requestId: ID!): JobResult\n';
      }
      schema += '}\n\n';

      // Add JobResult type for async operations
      if (hasRateLimitedApis) {
        schema += 'type JobResult {\n';
        schema += '  requestId: ID!\n';
        schema += '  status: String!\n';
        schema += '  result: AWSJSON\n';
        schema += '  error: String\n';
        schema += '  completedAt: AWSDateTime\n';
        schema += '}\n\n';
      }
    }

    return schema;
  }

  /**
   * Generate scalar type definitions
   */
  private generateScalarTypes(): string {
    return `
scalar AWSDateTime
scalar AWSJSON
scalar AWSEmail
scalar AWSURL
scalar AWSPhone
scalar AWSIPAddress

`;
  }

  /**
   * Generate resolver mapping templates for DynamoDB with security
   */
  generateDynamoDBResolvers(model: ModelDefinition): {
    request: string;
    response: string;
  } {
    // This method is kept for backward compatibility but now returns a placeholder
    // Individual operations should use the specific methods below
    const requestTemplate = `OPERATION_PLACEHOLDER`;

    const ownershipVerification = this.securityGenerator.generateOwnershipVerification(model, 'read');
    const timezoneConversion = this.generateTimezoneConversion(model);
    const itemOwnershipFilter = this.generateItemOwnershipFilter(model);

    const responseTemplate = `
## DynamoDB Response Template with Security
` + ownershipVerification + `

#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#end

## Debug logging for development
#if($util.defaultIfNull($ctx.request.headers["x-debug"], false) && $process.env.STAGE == "development")
  $util.qr($ctx.stash.put("debug-response", "Processing DynamoDB response"))
#end

## Convert datetime fields to user timezone if available
#if($userTimezone && $ctx.result)
  ` + timezoneConversion + `
#end

## Handle different operations
#if($ctx.result)
  #if($ctx.result.items)
    ## For list operations, filter items based on ownership
    #set($filteredItems = [])
    #set($originalCount = $ctx.result.items.size())
    #foreach($item in $ctx.result.items)
      ` + itemOwnershipFilter + `
      #if($includeItem)
        $util.qr($filteredItems.add($item))
      #end
    #end
    ## Debug logging for development
    #if($util.defaultIfNull($ctx.request.headers["x-debug"], false))
      $util.qr($ctx.stash.put("debug-filter", "Filtered $originalCount items to $filteredItems.size() items"))
    #end
    {
      "items": $util.toJson($filteredItems),
      "nextToken": $util.toJson($ctx.result.nextToken)
    }
  #else
    ## For single item operations
    $util.toJson($ctx.result)
  #end
#else
  null
#end`;

    return {
      request: requestTemplate,
      response: responseTemplate,
    };
  }

  /**
   * Generate GetItem request template
   */
  generateGetItemTemplate(model: ModelDefinition): string {
    const authCheck = this.securityGenerator.generateAuthorizationCheck(model, 'read');
    
    return `
## DynamoDB GetItem Request Template with Security
#set($userTimezone = $ctx.request.headers["x-user-timezone"])

## Authorization check
` + authCheck + `

{
  "version": "2017-02-28",
  "operation": "GetItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  }
}`;
  }

  /**
   * Generate Scan request template for list operations
   */
  generateScanTemplate(model: ModelDefinition): string {
    const authCheck = this.securityGenerator.generateAuthorizationCheck(model, 'read');
    
    if (process.env.STAGE === 'development') {
      console.log(`Generating Scan template for model: ${model.name}`);
    }
    
    return `
## DynamoDB Scan Request Template with Security
#set($userTimezone = $ctx.request.headers["x-user-timezone"])

## Authorization check
` + authCheck + `

## Debug logging for development
#if($util.defaultIfNull($ctx.request.headers["x-debug"], false))
  $util.qr($ctx.stash.put("debug", "Executing Scan operation for ${model.name}"))
#end

{
  "version": "2017-02-28",
  "operation": "Scan",
  "limit": $util.defaultIfNull($ctx.args.limit, 20),
  "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
}`;
  }

  /**
   * Generate PutItem request template for create operations
   */
  generatePutItemTemplate(model: ModelDefinition): string {
    const authCheck = this.securityGenerator.generateAuthorizationCheck(model, 'create');
    const ownerField = this.getOwnerField(model);
    const ownerFieldAssignment = ownerField ? `#set($input.` + ownerField + ` = $ctx.identity.sub)` : '';
    
    return `
## DynamoDB PutItem Request Template with Security
#set($userTimezone = $ctx.request.headers["x-user-timezone"])

## Authorization check
` + authCheck + `

## Auto-generate ID and populate required fields
#set($id = $util.autoId())
#set($input = $ctx.args.input)
#set($input.id = $id)

## Auto-populate owner field if defined
` + ownerFieldAssignment + `

## Auto-populate timestamps
#set($now = $util.time.nowISO8601())
#set($input.createdAt = $now)
#set($input.updatedAt = $now)

{
  "version": "2017-02-28",
  "operation": "PutItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($id)
  },
  "attributeValues": $util.dynamodb.toMapValuesJson($input),
  "condition": {
    "expression": "attribute_not_exists(id)"
  }
}`;
  }

  /**
   * Generate UpdateItem request template
   */
  generateUpdateItemTemplate(model: ModelDefinition): string {
    const authCheck = this.securityGenerator.generateAuthorizationCheck(model, 'update');
    const updateExpression = this.generateUpdateExpression(model);
    const expressionNames = this.generateExpressionNames(model);
    
    return `
## DynamoDB UpdateItem Request Template with Security
#set($userTimezone = $ctx.request.headers["x-user-timezone"])

## Authorization check
` + authCheck + `

## Auto-populate updatedAt timestamp
#set($input = $ctx.args.input)
#set($input.updatedAt = $util.time.nowISO8601())

{
  "version": "2017-02-28",
  "operation": "UpdateItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id)
  },
  "update": {
    "expression": "SET ` + updateExpression + `, #updatedAt = :updatedAt",
    "expressionNames": ` + expressionNames + `,
    "expressionValues": $util.dynamodb.toMapValuesJson($input)
  }
}`;
  }

  /**
   * Generate DeleteItem request template
   */
  generateDeleteItemTemplate(model: ModelDefinition): string {
    const authCheck = this.securityGenerator.generateAuthorizationCheck(model, 'delete');
    
    return `
## DynamoDB DeleteItem Request Template with Security
#set($userTimezone = $ctx.request.headers["x-user-timezone"])

## Authorization check
` + authCheck + `

{
  "version": "2017-02-28",
  "operation": "DeleteItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id)
  }
}`;
  }

  private generateItemOwnershipFilter(model: ModelDefinition): string {
    const ownerField = this.getOwnerField(model);
    if (!ownerField || !model.accessControl) {
      return '#set($includeItem = true)';
    }

    const hasOwnerRule = model.accessControl.rules.some(rule => 
      rule.allow === 'read' && rule.owner
    );

    if (!hasOwnerRule) {
      return '#set($includeItem = true)';
    }

    return `
    ## Check if user can see this item
    #set($includeItem = false)
    #set($userId = $ctx.identity.sub)
    #set($userGroups = $ctx.identity.cognito:groups)
    
    ## Check group permissions
    #if($userGroups)
      #foreach($group in $userGroups)
        #if($group == "admins")
          #set($includeItem = true)
        #end
      #end
    #end
    
    ## Check ownership
    #if(!$includeItem && $item.` + ownerField + ` == $userId)
      #set($includeItem = true)
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

  /**
   * Generate resolver mapping templates for Aurora/RDS
   */
  generateRDSResolvers(model: ModelDefinition): {
    request: string;
    response: string;
  } {
    const tableName = model.name.toLowerCase();
    const columnList = this.generateColumnList(model);
    const valuePlaceholders = this.generateValuePlaceholders(model);
    const parameterList = this.generateParameterList(model);
    const updateSet = this.generateUpdateSet(model);
    const updateParameters = this.generateUpdateParameters(model);
    const sqlStatement = this.generateSQLStatement(model, "operation");

    const requestTemplate = `
{
  "version": "2018-05-29",
  "method": "POST",
  "resourcePath": "/",
  "params": {
    "headers": {
      "content-type": "application/x-amz-json-1.0",
      "x-amz-target": "AWSRDSDataService.ExecuteStatement"
    },
    "body": {
      #if($operation == "SELECT")
        "sql": "SELECT * FROM ` + tableName + ` WHERE id = :id",
        "parameters": [
          {
            "name": "id",
            "value": {
              "stringValue": "$ctx.args.id"
            }
          }
        ]
      #elseif($operation == "INSERT")
        "sql": "INSERT INTO ` + tableName + ` (` + columnList + `) VALUES (` + valuePlaceholders + `)",
        "parameters": [
          ` + parameterList + `
        ]
      #elseif($operation == "UPDATE")
        "sql": "UPDATE ` + tableName + ` SET ` + updateSet + ` WHERE id = :id",
        "parameters": [
          ` + updateParameters + `
        ]
      #elseif($operation == "DELETE")
        "sql": "DELETE FROM ` + tableName + ` WHERE id = :id",
        "parameters": [
          {
            "name": "id",
            "value": {
              "stringValue": "$ctx.args.input.id"
            }
          }
        ]
      #end,
      "resourceArn": "$ctx.stash.rdsArn",
      "secretArn": "$ctx.stash.secretArn",
      "database": "$ctx.stash.database"
    }
  }
}`;

    const responseTemplate = `
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#end
$util.toJson($ctx.result)`;

    return {
      request: requestTemplate,
      response: responseTemplate
    };
  }

  private generateColumnList(model: ModelDefinition): string {
    return Object.keys(model.properties).join(', ');
  }

  private generateValuePlaceholders(model: ModelDefinition): string {
    return Object.keys(model.properties).map(key => ":" + key).join(', ');
  }

  private generateParameterList(model: ModelDefinition): string {
    return Object.entries(model.properties).map(([key, prop]) => `
      {
        "name": "` + key + `",
        "value": {
          "` + this.getParameterType(prop.type) + `": "$ctx.args.input.` + key + `"
        }
      }`).join(',');
  }

  private generateUpdateSet(model: ModelDefinition): string {
    return Object.keys(model.properties)
      .filter(key => key !== 'id')
      .map(key => key + " = :" + key)
      .join(', ');
  }

  private generateUpdateParameters(model: ModelDefinition): string {
    const params = Object.entries(model.properties)
      .filter(([key]) => key !== 'id')
      .map(([key, prop]) => `
        {
          "name": "` + key + `",
          "value": {
            "` + this.getParameterType(prop.type) + `": "$ctx.args.input.` + key + `"
          }
        }`);
    
    params.push(`
      {
        "name": "id",
        "value": {
          "stringValue": "$ctx.args.input.id"
        }
      }`);

    return params.join(',');
  }

  private generateCreateTemplate(model: ModelDefinition, ownerField: string | null): string {
    const ownerFieldAssignment = ownerField ? `#set($input.` + ownerField + ` = $ctx.identity.sub)` : '';
    
    return `
      ## Auto-generate ID and populate owner field
      #set($id = $util.autoId())
      #set($input = $ctx.args.input)
      #set($input.id = $id)
      
      ## Auto-populate owner field if defined
      ` + ownerFieldAssignment + `
      
      ## Auto-populate timestamps
      #set($now = $util.time.nowISO8601())
      #set($input.createdAt = $now)
      #set($input.updatedAt = $now)
      
      {
        "version": "2018-05-29",
        "operation": "PutItem",
        "key": {
          "id": $util.dynamodb.toDynamoDBJson($id)
        },
        "attributeValues": $util.dynamodb.toMapValuesJson($input),
        "condition": {
          "expression": "attribute_not_exists(id)"
        }
      }
    `;
  }

  private getParameterType(graphqlType: string): string {
    switch (graphqlType) {
      case 'Int':
        return 'longValue';
      case 'Float':
        return 'doubleValue';
      case 'Boolean':
        return 'booleanValue';
      default:
        return 'stringValue';
    }
  }

  /**
   * Generate pipeline resolver functions for hooks
   */
  generatePipelineResolverFunctions(model: ModelDefinition, operation: string): string[] {
    const functions: string[] = [];
    
    if (!model.hooks) return functions;

    const beforeHookKey = ("before" + operation) as keyof typeof model.hooks;
    const afterHookKey = ("after" + operation) as keyof typeof model.hooks;
    const beforeHook = model.hooks[beforeHookKey];
    const afterHook = model.hooks[afterHookKey];

    // Add before hook function
    if (beforeHook) {
      functions.push(`
        #set($beforeResult = $util.transform.toLambdaRequest({
          "operation": "before` + operation + `",
          "model": "` + model.name + `",
          "args": $ctx.args,
          "identity": $ctx.identity,
          "source": $ctx.source
        }))
        $util.qr($ctx.stash.put("beforeHookInput", $beforeResult))
      `);
    }

    // Add main data source operation
    functions.push(this.generateMainOperationFunction(model, operation));

    // Add after hook function
    if (afterHook) {
      functions.push(`
        #set($afterResult = $util.transform.toLambdaRequest({
          "operation": "after` + operation + `",
          "model": "` + model.name + `",
          "result": $ctx.result,
          "args": $ctx.args,
          "identity": $ctx.identity
        }))
        $util.qr($ctx.stash.put("afterHookInput", $afterResult))
      `);
    }

    return functions;
  }

  private generateMainOperationFunction(model: ModelDefinition, operation: string): string {
    if (model.dataSource.type === 'database' && model.dataSource.engine === 'nosql') {
      return this.generateDynamoDBOperationFunction(model, operation);
    } else if (model.dataSource.type === 'database' && model.dataSource.engine === 'sql') {
      return this.generateRDSOperationFunction(model, operation);
    } else if (model.dataSource.type === 'thirdPartyApi') {
      return this.generateThirdPartyApiOperationFunction(model, operation);
    }
    return '';
  }

  private generateDynamoDBOperationFunction(model: ModelDefinition, operation: string): string {
    const authCheck = this.securityGenerator.generateAuthorizationCheck(
      model, 
      operation.toLowerCase() as 'create' | 'read' | 'update' | 'delete'
    );

    let operationTemplate = '';
    
    switch (operation.toLowerCase()) {
      case 'create':
        const ownerField = this.getOwnerField(model);
        const createTemplate = this.generateCreateTemplate(model, ownerField);
        operationTemplate = `
          ` + authCheck + `
          ` + createTemplate + `
        `;
        break;
        
      case 'read':
        operationTemplate = `
          ` + authCheck + `
          {
            "version": "2018-05-29",
            "operation": "GetItem",
            "key": {
              "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
            }
          }
        `;
        break;
        
      case 'update':
        const preOwnershipCheck = this.securityGenerator.generatePreOperationOwnershipCheck(model, 'update');
        const updateExpression = this.generateUpdateExpression(model);
        const expressionNames = this.generateExpressionNames(model);
        operationTemplate = `
          ` + authCheck + `
          ` + preOwnershipCheck + `
          #if(!$ctx.stash.needsOwnershipCheck)
            {
              "version": "2018-05-29",
              "operation": "UpdateItem",
              "key": {
                "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
              },
              "update": {
                "expression": "SET ` + updateExpression + `",
                "expressionNames": ` + expressionNames + `,
                "expressionValues": $util.dynamodb.toMapValuesJson($ctx.args.input)
              }
            }
          #end
        `;
        break;
        
      case 'delete':
        const preDeleteOwnershipCheck = this.securityGenerator.generatePreOperationOwnershipCheck(model, 'delete');
        operationTemplate = `
          ` + authCheck + `
          ` + preDeleteOwnershipCheck + `
          #if(!$ctx.stash.needsOwnershipCheck)
            {
              "version": "2018-05-29",
              "operation": "DeleteItem",
              "key": {
                "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
              }
            }
          #end
        `;
        break;
        
      default:
        operationTemplate = '';
    }

    return operationTemplate;
  }

  private generateRDSOperationFunction(model: ModelDefinition, operation: string): string {
    const sqlStatement = this.generateSQLStatement(model, operation);
    return `
      {
        "version": "2018-05-29",
        "statements": [
          "` + sqlStatement + `"
        ]
      }
    `;
  }

  private generateThirdPartyApiOperationFunction(model: ModelDefinition, operation: string): string {
    if (model.dataSource.limits) {
      return `
        {
          "version": "2018-05-29",
          "method": "POST",
          "resourcePath": "/",
          "params": {
            "headers": {
              "content-type": "application/x-amz-json-1.0",
              "x-amz-target": "AmazonSQS.SendMessage"
            },
            "body": {
              "QueueUrl": "$ctx.stash.queueUrl",
              "MessageBody": $util.toJson({
                "operation": "` + operation + `",
                "model": "` + model.name + `",
                "args": $ctx.args,
                "requestId": "$util.autoId()"
              })
            }
          }
        }
      `;
    } else {
      const apiPath = this.getApiPath(model, operation);
      return `
        {
          "version": "2018-05-29",
          "method": "POST",
          "resourcePath": "` + apiPath + `",
          "params": {
            "headers": {
              "Content-Type": "application/json",
              "Authorization": "$ctx.request.headers.authorization"
            },
            "body": $util.toJson($ctx.args)
          }
        }
      `;
    }
  }

  private generateUpdateExpression(model: ModelDefinition): string {
    const properties = Object.keys(model.properties).filter(key => 
      key !== 'id' && key !== 'createdAt' && key !== 'updatedAt'
    );
    return properties.map(prop => "#" + prop + " = :" + prop).join(', ');
  }

  private generateExpressionNames(model: ModelDefinition): string {
    const properties = Object.keys(model.properties).filter(key => 
      key !== 'id' && key !== 'createdAt'
    );
    const names = properties.reduce((acc, prop) => {
      acc["#" + prop] = prop;
      return acc;
    }, {} as Record<string, string>);
    
    // Always include updatedAt
    names['#updatedAt'] = 'updatedAt';
    
    return JSON.stringify(names);
  }

  private generateSQLStatement(model: ModelDefinition, operation: string): string {
    const tableName = model.name.toLowerCase() + "s";
    const columnList = Object.keys(model.properties).join(', ');
    const valuePlaceholders = Object.keys(model.properties).map(() => '?').join(', ');
    const updateSet = Object.keys(model.properties).filter(k => k !== 'id').map(k => k + " = ?").join(', ');
    
    switch (operation.toLowerCase()) {
      case 'create':
        return "INSERT INTO " + tableName + " (" + columnList + ") VALUES (" + valuePlaceholders + ")";
      case 'read':
        return "SELECT * FROM " + tableName + " WHERE id = ?";
      case 'update':
        return "UPDATE " + tableName + " SET " + updateSet + " WHERE id = ?";
      case 'delete':
        return "DELETE FROM " + tableName + " WHERE id = ?";
      default:
        return '';
    }
  }

  private getApiPath(model: ModelDefinition, operation: string): string {
    const modelNameLower = model.name.toLowerCase();
    switch (operation.toLowerCase()) {
      case 'create':
        return "/" + modelNameLower;
      case 'read':
        return "/" + modelNameLower + "/$ctx.args.id";
      case 'update':
        return "/" + modelNameLower + "/$ctx.args.id";
      case 'delete':
        return "/" + modelNameLower + "/$ctx.args.id";
      default:
        return "/" + modelNameLower;
    }
  }

  /**
   * Generate timezone conversion logic for datetime fields
   */
  private generateTimezoneConversion(model: ModelDefinition): string {
    const datetimeFields = Object.entries(model.properties)
      .filter(([_, prop]) => prop.type === 'AWSDateTime')
      .map(([fieldName]) => fieldName);

    if (datetimeFields.length === 0) {
      return '';
    }

    let conversion = '';
    for (const field of datetimeFields) {
      conversion += `
  #if($ctx.result.` + field + `)
    #set($ctx.result.` + field + `_local = $util.time.formatDateTime($ctx.result.` + field + `, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", $userTimezone))
  #end`;
    }

    return conversion;
  }
}
