import type { TreeNode, JsonSchemaProperty } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function schemaTypeMatches(
  nodeType: string,
  schemaType: string | string[] | undefined,
): boolean {
  if (!schemaType) return true;
  const types = Array.isArray(schemaType) ? schemaType : [schemaType];

  if (nodeType === "number" && types.includes("integer")) return true;
  return types.includes(nodeType);
}

const FORMAT_PATTERNS: Record<string, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uri: /^https?:\/\/.+/,
  "uri-reference": /^(https?:\/\/|\/|\.\.?\/|#).*/,
  "date-time": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}:\d{2}/,
  ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
  ipv6: /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/,
  uuid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  hostname:
    /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
};

export function validateNode(
  node: TreeNode,
  schema: JsonSchemaProperty | undefined,
): ValidationResult {
  const errors: string[] = [];

  if (!schema) {
    return { valid: true, errors };
  }

  if (schema.type && !schemaTypeMatches(node.type, schema.type)) {
    const expected = Array.isArray(schema.type)
      ? schema.type.join(" | ")
      : schema.type;
    errors.push(`Expected type "${expected}", got "${node.type}"`);
  }

  if (schema.enum && schema.enum.length > 0 && node.value !== undefined) {
    const match = schema.enum.some(
      (v) => JSON.stringify(v) === JSON.stringify(node.value),
    );
    if (!match) {
      errors.push(
        `Value must be one of: ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`,
      );
    }
  }

  if (schema.const !== undefined && node.value !== undefined) {
    if (JSON.stringify(node.value) !== JSON.stringify(schema.const)) {
      errors.push(`Value must be ${JSON.stringify(schema.const)}`);
    }
  }

  if (schema.required && (node.type === "object" || node.type === "array")) {
    const childKeys = new Set(node.children.map((c) => c.key));
    for (const req of schema.required) {
      if (!childKeys.has(req)) {
        errors.push(`Missing required property "${req}"`);
      }
    }
  }

  if (node.type === "number" && typeof node.value === "number") {
    const val = node.value;
    if (schema.minimum !== undefined && val < schema.minimum) {
      errors.push(`Value must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && val > schema.maximum) {
      errors.push(`Value must be <= ${schema.maximum}`);
    }
    if (schema.exclusiveMinimum !== undefined) {
      const bound =
        typeof schema.exclusiveMinimum === "number"
          ? schema.exclusiveMinimum
          : schema.minimum;
      if (bound !== undefined && val <= bound) {
        errors.push(`Value must be > ${bound}`);
      }
    }
    if (schema.exclusiveMaximum !== undefined) {
      const bound =
        typeof schema.exclusiveMaximum === "number"
          ? schema.exclusiveMaximum
          : schema.maximum;
      if (bound !== undefined && val >= bound) {
        errors.push(`Value must be < ${bound}`);
      }
    }
    if (schema.multipleOf !== undefined) {
      const remainder = Math.abs(val % schema.multipleOf);
      if (
        remainder > 1e-10 &&
        Math.abs(remainder - schema.multipleOf) > 1e-10
      ) {
        errors.push(`Value must be a multiple of ${schema.multipleOf}`);
      }
    }
  }

  if (node.type === "string" && typeof node.value === "string") {
    const val = node.value;
    if (schema.minLength !== undefined && val.length < schema.minLength) {
      errors.push(`Must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && val.length > schema.maxLength) {
      errors.push(`Must be at most ${schema.maxLength} characters`);
    }
    if (schema.pattern) {
      try {
        if (!new RegExp(schema.pattern).test(val)) {
          errors.push(`Must match pattern: ${schema.pattern}`);
        }
      } catch {
        // invalid regex in schema, skip
      }
    }
    if (schema.format && FORMAT_PATTERNS[schema.format]) {
      if (!FORMAT_PATTERNS[schema.format].test(val)) {
        errors.push(`Invalid ${schema.format} format`);
      }
    }
  }

  if (node.type === "array") {
    if (
      schema.minItems !== undefined &&
      node.children.length < schema.minItems
    ) {
      errors.push(`Must have at least ${schema.minItems} items`);
    }
    if (
      schema.maxItems !== undefined &&
      node.children.length > schema.maxItems
    ) {
      errors.push(`Must have at most ${schema.maxItems} items`);
    }
  }

  if (node.type === "object") {
    if (
      schema.minProperties !== undefined &&
      node.children.length < schema.minProperties
    ) {
      errors.push(`Must have at least ${schema.minProperties} properties`);
    }
    if (
      schema.maxProperties !== undefined &&
      node.children.length > schema.maxProperties
    ) {
      errors.push(`Must have at most ${schema.maxProperties} properties`);
    }
  }

  return { valid: errors.length === 0, errors };
}
