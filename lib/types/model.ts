export interface ModelDefinition {
  name: string;
  properties: { [key: string]: PropertyDefinition };
  dataSource: DataSourceDefinition;
  accessControl?: AccessControlDefinition;
  relationships?: { [key: string]: RelationshipDefinition };
  hooks?: HooksDefinition;
  enableSubscriptions?: boolean;
}

export interface PropertyDefinition {
  type: 'String' | 'Int' | 'Float' | 'Boolean' | 'ID' | 'AWSDateTime' | 'AWSJSON';
  required?: boolean;
  isOwner?: boolean;
  defaultValue?: any;
}

export interface DataSourceDefinition {
  type: 'database' | 'thirdPartyApi';
  engine?: 'nosql' | 'sql';
  endpoint?: string;
  limits?: {
    frequencyInSeconds: number;
    limit: number;
  };
}

export interface AccessControlDefinition {
  default: string; // 'allow' | 'deny'
  rules: AccessRule[];
}

export interface AccessRule {
  allow: 'create' | 'read' | 'update' | 'delete';
  groups?: string[];
  owner?: boolean;
}

export interface RelationshipDefinition {
  type: 'hasMany' | 'belongsTo' | 'hasOne';
  target: string;
  foreignKey?: string;
}

export interface HooksDefinition {
  beforeCreate?: string;
  afterCreate?: string;
  beforeUpdate?: string;
  afterUpdate?: string;
  beforeDelete?: string;
  afterDelete?: string;
}

export interface SeedData {
  [modelName: string]: any[];
}
