import { createContext, useContext } from "react";
import type {
  TreeState,
  TreeNode,
  JsonSchema,
  SearchMatch,
} from "@visual-json/core";

export interface StudioState {
  tree: TreeState;
  focusedNodeId: string | null;
  selectedNodeIds: Set<string>;
  anchorNodeId: string | null;
  drillDownNodeId: string | null;
  expandedNodeIds: Set<string>;
  schema: JsonSchema | null;
  searchQuery: string;
  searchMatches: SearchMatch[];
  searchMatchIndex: number;
  searchMatchNodeIds: Set<string>;
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
  canUndo: boolean;
  canRedo: boolean;
  setSearchQuery: (query: string) => void;
  nextSearchMatch: () => void;
  prevSearchMatch: () => void;
}

export interface StudioContextValue {
  state: StudioState;
  actions: StudioActions;
}

export const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error("useStudio must be used within a <VisualJson> provider");
  }
  return ctx;
}
