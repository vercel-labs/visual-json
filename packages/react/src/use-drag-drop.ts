import type React from "react";
import { useState, useCallback, useRef, useMemo } from "react";
import {
  removeNode,
  insertNode,
  reorderChildrenMulti,
  isDescendant,
  type TreeNode,
} from "@visual-json/core";
import { useStudio } from "./context";
import { DEFAULT_CSS_VARS } from "./theme";

export interface DragState {
  draggedNodeIds: ReadonlySet<string>;
  dropTargetNodeId: string | null;
  dropPosition: "before" | "after" | null;
}

const EMPTY_SET: ReadonlySet<string> = Object.freeze(new Set<string>());

const INITIAL_DRAG_STATE: DragState = {
  draggedNodeIds: EMPTY_SET,
  dropTargetNodeId: null,
  dropPosition: null,
};

function sortByTreeOrder(root: TreeNode, ids: ReadonlySet<string>): string[] {
  const result: string[] = [];
  function walk(node: TreeNode) {
    if (ids.has(node.id)) result.push(node.id);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return result;
}

export function setMultiDragImage(e: React.DragEvent, count: number) {
  const ghost = document.createElement("div");
  ghost.textContent = `${count} selected`;
  const root = document.querySelector("[data-form-container], [role='tree']");
  const cs = root ? getComputedStyle(root) : null;
  const bg =
    cs?.getPropertyValue("--vj-bg-selected").trim() ||
    DEFAULT_CSS_VARS["--vj-bg-selected"];
  const fg =
    cs?.getPropertyValue("--vj-text-selected").trim() ||
    cs?.getPropertyValue("--vj-text").trim() ||
    DEFAULT_CSS_VARS["--vj-text"];
  const font =
    cs?.getPropertyValue("--vj-font").trim() || DEFAULT_CSS_VARS["--vj-font"];
  ghost.style.cssText = [
    "position:fixed",
    "top:-1000px",
    "left:-1000px",
    "padding:4px 12px",
    `background:${bg}`,
    `color:${fg}`,
    `font-family:${font}`,
    "font-size:13px",
    "border-radius:4px",
    "white-space:nowrap",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 0, 14);
  requestAnimationFrame(() => ghost.remove());
}

export function useDragDrop(
  visibleNodes: TreeNode[],
  selectedNodeIds: ReadonlySet<string>,
) {
  const { state, actions } = useStudio();
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const dragStateRef = useRef<DragState>(dragState);
  dragStateRef.current = dragState;

  const visibleNodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    visibleNodes.forEach((n, i) => map.set(n.id, i));
    return map;
  }, [visibleNodes]);

  const handleDragStart = useCallback(
    (nodeId: string) => {
      let ids: ReadonlySet<string>;
      if (selectedNodeIds.size > 0 && selectedNodeIds.has(nodeId)) {
        ids = selectedNodeIds;
      } else {
        ids = new Set([nodeId]);
      }
      setDragState({
        draggedNodeIds: ids,
        dropTargetNodeId: null,
        dropPosition: null,
      });
    },
    [selectedNodeIds],
  );

  const rawDragOver = useCallback(
    (nodeId: string, position: "before" | "after") => {
      const draggedIds = dragStateRef.current.draggedNodeIds;
      for (const draggedId of draggedIds) {
        if (
          nodeId === draggedId ||
          isDescendant(state.tree, nodeId, draggedId)
        ) {
          return;
        }
      }

      setDragState((prev) => ({
        ...prev,
        dropTargetNodeId: nodeId,
        dropPosition: position,
      }));
    },
    [state.tree],
  );

  const handleDragOver = useCallback(
    (nodeId: string, position: "before" | "after") => {
      if (position === "before") {
        const idx = visibleNodeIndexMap.get(nodeId);
        if (idx !== undefined && idx > 0) {
          rawDragOver(visibleNodes[idx - 1].id, "after");
          return;
        }
      }
      rawDragOver(nodeId, position);
    },
    [visibleNodes, visibleNodeIndexMap, rawDragOver],
  );

  const handleDragEnd = useCallback(() => {
    setDragState(INITIAL_DRAG_STATE);
  }, []);

  const handleDrop = useCallback(() => {
    const { draggedNodeIds, dropTargetNodeId, dropPosition } =
      dragStateRef.current;
    if (draggedNodeIds.size === 0 || !dropTargetNodeId || !dropPosition) return;

    const targetNode = state.tree.nodesById.get(dropTargetNodeId);
    if (!targetNode || !targetNode.parentId) return;

    for (const id of draggedNodeIds) {
      if (isDescendant(state.tree, dropTargetNodeId, id)) return;
    }

    const targetParentId = targetNode.parentId;
    const targetParent = state.tree.nodesById.get(targetParentId);
    if (!targetParent) return;

    const parentChildren = targetParent.children;
    const orderedDragIds = parentChildren
      .filter((c) => draggedNodeIds.has(c.id))
      .map((c) => c.id);

    const allSameParent =
      orderedDragIds.length === draggedNodeIds.size &&
      [...draggedNodeIds].every((id) => {
        const n = state.tree.nodesById.get(id);
        return n?.parentId === targetParentId;
      });

    if (allSameParent) {
      const newTree = reorderChildrenMulti(
        state.tree,
        targetParentId,
        orderedDragIds,
        dropTargetNodeId,
        dropPosition,
      );
      actions.setTree(newTree);
    } else {
      const orderedIds = sortByTreeOrder(state.tree.root, draggedNodeIds);
      const draggedNodes = orderedIds
        .map((id) => state.tree.nodesById.get(id))
        .filter((n): n is NonNullable<typeof n> => !!n && n.parentId !== null)
        .map((n) => structuredClone(n));

      let newTree = state.tree;
      for (const id of [...orderedIds].reverse()) {
        if (newTree.nodesById.has(id)) {
          newTree = removeNode(newTree, id);
        }
      }

      const updatedTarget = newTree.nodesById.get(dropTargetNodeId);
      if (!updatedTarget || !updatedTarget.parentId) {
        setDragState(INITIAL_DRAG_STATE);
        return;
      }

      const updatedParent = newTree.nodesById.get(updatedTarget.parentId);
      if (!updatedParent) {
        setDragState(INITIAL_DRAG_STATE);
        return;
      }
      let insertIdx = updatedParent.children.findIndex(
        (c) => c.id === dropTargetNodeId,
      );
      if (dropPosition === "after") insertIdx++;

      for (let i = 0; i < draggedNodes.length; i++) {
        newTree = insertNode(
          newTree,
          updatedParent.id,
          draggedNodes[i],
          insertIdx + i,
        );
      }

      actions.setTree(newTree);
    }

    setDragState(INITIAL_DRAG_STATE);
  }, [state.tree, actions]);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
}
