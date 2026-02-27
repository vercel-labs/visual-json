import type { TreeState } from "@visual-json/core";
import { reorderChildren, moveNode, isDescendant } from "@visual-json/core";

export interface DragState {
  draggedNodeId: string | null;
  dropTargetNodeId: string | null;
  dropPosition: "before" | "after" | null;
}

export const INITIAL_DRAG_STATE: () => DragState = () => ({
  draggedNodeId: null,
  dropTargetNodeId: null,
  dropPosition: null,
});

/**
 * Given the current tree and drag state, computes the new tree after a drop.
 * Returns null if the drop is invalid or a no-op.
 */
export function computeDrop(
  tree: TreeState,
  drag: DragState,
): TreeState | null {
  const { draggedNodeId, dropTargetNodeId, dropPosition } = drag;
  if (!draggedNodeId || !dropTargetNodeId || !dropPosition) return null;

  const draggedNode = tree.nodesById.get(draggedNodeId);
  const targetNode = tree.nodesById.get(dropTargetNodeId);
  if (!draggedNode || !targetNode) return null;

  // Prevent dropping a node into its own descendants
  if (isDescendant(tree, dropTargetNodeId, draggedNodeId)) return null;

  if (draggedNode.parentId && draggedNode.parentId === targetNode.parentId) {
    const parent = tree.nodesById.get(draggedNode.parentId);
    if (parent) {
      const fromIndex = parent.children.findIndex(
        (c) => c.id === draggedNodeId,
      );
      let toIndex = parent.children.findIndex((c) => c.id === dropTargetNodeId);
      if (dropPosition === "after") toIndex++;
      if (fromIndex < toIndex) toIndex--;
      if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
        return reorderChildren(tree, parent.id, fromIndex, toIndex);
      }
    }
  } else if (targetNode.parentId) {
    const newParent = tree.nodesById.get(targetNode.parentId);
    if (newParent) {
      let toIndex = newParent.children.findIndex(
        (c) => c.id === dropTargetNodeId,
      );
      if (dropPosition === "after") toIndex++;
      return moveNode(tree, draggedNodeId, newParent.id, toIndex);
    }
  }

  return null;
}
