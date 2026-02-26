import { ref } from "vue";
import { reorderChildren, moveNode, isDescendant } from "@visual-json/core";
import { useStudio } from "./use-studio";

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
  const dragState = ref<DragState>({ ...INITIAL_DRAG_STATE });

  function handleDragStart(nodeId: string) {
    dragState.value = {
      draggedNodeId: nodeId,
      dropTargetNodeId: null,
      dropPosition: null,
    };
  }

  function handleDragOver(nodeId: string, position: "before" | "after") {
    const draggedId = dragState.value.draggedNodeId;
    if (draggedId && isDescendant(state.tree.value, nodeId, draggedId)) return;

    dragState.value = {
      ...dragState.value,
      dropTargetNodeId: nodeId,
      dropPosition: position,
    };
  }

  function handleDragEnd() {
    dragState.value = { ...INITIAL_DRAG_STATE };
  }

  function handleDrop() {
    const { draggedNodeId, dropTargetNodeId, dropPosition } = dragState.value;
    if (!draggedNodeId || !dropTargetNodeId || !dropPosition) return;

    const draggedNode = state.tree.value.nodesById.get(draggedNodeId);
    const targetNode = state.tree.value.nodesById.get(dropTargetNodeId);
    if (!draggedNode || !targetNode) return;

    if (isDescendant(state.tree.value, dropTargetNodeId, draggedNodeId)) return;

    if (draggedNode.parentId && draggedNode.parentId === targetNode.parentId) {
      const parent = state.tree.value.nodesById.get(draggedNode.parentId);
      if (parent) {
        const fromIndex = parent.children.findIndex(
          (c) => c.id === draggedNodeId,
        );
        let toIndex = parent.children.findIndex(
          (c) => c.id === dropTargetNodeId,
        );
        if (dropPosition === "after") {
          toIndex++;
        }
        if (fromIndex < toIndex) {
          toIndex--;
        }
        if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
          const newTree = reorderChildren(
            state.tree.value,
            parent.id,
            fromIndex,
            toIndex,
          );
          actions.setTree(newTree);
        }
      }
    } else if (targetNode.parentId) {
      const newParent = state.tree.value.nodesById.get(targetNode.parentId);
      if (newParent) {
        let toIndex = newParent.children.findIndex(
          (c) => c.id === dropTargetNodeId,
        );
        if (dropPosition === "after") toIndex++;
        const newTree = moveNode(
          state.tree.value,
          draggedNodeId,
          newParent.id,
          toIndex,
        );
        actions.setTree(newTree);
      }
    }

    dragState.value = { ...INITIAL_DRAG_STATE };
  }

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
}
