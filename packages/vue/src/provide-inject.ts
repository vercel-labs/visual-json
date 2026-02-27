import { type InjectionKey, type Ref, type ComputedRef } from "vue";
import type {
  TreeNode,
  TreeState,
  JsonSchema,
  SearchMatch,
} from "@visual-json/core";

export interface StudioState {
  tree: Ref<TreeState>;
  focusedNodeId: Ref<string | null>;
  selectedNodeIds: Ref<Set<string>>;
  anchorNodeId: Ref<string | null>;
  drillDownNodeId: Ref<string | null>;
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
  selectAndDrillDown: (nodeId: string | null) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectNodeRange: (toNodeId: string) => void;
  setSelection: (
    focusedId: string | null,
    selectedIds: Set<string>,
    anchorId: string | null,
  ) => void;
  setVisibleNodesOverride: (nodes: TreeNode[] | null) => void;
  drillDown: (nodeId: string | null) => void;
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
