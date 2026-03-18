import type { JsonValue, TreeState } from "./types";
import { fromJson, toJson } from "./tree";

/**
 * Parse a YAML string into a TreeState.
 *
 * Uses dynamic import so the `yaml` package is only loaded when YAML
 * features are actually used — keeping the core bundle lightweight for
 * JSON-only consumers.
 */
export async function fromYaml(yamlText: string): Promise<TreeState> {
  const { parse } = await import("yaml");
  const value = parse(yamlText) as JsonValue;
  return fromJson(value ?? {});
}

/**
 * Serialize a TreeState back to a YAML string.
 */
export async function toYaml(state: TreeState): Promise<string> {
  const { stringify } = await import("yaml");
  const value = toJson(state.root);
  return stringify(value, { lineWidth: 0 });
}

/**
 * Convert a plain JsonValue to a YAML string.
 */
export async function jsonValueToYaml(value: JsonValue): Promise<string> {
  const { stringify } = await import("yaml");
  return stringify(value, { lineWidth: 0 });
}

/**
 * Parse a YAML string to a plain JsonValue.
 */
export async function yamlToJsonValue(yamlText: string): Promise<JsonValue> {
  const { parse } = await import("yaml");
  return (parse(yamlText) as JsonValue) ?? {};
}
