import { parse, stringify } from "yaml";
import type { JsonValue, TreeState } from "@visual-json/core";
import { fromJson, toJson } from "@visual-json/core";

/**
 * Returns true if the filename has a YAML extension.
 */
export function isYamlFile(filename: string): boolean {
  return filename.endsWith(".yaml") || filename.endsWith(".yml");
}

/**
 * Parse a YAML string to a plain JsonValue.
 */
export function parseYamlContent(text: string): JsonValue {
  return (parse(text) as JsonValue) ?? {};
}

/**
 * Serialize a plain JsonValue to a YAML string.
 */
export function stringifyYamlContent(value: JsonValue): string {
  return stringify(value, { lineWidth: 0 });
}

/**
 * Parse a YAML string into a TreeState.
 */
export function fromYaml(text: string): TreeState {
  return fromJson(parseYamlContent(text));
}

/**
 * Serialize a TreeState back to a YAML string.
 */
export function toYaml(state: TreeState): string {
  return stringifyYamlContent(toJson(state.root));
}
