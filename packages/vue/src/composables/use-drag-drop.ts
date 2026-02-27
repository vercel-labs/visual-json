import { shallowRef, type Ref } from "vue";
import { isDescendant, type TreeNode } from "@visual-json/core";
import {
  type DragState,
  INITIAL_DRAG_STATE,
  computeDrop,
} from "@visual-json/ui-shared";
import { useStudio } from "./use-studio";

export type { DragState } from "@visual-json/ui-shared";

export function useDragDrop(
  visibleNodes: Ref<TreeNode[]>,
  selectedNodeIds: Ref<ReadonlySet<string>>,
) {
  const { state, actions } = useStudio();
  const dragState = shallowRef<DragState>(INITIAL_DRAG_STATE());

  function handleDragStart(nodeId: string) {
    let ids: ReadonlySet<string>;
    if (selectedNodeIds.value.size > 0 && selectedNodeIds.value.has(nodeId)) {
      ids = selectedNodeIds.value;
    } else {
      ids = new Set([nodeId]);
    }
    dragState.value = {
      draggedNodeIds: ids,
      dropTargetNodeId: null,
      dropPosition: null,
    };
  }

  function rawDragOver(nodeId: string, position: "before" | "after") {
    const draggedIds = dragState.value.draggedNodeIds;
    for (const draggedId of draggedIds) {
      if (
        nodeId === draggedId ||
        isDescendant(state.tree.value, nodeId, draggedId)
      ) {
        return;
      }
    }

    dragState.value = {
      ...dragState.value,
      dropTargetNodeId: nodeId,
      dropPosition: position,
    };
  }

  function handleDragOver(nodeId: string, position: "before" | "after") {
    if (position === "before") {
      const idx = visibleNodes.value.findIndex((n) => n.id === nodeId);
      if (idx > 0) {
        rawDragOver(visibleNodes.value[idx - 1].id, "after");
        return;
      }
    }
    rawDragOver(nodeId, position);
  }

  function handleDragEnd() {
    dragState.value = INITIAL_DRAG_STATE();
  }

  function handleDrop() {
    const newTree = computeDrop(state.tree.value, dragState.value);
    if (newTree) {
      actions.setTree(newTree);
    }
    dragState.value = INITIAL_DRAG_STATE();
  }

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
}
