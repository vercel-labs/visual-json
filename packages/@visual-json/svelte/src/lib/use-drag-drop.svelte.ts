import { isDescendant, type TreeNode } from "@visual-json/core";
import { type DragState, INITIAL_DRAG_STATE, computeDrop } from "@internal/ui";
import { useStudio } from "./use-studio.js";

export type { DragState } from "@internal/ui";

export function useDragDrop(
  getVisibleNodes: () => TreeNode[],
  getSelectedNodeIds: () => ReadonlySet<string>,
) {
  const { state: studioState, actions } = useStudio();
  let dragState = $state<DragState>(INITIAL_DRAG_STATE());

  function handleDragStart(nodeId: string) {
    const selected = getSelectedNodeIds();
    const ids: ReadonlySet<string> =
      selected.size > 0 && selected.has(nodeId) ? selected : new Set([nodeId]);
    dragState = {
      draggedNodeIds: ids,
      dropTargetNodeId: null,
      dropPosition: null,
    };
  }

  function rawDragOver(nodeId: string, position: "before" | "after") {
    for (const draggedId of dragState.draggedNodeIds) {
      if (
        nodeId === draggedId ||
        isDescendant(studioState.tree, nodeId, draggedId)
      )
        return;
    }
    dragState = {
      ...dragState,
      dropTargetNodeId: nodeId,
      dropPosition: position,
    };
  }

  function handleDragOver(nodeId: string, position: "before" | "after") {
    if (position === "before") {
      const nodes = getVisibleNodes();
      const idx = nodes.findIndex((n) => n.id === nodeId);
      if (idx > 0) {
        rawDragOver(nodes[idx - 1].id, "after");
        return;
      }
    }
    rawDragOver(nodeId, position);
  }

  function handleDragEnd() {
    dragState = INITIAL_DRAG_STATE();
  }

  function handleDrop() {
    const newTree = computeDrop(studioState.tree, dragState);
    if (newTree) actions.setTree(newTree);
    dragState = INITIAL_DRAG_STATE();
  }

  return {
    get dragState() {
      return dragState;
    },
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
}
