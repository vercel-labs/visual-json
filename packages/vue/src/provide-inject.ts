import { type InjectionKey, type Ref, type ComputedRef } from "vue";
import type { TreeState, JsonSchema, SearchMatch } from "@visual-json/core";

export interface StudioState {
  tree: Ref<TreeState>;
  selectedNodeId: Ref<string | null>;
  expandedNodeIds: Ref<Set<string>>;
  schema: Ref<JsonSchema | null>;
  searchQuery: Ref<string>;
  searchMatches: Ref<SearchMatch[]>;
  searchMatchIndex: Ref<number>;
  searchMatchNodeIds: ComputedRef<Set<string>>;
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
}

export interface StudioActions {
  setTree: (tree: TreeState) => void;
  selectNode: (nodeId: string | null) => void;
  toggleExpand: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  undo: () => void;
  redo: () => void;
  setSearchQuery: (query: string) => void;
  nextSearchMatch: () => void;
  prevSearchMatch: () => void;
}

export interface StudioContextValue {
  state: StudioState;
  actions: StudioActions;
}

export const STUDIO_KEY: InjectionKey<StudioContextValue> =
  Symbol("StudioContext");
