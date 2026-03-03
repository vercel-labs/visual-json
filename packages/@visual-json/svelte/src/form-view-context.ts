import type { JsonSchema, JsonSchemaProperty } from "@visual-json/core";
import type { DragState } from "@internal/ui";

export interface FormViewContext {
  readonly schema: JsonSchema | null;
  readonly rootSchema: JsonSchemaProperty | undefined;
  showDescriptions: boolean;
  showCounts: boolean;
  readonly editingNodeId: string | null;
  readonly collapsedIds: Set<string>;
  readonly maxKeyLength: number;
  readonly maxDepth: number;
  readonly isFocused: boolean;
  readonly dragState: DragState;
  onSelect(nodeId: string, e: MouseEvent): void;
  onToggleCollapse(nodeId: string): void;
  onStartEditing(nodeId: string): void;
  onDragStart(nodeId: string): void;
  onDragOver(nodeId: string, position: "before" | "after"): void;
  onDragEnd(): void;
  onDrop(): void;
}

export const FORM_VIEW_KEY = Symbol("FormViewContext");
