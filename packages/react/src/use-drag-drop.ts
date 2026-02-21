import { useState, useCallback, useRef } from "react";
import { reorderChildren, moveNode, type TreeState } from "@visual-json/core";
import { useStudio } from "./context";

/** Check if `nodeId` is a descendant of `potentialAncestorId` by walking up parentId links. */
function isDescendant(
  tree: TreeState,
  nodeId: string,
  potentialAncestorId: string,
): boolean {
  let current = tree.nodesById.get(nodeId);
  while (current) {
    if (current.id === potentialAncestorId) return true;
    current = current.parentId
      ? tree.nodesById.get(current.parentId)
      : undefined;
  }
  return false;
}

export interface DragState {
  draggedNodeId: string | null;
  dropTargetNodeId: string | null;
  dropPosition: "before" | "after" | null;
}

const INITIAL_DRAG_STATE: DragState = {
  draggedNodeId: null,
  dropTargetNodeId: null,
  dropPosition: null,
};

export function useDragDrop() {
  const { state, actions } = useStudio();
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const dragStateRef = useRef<DragState>(dragState);
  dragStateRef.current = dragState;

  const handleDragStart = useCallback((nodeId: string) => {
    setDragState({
      draggedNodeId: nodeId,
      dropTargetNodeId: null,
      dropPosition: null,
    });
  }, []);

  const handleDragOver = useCallback(
    (nodeId: string, position: "before" | "after") => {
      const draggedId = dragStateRef.current.draggedNodeId;
      if (draggedId && isDescendant(state.tree, nodeId, draggedId)) return;

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
    const { draggedNodeId, dropTargetNodeId, dropPosition } =
      dragStateRef.current;
    if (!draggedNodeId || !dropTargetNodeId || !dropPosition) return;

    const draggedNode = state.tree.nodesById.get(draggedNodeId);
    const targetNode = state.tree.nodesById.get(dropTargetNodeId);
    if (!draggedNode || !targetNode) return;

    // Prevent dropping a node into its own descendants
    if (isDescendant(state.tree, dropTargetNodeId, draggedNodeId)) return;

    if (draggedNode.parentId && draggedNode.parentId === targetNode.parentId) {
      const parent = state.tree.nodesById.get(draggedNode.parentId);
      if (parent) {
        const fromIndex = parent.children.findIndex(
          (c) => c.id === draggedNodeId,
        );
        let toIndex = parent.children.findIndex(
          (c) => c.id === dropTargetNodeId,
        );
        if (dropPosition === "after") toIndex++;
        if (fromIndex < toIndex) toIndex--;
        if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
          const newTree = reorderChildren(
            state.tree,
            parent.id,
            fromIndex,
            toIndex,
          );
          actions.setTree(newTree);
        }
      }
    } else if (targetNode.parentId) {
      const newParent = state.tree.nodesById.get(targetNode.parentId);
      if (newParent) {
        let toIndex = newParent.children.findIndex(
          (c) => c.id === dropTargetNodeId,
        );
        if (dropPosition === "after") toIndex++;
        const newTree = moveNode(
          state.tree,
          draggedNodeId,
          newParent.id,
          toIndex,
        );
        actions.setTree(newTree);
      }
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
