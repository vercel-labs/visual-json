import type {
  TreeNode,
  TreeState,
  JsonSchema,
  SearchMatch,
} from "@visual-json/core";

export interface StudioState {
  readonly tree: TreeState;
  readonly focusedNodeId: string | null;
  readonly selectedNodeIds: Set<string>;
  readonly anchorNodeId: string | null;
  readonly drillDownNodeId: string | null;
  readonly expandedNodeIds: Set<string>;
  readonly schema: JsonSchema | null;
  readonly searchQuery: string;
  readonly searchMatches: SearchMatch[];
  readonly searchMatchIndex: number;
  readonly searchMatchNodeIds: Set<string>;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface StudioActions {
  setTree(tree: TreeState): void;
  selectNode(nodeId: string | null): void;
  selectAndDrillDown(nodeId: string | null): void;
  toggleNodeSelection(nodeId: string): void;
  selectNodeRange(toNodeId: string): void;
  setSelection(
    focusedId: string | null,
    selectedIds: Set<string>,
    anchorId: string | null,
  ): void;
  setVisibleNodesOverride(nodes: TreeNode[] | null): void;
  drillDown(nodeId: string | null): void;
  toggleExpand(nodeId: string): void;
  expandNode(nodeId: string): void;
  collapseNode(nodeId: string): void;
  expandAll(): void;
  collapseAll(): void;
  undo(): void;
  redo(): void;
  setSearchQuery(query: string): void;
  nextSearchMatch(): void;
  prevSearchMatch(): void;
}

export interface StudioContextValue {
  state: StudioState;
  actions: StudioActions;
}

export const STUDIO_KEY = Symbol("StudioContext");
