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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set([tree.root.id]),
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
    setSelectedNodeId(null);
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
    setSelectedNodeId(nodeId);
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
        const ancestors = getAncestorIds(
          tree,
          matches.map((m) => m.nodeId),
        );
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          for (const id of ancestors) next.add(id);
          return next;
        });
        setSelectedNodeId(matches[0].nodeId);
      }
    },
    [tree],
  );

  const nextSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (searchMatchIndex + 1) % searchMatches.length;
    setSearchMatchIndex(nextIdx);
    setSelectedNodeId(searchMatches[nextIdx].nodeId);
  }, [searchMatches, searchMatchIndex]);

  const prevSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx =
      (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(prevIdx);
    setSelectedNodeId(searchMatches[prevIdx].nodeId);
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
      selectedNodeId,
      expandedNodeIds,
      schema: schema ?? null,
      searchQuery,
      searchMatches,
      searchMatchIndex,
      searchMatchNodeIds,
    }),
    [
      tree,
      selectedNodeId,
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
