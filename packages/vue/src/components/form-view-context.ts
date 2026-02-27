import type { InjectionKey, Ref, ComputedRef } from "vue";
import type { JsonSchema, JsonSchemaProperty } from "@visual-json/core";
import type { DragState } from "../composables/use-drag-drop";

export interface FormViewContext {
  schema: ComputedRef<JsonSchema | null>;
  rootSchema: ComputedRef<JsonSchemaProperty | undefined>;
  showDescriptions: boolean;
  showCounts: boolean;
  editingNodeId: Ref<string | null>;
  collapsedIds: Ref<Set<string>>;
  maxKeyLength: ComputedRef<number>;
  maxDepth: ComputedRef<number>;
  isFocused: Ref<boolean>;
  dragState: Ref<DragState>;
  onSelect: (nodeId: string, e: MouseEvent) => void;
  onToggleCollapse: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragOver: (nodeId: string, position: "before" | "after") => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

export const FORM_VIEW_KEY: InjectionKey<FormViewContext> =
  Symbol("FormViewContext");
