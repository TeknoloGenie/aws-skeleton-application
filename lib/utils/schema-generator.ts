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
    const requestTemplate = `
## DynamoDB Request Template with Security
#set($operation = "$operation")
#set($userTimezone = $ctx.request.headers["x-user-timezone"])

## Authorization check
${this.securityGenerator.generateAuthorizationCheck(model, 'read')}

{
  "version": "2017-02-28",
  "operation": "$operation",
  #if($operation == "GetItem")
    "key": {
      "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
    }
  #elseif($operation == "Scan")
    "limit": $util.defaultIfNull($ctx.args.limit, 20),
    "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
  #elseif($operation == "PutItem")
    "key": {
      "id": $util.dynamodb.toDynamoDBJson($util.autoId())
    },
    "attributeValues": $util.dynamodb.toMapValuesJson($ctx.args.input),
    "condition": {
      "expression": "attribute_not_exists(id)"
    }
  #elseif($operation == "UpdateItem")
    "key": {
      "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id)
    },
    "update": {
      "expression": "SET #updatedAt = :updatedAt",
      "expressionNames": {
        "#updatedAt": "updatedAt"
      },
      "expressionValues": {
        ":updatedAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
      }
    }
  #elseif($operation == "DeleteItem")
    "key": {
      "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id)
    }
  #end
}`;

    const responseTemplate = `
## DynamoDB Response Template with Security
${this.securityGenerator.generateOwnershipVerification(model, 'read')}

#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#end

## Convert datetime fields to user timezone if available
#if($userTimezone && $ctx.result)
  ${this.generateTimezoneConversion(model)}
#end

## Handle different operations
#if($ctx.result)
  #if($ctx.result.items)
    ## For list operations, filter items based on ownership
    #set($filteredItems = [])
    #foreach($item in $ctx.result.items)
      ${this.generateItemOwnershipFilter(model)}
      #if($includeItem)
        $util.qr($filteredItems.add($item))
      #end
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
    #if(!$includeItem && $item.${ownerField} == $userId)
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
        "sql": "SELECT * FROM ${tableName} WHERE id = :id",
        "parameters": [
          {
            "name": "id",
            "value": {
              "stringValue": "$ctx.args.id"
            }
          }
        ]
      #elseif($operation == "INSERT")
        "sql": "INSERT INTO ${tableName} (${this.generateColumnList(model)}) VALUES (${this.generateValuePlaceholders(model)})",
        "parameters": [
          ${this.generateParameterList(model)}
        ]
      #elseif($operation == "UPDATE")
        "sql": "UPDATE ${tableName} SET ${this.generateUpdateSet(model)} WHERE id = :id",
        "parameters": [
          ${this.generateUpdateParameters(model)}
        ]
      #elseif($operation == "DELETE")
        "sql": "DELETE FROM ${tableName} WHERE id = :id",
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
    return Object.keys(model.properties).map(key => `:${key}`).join(', ');
  }

  private generateParameterList(model: ModelDefinition): string {
    return Object.entries(model.properties).map(([key, prop]) => `
      {
        "name": "${key}",
        "value": {
          "${this.getParameterType(prop.type)}": "$ctx.args.input.${key}"
        }
      }`).join(',');
  }

  private generateUpdateSet(model: ModelDefinition): string {
    return Object.keys(model.properties)
      .filter(key => key !== 'id')
      .map(key => `${key} = :${key}`)
      .join(', ');
  }

  private generateUpdateParameters(model: ModelDefinition): string {
    const params = Object.entries(model.properties)
      .filter(([key]) => key !== 'id')
      .map(([key, prop]) => `
        {
          "name": "${key}",
          "value": {
            "${this.getParameterType(prop.type)}": "$ctx.args.input.${key}"
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

    const beforeHook = model.hooks[`before${operation}` as keyof typeof model.hooks];
    const afterHook = model.hooks[`after${operation}` as keyof typeof model.hooks];

    // Add before hook function
    if (beforeHook) {
      functions.push(`
        #set($beforeResult = $util.transform.toLambdaRequest({
          "operation": "before${operation}",
          "model": "${model.name}",
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
          "operation": "after${operation}",
          "model": "${model.name}",
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
        operationTemplate = `
          ${authCheck}
          {
            "version": "2018-05-29",
            "operation": "PutItem",
            "key": {
              "id": $util.dynamodb.toDynamoDBJson($util.autoId())
            },
            "attributeValues": $util.dynamodb.toMapValuesJson($ctx.args.input),
            "condition": {
              "expression": "attribute_not_exists(id)"
            }
          }
        `;
        break;
        
      case 'read':
        operationTemplate = `
          ${authCheck}
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
        operationTemplate = `
          ${authCheck}
          ${preOwnershipCheck}
          #if(!$ctx.stash.needsOwnershipCheck)
            {
              "version": "2018-05-29",
              "operation": "UpdateItem",
              "key": {
                "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
              },
              "update": {
                "expression": "SET ${this.generateUpdateExpression(model)}",
                "expressionNames": ${this.generateExpressionNames(model)},
                "expressionValues": $util.dynamodb.toMapValuesJson($ctx.args.input)
              }
            }
          #end
        `;
        break;
        
      case 'delete':
        const preDeleteOwnershipCheck = this.securityGenerator.generatePreOperationOwnershipCheck(model, 'delete');
        operationTemplate = `
          ${authCheck}
          ${preDeleteOwnershipCheck}
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
    return `
      {
        "version": "2018-05-29",
        "statements": [
          "${this.generateSQLStatement(model, operation)}"
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
                "operation": "${operation}",
                "model": "${model.name}",
                "args": $ctx.args,
                "requestId": "$util.autoId()"
              })
            }
          }
        }
      `;
    } else {
      return `
        {
          "version": "2018-05-29",
          "method": "POST",
          "resourcePath": "${this.getApiPath(model, operation)}",
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
    const properties = Object.keys(model.properties).filter(key => key !== 'id');
    return properties.map(prop => `#${prop} = :${prop}`).join(', ');
  }

  private generateExpressionNames(model: ModelDefinition): string {
    const properties = Object.keys(model.properties).filter(key => key !== 'id');
    const names = properties.reduce((acc, prop) => {
      acc[`#${prop}`] = prop;
      return acc;
    }, {} as Record<string, string>);
    return JSON.stringify(names);
  }

  private generateSQLStatement(model: ModelDefinition, operation: string): string {
    switch (operation.toLowerCase()) {
      case 'create':
        return `INSERT INTO ${model.name.toLowerCase()}s (${Object.keys(model.properties).join(', ')}) VALUES (${Object.keys(model.properties).map(() => '?').join(', ')})`;
      case 'read':
        return `SELECT * FROM ${model.name.toLowerCase()}s WHERE id = ?`;
      case 'update':
        return `UPDATE ${model.name.toLowerCase()}s SET ${Object.keys(model.properties).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
      case 'delete':
        return `DELETE FROM ${model.name.toLowerCase()}s WHERE id = ?`;
      default:
        return '';
    }
  }

  private getApiPath(model: ModelDefinition, operation: string): string {
    switch (operation.toLowerCase()) {
      case 'create':
        return `/${model.name.toLowerCase()}`;
      case 'read':
        return `/${model.name.toLowerCase()}/$ctx.args.id`;
      case 'update':
        return `/${model.name.toLowerCase()}/$ctx.args.id`;
      case 'delete':
        return `/${model.name.toLowerCase()}/$ctx.args.id`;
      default:
        return `/${model.name.toLowerCase()}`;
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
  #if($ctx.result.${field})
    #set($ctx.result.${field}_local = $util.time.formatDateTime($ctx.result.${field}, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", $userTimezone))
  #end`;
    }

    return conversion;
  }
}
