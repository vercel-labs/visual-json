import type { TreeNode, TreeState } from "@visual-json/core";
import {
  reorderChildrenMulti,
  removeNode,
  insertNode,
  isDescendant,
} from "@visual-json/core";
import { DEFAULT_CSS_VARS } from "./theme";

export interface DragState {
  draggedNodeIds: ReadonlySet<string>;
  dropTargetNodeId: string | null;
  dropPosition: "before" | "after" | null;
}

const EMPTY_SET: ReadonlySet<string> = Object.freeze(new Set<string>());

export const INITIAL_DRAG_STATE: () => DragState = () => ({
  draggedNodeIds: EMPTY_SET,
  dropTargetNodeId: null,
  dropPosition: null,
});

export function sortByTreeOrder(
  root: TreeNode,
  ids: ReadonlySet<string>,
): string[] {
  const result: string[] = [];
  function walk(node: TreeNode) {
    if (ids.has(node.id)) result.push(node.id);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return result;
}

/**
 * Given the current tree and drag state, computes the new tree after a drop.
 * Supports multi-node drag: same-parent reorder uses reorderChildrenMulti,
 * cross-parent moves remove then insert each node.
 * Returns null if the drop is invalid or a no-op.
 */
export function computeDrop(
  tree: TreeState,
  drag: DragState,
): TreeState | null {
  const { draggedNodeIds, dropTargetNodeId, dropPosition } = drag;
  if (draggedNodeIds.size === 0 || !dropTargetNodeId || !dropPosition)
    return null;

  const targetNode = tree.nodesById.get(dropTargetNodeId);
  if (!targetNode || !targetNode.parentId) return null;

  for (const id of draggedNodeIds) {
    if (isDescendant(tree, dropTargetNodeId, id)) return null;
  }

  const targetParentId = targetNode.parentId;
  const targetParent = tree.nodesById.get(targetParentId);
  if (!targetParent) return null;

  const parentChildren = targetParent.children;
  const orderedDragIds = parentChildren
    .filter((c) => draggedNodeIds.has(c.id))
    .map((c) => c.id);

  const allSameParent =
    orderedDragIds.length === draggedNodeIds.size &&
    [...draggedNodeIds].every((id) => {
      const n = tree.nodesById.get(id);
      return n?.parentId === targetParentId;
    });

  if (allSameParent) {
    return reorderChildrenMulti(
      tree,
      targetParentId,
      orderedDragIds,
      dropTargetNodeId,
      dropPosition,
    );
  }

  // Cross-parent: remove all dragged nodes then insert at target
  const orderedIds = sortByTreeOrder(tree.root, draggedNodeIds);
  const draggedNodes = orderedIds
    .map((id) => tree.nodesById.get(id))
    .filter((n): n is NonNullable<typeof n> => !!n && n.parentId !== null)
    .map((n) => structuredClone(n));

  let newTree = tree;
  for (const id of [...orderedIds].reverse()) {
    if (newTree.nodesById.has(id)) {
      newTree = removeNode(newTree, id);
    }
  }

  const updatedTarget = newTree.nodesById.get(dropTargetNodeId);
  if (!updatedTarget || !updatedTarget.parentId) return null;

  const updatedParent = newTree.nodesById.get(updatedTarget.parentId);
  if (!updatedParent) return null;

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

  return newTree;
}

/**
 * Sets a custom drag image showing "N selected" for multi-node drag.
 * Framework-agnostic: takes a DataTransfer object directly.
 */
export function setMultiDragImage(
  dataTransfer: DataTransfer,
  count: number,
  rootEl?: Element | null,
) {
  const ghost = document.createElement("div");
  ghost.textContent = `${count} selected`;
  const root =
    rootEl ?? document.querySelector("[data-form-container], [role='tree']");
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
  dataTransfer.setDragImage(ghost, 0, 14);
  requestAnimationFrame(() => ghost.remove());
}
