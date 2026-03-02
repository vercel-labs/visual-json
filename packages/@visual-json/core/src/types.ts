export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type NodeType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array";

export interface TreeNode {
  id: string;
  key: string;
  path: string;
  type: NodeType;
  value: JsonPrimitive | undefined;
  children: TreeNode[];
  parentId: string | null;
}

export interface TreeState {
  root: TreeNode;
  nodesById: Map<string, TreeNode>;
}

export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: JsonValue[];
  default?: JsonValue;
  const?: JsonValue;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty | JsonSchemaProperty[];
  additionalItems?: JsonSchemaProperty | boolean;
  additionalProperties?: JsonSchemaProperty | boolean;
  patternProperties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  $ref?: string;
  allOf?: JsonSchemaProperty[];
  anyOf?: JsonSchemaProperty[];
  oneOf?: JsonSchemaProperty[];
  not?: JsonSchemaProperty;
  if?: JsonSchemaProperty;
  then?: JsonSchemaProperty;
  else?: JsonSchemaProperty;
  definitions?: Record<string, JsonSchemaProperty>;
  $defs?: Record<string, JsonSchemaProperty>;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: JsonValue[];
  title?: string;
}

export interface JsonSchema extends JsonSchemaProperty {
  $schema?: string;
}
