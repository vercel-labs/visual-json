import { ref } from "vue";
import { isDescendant } from "@visual-json/core";
import {
  type DragState,
  INITIAL_DRAG_STATE,
  computeDrop,
} from "@visual-json/ui-shared";
import { useStudio } from "./use-studio";

export type { DragState } from "@visual-json/ui-shared";

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
    const newTree = computeDrop(state.tree.value, dragState.value);
    if (newTree) {
      actions.setTree(newTree);
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
