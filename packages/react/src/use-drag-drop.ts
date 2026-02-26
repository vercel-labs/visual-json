import { useState, useCallback, useRef } from "react";
import {
  removeNode,
  insertProperty,
  reorderChildrenMulti,
  isDescendant,
  toJson,
  type TreeNode,
} from "@visual-json/core";
import { useStudio } from "./context";

export interface DragState {
  draggedNodeIds: Set<string>;
  dropTargetNodeId: string | null;
  dropPosition: "before" | "after" | null;
}

const EMPTY_SET = new Set<string>();

const INITIAL_DRAG_STATE: DragState = {
  draggedNodeIds: EMPTY_SET,
  dropTargetNodeId: null,
  dropPosition: null,
};

function sortByTreeOrder(root: TreeNode, ids: Set<string>): string[] {
  const result: string[] = [];
  function walk(node: TreeNode) {
    if (ids.has(node.id)) result.push(node.id);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return result;
}

export function useDragDrop() {
  const { state, actions } = useStudio();
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const dragStateRef = useRef<DragState>(dragState);
  dragStateRef.current = dragState;

  const handleDragStart = useCallback(
    (nodeId: string, selectedIds?: Set<string>) => {
      let ids: Set<string>;
      if (selectedIds && selectedIds.size > 0 && selectedIds.has(nodeId)) {
        ids = selectedIds;
      } else {
        ids = new Set([nodeId]);
      }
      setDragState({
        draggedNodeIds: ids,
        dropTargetNodeId: null,
        dropPosition: null,
      });
    },
    [],
  );

  const handleDragOver = useCallback(
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
      const draggedData = orderedIds
        .map((id) => state.tree.nodesById.get(id))
        .filter((n): n is NonNullable<typeof n> => !!n && n.parentId !== null)
        .map((n) => ({ key: n.key, value: toJson(n) }));

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

      for (let i = 0; i < draggedData.length; i++) {
        const { key, value } = draggedData[i];
        const actualKey =
          updatedParent.type === "array" ? String(insertIdx + i) : key;
        newTree = insertProperty(
          newTree,
          updatedParent.id,
          actualKey,
          value,
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
