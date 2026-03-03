import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  fromJson,
  toJson,
  History,
  searchNodes,
  getAncestorIds,
  type JsonValue,
  type JsonSchema,
  type TreeState,
  type TreeNode,
  type SearchMatch,
} from "@visual-json/core";
import { collectAllIds, getVisibleNodes } from "@internal/ui";
import { StudioContext, type StudioState, type StudioActions } from "./context";
import { computeRangeIds } from "./selection-utils";

export interface VisualJsonProps {
  value: JsonValue;
  onChange?: (value: JsonValue) => void;
  schema?: JsonSchema | null;
  children: ReactNode;
}

export function VisualJson({
  value,
  onChange,
  schema,
  children,
}: VisualJsonProps) {
  const [tree, setTreeState] = useState<TreeState>(() => fromJson(value));
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIdsState] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const selectedNodeIdsRef = useRef<Set<string>>(new Set());
  const setSelectedNodeIds = useCallback((ids: Set<string>) => {
    selectedNodeIdsRef.current = ids;
    setSelectedNodeIdsState(ids);
  }, []);
  const anchorNodeIdRef = useRef<string | null>(null);
  const [anchorNodeId, setAnchorNodeIdState] = useState<string | null>(null);
  const [drillDownNodeId, setDrillDownNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set([tree.root.id]),
  );

  const setAnchorNodeId = useCallback((id: string | null) => {
    anchorNodeIdRef.current = id;
    setAnchorNodeIdState(id);
  }, []);

  const focusSelectAndDrillDown = useCallback(
    (nodeId: string | null) => {
      setFocusedNodeId(nodeId);
      setSelectedNodeIds(nodeId ? new Set([nodeId]) : new Set<string>());
      setAnchorNodeId(nodeId);
      setDrillDownNodeId(nodeId);
    },
    [setSelectedNodeIds, setAnchorNodeId],
  );

  const visibleNodes = useMemo(
    () => getVisibleNodes(tree.root, (id) => expandedNodeIds.has(id)),
    [tree.root, expandedNodeIds],
  );

  const visibleNodesOverrideRef = useRef<TreeNode[] | null>(null);

  const setVisibleNodesOverride = useCallback((nodes: TreeNode[] | null) => {
    visibleNodesOverrideRef.current = nodes;
  }, []);

  const historyRef = useRef<History>(new History());
  const isInternalChange = useRef(false);
  const hasMounted = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [searchQuery, setSearchQueryState] = useState("");
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [searchMatchNodeIds, setSearchMatchNodeIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    historyRef.current.push(tree);
    setCanUndo(historyRef.current.canUndo);
    setCanRedo(historyRef.current.canRedo);
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const newTree = fromJson(value);
    setTreeState(newTree);
    setExpandedNodeIds(new Set([newTree.root.id]));
    focusSelectAndDrillDown(null);
    historyRef.current = new History();
    historyRef.current.push(newTree);
    setCanUndo(false);
    setCanRedo(false);
    setSearchQueryState("");
    setSearchMatches([]);
    setSearchMatchIndex(0);
    setSearchMatchNodeIds(new Set());
  }, [value]);

  const setTree = useCallback(
    (newTree: TreeState) => {
      setTreeState(newTree);
      historyRef.current.push(newTree);
      setCanUndo(historyRef.current.canUndo);
      setCanRedo(historyRef.current.canRedo);
      isInternalChange.current = true;
      onChange?.(toJson(newTree.root));
    },
    [onChange],
  );

  const undo = useCallback(() => {
    const prev = historyRef.current.undo();
    if (prev) {
      setTreeState(prev);
      setCanUndo(historyRef.current.canUndo);
      setCanRedo(historyRef.current.canRedo);
      isInternalChange.current = true;
      onChange?.(toJson(prev.root));
    }
  }, [onChange]);

  const redo = useCallback(() => {
    const next = historyRef.current.redo();
    if (next) {
      setTreeState(next);
      setCanUndo(historyRef.current.canUndo);
      setCanRedo(historyRef.current.canRedo);
      isInternalChange.current = true;
      onChange?.(toJson(next.root));
    }
  }, [onChange]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (mod && e.key === "y") {
        e.preventDefault();
        redo();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const selectNode = useCallback(
    (nodeId: string | null) => {
      setFocusedNodeId(nodeId);
      setSelectedNodeIds(nodeId ? new Set([nodeId]) : new Set<string>());
      setAnchorNodeId(nodeId);
    },
    [setSelectedNodeIds, setAnchorNodeId],
  );

  const selectAndDrillDown = focusSelectAndDrillDown;

  const toggleNodeSelection = useCallback(
    (nodeId: string) => {
      const next = new Set(selectedNodeIdsRef.current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      setSelectedNodeIds(next);
      if (next.size === 0) {
        setFocusedNodeId(null);
        setAnchorNodeId(null);
      } else {
        setFocusedNodeId(nodeId);
        setAnchorNodeId(nodeId);
      }
    },
    [setSelectedNodeIds, setAnchorNodeId],
  );

  const selectNodeRange = useCallback(
    (toNodeId: string) => {
      const nodes = visibleNodesOverrideRef.current ?? visibleNodes;
      const anchor = anchorNodeIdRef.current;
      if (!anchor) {
        setFocusedNodeId(toNodeId);
        setSelectedNodeIds(new Set([toNodeId]));
        setAnchorNodeId(toNodeId);
        return;
      }
      const rangeIds = computeRangeIds(nodes, anchor, toNodeId);
      if (!rangeIds) {
        setFocusedNodeId(toNodeId);
        setSelectedNodeIds(new Set([toNodeId]));
        setAnchorNodeId(toNodeId);
        return;
      }
      setSelectedNodeIds(rangeIds);
      setFocusedNodeId(toNodeId);
    },
    [visibleNodes, setSelectedNodeIds, setAnchorNodeId],
  );

  const setSelection = useCallback(
    (
      focusedId: string | null,
      newSelectedIds: Set<string>,
      newAnchorId: string | null,
    ) => {
      setFocusedNodeId(focusedId);
      setSelectedNodeIds(newSelectedIds);
      setAnchorNodeId(newAnchorId);
    },
    [setSelectedNodeIds, setAnchorNodeId],
  );

  const drillDown = useCallback((nodeId: string | null) => {
    setDrillDownNodeId(nodeId);
  }, []);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const expandNode = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  const collapseNode = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = collectAllIds(tree.root);
    setExpandedNodeIds(new Set(allIds));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpandedNodeIds(new Set([tree.root.id]));
  }, [tree]);

  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);
      if (!query.trim()) {
        setSearchMatches([]);
        setSearchMatchIndex(0);
        setSearchMatchNodeIds(new Set());
        return;
      }
      const matches = searchNodes(tree, query);
      setSearchMatches(matches);
      setSearchMatchIndex(0);
      const matchIds = new Set(matches.map((m) => m.nodeId));
      setSearchMatchNodeIds(matchIds);

      if (matches.length > 0) {
        const firstId = matches[0].nodeId;
        const ancestors = getAncestorIds(
          tree,
          matches.map((m) => m.nodeId),
        );
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          for (const id of ancestors) next.add(id);
          return next;
        });
        focusSelectAndDrillDown(firstId);
      }
    },
    [tree],
  );

  const nextSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (searchMatchIndex + 1) % searchMatches.length;
    setSearchMatchIndex(nextIdx);
    focusSelectAndDrillDown(searchMatches[nextIdx].nodeId);
  }, [searchMatches, searchMatchIndex, focusSelectAndDrillDown]);

  const prevSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx =
      (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(prevIdx);
    focusSelectAndDrillDown(searchMatches[prevIdx].nodeId);
  }, [searchMatches, searchMatchIndex, focusSelectAndDrillDown]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const matches = searchNodes(tree, searchQuery);
    setSearchMatches(matches);
    setSearchMatchIndex((prev) =>
      Math.min(prev, Math.max(matches.length - 1, 0)),
    );
    setSearchMatchNodeIds(new Set(matches.map((m) => m.nodeId)));
  }, [tree]);

  const state: StudioState = useMemo(
    () => ({
      tree,
      focusedNodeId,
      selectedNodeIds,
      anchorNodeId,
      drillDownNodeId,
      expandedNodeIds,
      schema: schema ?? null,
      searchQuery,
      searchMatches,
      searchMatchIndex,
      searchMatchNodeIds,
    }),
    [
      tree,
      focusedNodeId,
      selectedNodeIds,
      anchorNodeId,
      drillDownNodeId,
      expandedNodeIds,
      schema,
      searchQuery,
      searchMatches,
      searchMatchIndex,
      searchMatchNodeIds,
    ],
  );

  const actions: StudioActions = useMemo(
    () => ({
      setTree,
      selectNode,
      selectAndDrillDown,
      toggleNodeSelection,
      selectNodeRange,
      setSelection,
      setVisibleNodesOverride,
      drillDown,
      toggleExpand,
      expandNode,
      collapseNode,
      expandAll,
      collapseAll,
      undo,
      redo,
      canUndo,
      canRedo,
      setSearchQuery,
      nextSearchMatch,
      prevSearchMatch,
    }),
    [
      setTree,
      selectNode,
      selectAndDrillDown,
      toggleNodeSelection,
      selectNodeRange,
      setSelection,
      setVisibleNodesOverride,
      drillDown,
      toggleExpand,
      expandNode,
      collapseNode,
      expandAll,
      collapseAll,
      undo,
      redo,
      canUndo,
      canRedo,
      setSearchQuery,
      nextSearchMatch,
      prevSearchMatch,
    ],
  );

  const contextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <StudioContext.Provider value={contextValue}>
      {children}
    </StudioContext.Provider>
  );
}
