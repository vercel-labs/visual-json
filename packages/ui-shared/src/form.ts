import {
  getPropertySchema,
  resolveRef,
  type TreeNode,
  type JsonSchema,
  type JsonSchemaProperty,
} from "@visual-json/core";

export function getResolvedSchema(
  schema: JsonSchema | null,
  rootSchema: JsonSchemaProperty | undefined,
  path: string,
): JsonSchemaProperty | undefined {
  if (!schema) return undefined;
  const raw = getPropertySchema(schema, path, rootSchema);
  if (!raw) return undefined;
  return resolveRef(raw, rootSchema ?? schema);
}

export function getValueColor(node: TreeNode): string {
  if (node.type === "boolean" || node.type === "null")
    return "var(--vj-boolean, #569cd6)";
  if (node.type === "number") return "var(--vj-number, #b5cea8)";
  return "var(--vj-string, #ce9178)";
}

export function getDisplayValue(node: TreeNode): string {
  if (node.type === "null") return "null";
  if (node.type === "boolean") return String(node.value);
  if (node.value === null || node.value === undefined) return "";
  return String(node.value);
}

export function checkRequired(
  node: TreeNode,
  schema: JsonSchema | null,
  rootSchema: JsonSchemaProperty | undefined,
): boolean {
  if (!schema || !node.parentId) return false;
  const parentPath = node.path.split("/").slice(0, -1).join("/") || "/";
  const parentSchema = getResolvedSchema(schema, rootSchema, parentPath);
  return parentSchema?.required?.includes(node.key) ?? false;
}

export function parseInputValue(
  value: string,
  schemaType: string | string[] | undefined,
  nodeType: string,
): string | number | boolean | null {
  // Normalize array type to first element for matching
  const primaryType = Array.isArray(schemaType) ? schemaType[0] : schemaType;
  if (primaryType === "boolean" || value === "true" || value === "false") {
    return value === "true";
  }
  if (value === "null") {
    return null;
  }
  if (
    primaryType === "number" ||
    primaryType === "integer" ||
    nodeType === "number"
  ) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  return value;
}
