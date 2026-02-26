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
  type SearchMatch,
  type TreeNode,
} from "@visual-json/core";
import { StudioContext, type StudioState, type StudioActions } from "./context";
import { getVisibleNodes } from "./get-visible-nodes";
import { computeRangeIds } from "./selection-utils";

export interface VisualJsonProps {
  value: JsonValue;
  onChange?: (value: JsonValue) => void;
  schema?: JsonSchema | null;
  children: ReactNode;
}

function collectAllIds(node: TreeNode): string[] {
  const ids: string[] = [node.id];
  for (const child of node.children) {
    ids.push(...collectAllIds(child));
  }
  return ids;
}

export function VisualJson({
  value,
  onChange,
  schema,
  children,
}: VisualJsonProps) {
  const [tree, setTreeState] = useState<TreeState>(() => fromJson(value));
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const anchorNodeIdRef = useRef<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set([tree.root.id]),
  );

  const visibleNodes = useMemo(
    () => getVisibleNodes(tree.root, (id) => expandedNodeIds.has(id)),
    [tree.root, expandedNodeIds],
  );

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
    setFocusedNodeId(null);
    setSelectedNodeIds(new Set<string>());
    anchorNodeIdRef.current = null;
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

  const selectNode = useCallback((nodeId: string | null) => {
    setFocusedNodeId(nodeId);
    setSelectedNodeIds(nodeId ? new Set([nodeId]) : new Set<string>());
    anchorNodeIdRef.current = nodeId;
  }, []);

  const toggleNodeSelection = useCallback((nodeId: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        if (next.size === 0) {
          setFocusedNodeId(null);
          anchorNodeIdRef.current = null;
          return next;
        }
      } else {
        next.add(nodeId);
      }
      return next;
    });
    setFocusedNodeId(nodeId);
    anchorNodeIdRef.current = nodeId;
  }, []);

  const selectNodeRange = useCallback(
    (toNodeId: string) => {
      const anchor = anchorNodeIdRef.current;
      if (!anchor) {
        setFocusedNodeId(toNodeId);
        setSelectedNodeIds(new Set([toNodeId]));
        anchorNodeIdRef.current = toNodeId;
        return;
      }
      const rangeIds = computeRangeIds(visibleNodes, anchor, toNodeId);
      if (!rangeIds) {
        setFocusedNodeId(toNodeId);
        setSelectedNodeIds(new Set([toNodeId]));
        anchorNodeIdRef.current = toNodeId;
        return;
      }
      setSelectedNodeIds(rangeIds);
      setFocusedNodeId(toNodeId);
    },
    [visibleNodes],
  );

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
        setFocusedNodeId(firstId);
        setSelectedNodeIds(new Set([firstId]));
        anchorNodeIdRef.current = firstId;
      }
    },
    [tree],
  );

  const nextSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (searchMatchIndex + 1) % searchMatches.length;
    const nodeId = searchMatches[nextIdx].nodeId;
    setSearchMatchIndex(nextIdx);
    setFocusedNodeId(nodeId);
    setSelectedNodeIds(new Set([nodeId]));
    anchorNodeIdRef.current = nodeId;
  }, [searchMatches, searchMatchIndex]);

  const prevSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx =
      (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    const nodeId = searchMatches[prevIdx].nodeId;
    setSearchMatchIndex(prevIdx);
    setFocusedNodeId(nodeId);
    setSelectedNodeIds(new Set([nodeId]));
    anchorNodeIdRef.current = nodeId;
  }, [searchMatches, searchMatchIndex]);

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
      toggleNodeSelection,
      selectNodeRange,
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
      toggleNodeSelection,
      selectNodeRange,
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
