import type { NodeType, JsonSchemaProperty } from "./types";

export type WidgetType = "select" | "radio" | "checkbox" | "input";

const RADIO_MAX_OPTIONS = 3;

export function getWidgetType(
  nodeType: NodeType,
  schema: JsonSchemaProperty | undefined,
): WidgetType {
  const xWidget = schema?.["x-widget"];
  if (xWidget === "radio") return "radio";
  if (xWidget === "checkbox") return "checkbox";
  if (xWidget === "select") return "select";

  if (nodeType === "boolean") return "checkbox";

  if (schema?.enum && schema.enum.length > 0) {
    return schema.enum.length <= RADIO_MAX_OPTIONS ? "radio" : "select";
  }

  return "input";
}
