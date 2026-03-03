import { removeNode, type TreeNode, type TreeState } from "@visual-json/core";

export function computeSelectAllIds(
  tree: TreeState,
  focusedNodeId: string | null,
  currentlySelected: Set<string>,
): Set<string> | null {
  if (!focusedNodeId) return null;
  let node: TreeNode | undefined = tree.nodesById.get(focusedNodeId);
  if (!node) return null;

  while (node) {
    const parent: TreeNode | undefined = node.parentId
      ? tree.nodesById.get(node.parentId)
      : undefined;
    const siblings = parent ? parent.children : [tree.root];
    const siblingIds = new Set<string>(siblings.map((s) => s.id));
    const allSelected = siblings.every((s) => currentlySelected.has(s.id));
    if (!allSelected) {
      return siblingIds;
    }
    if (!parent || !parent.parentId) return siblingIds;
    node = parent;
  }
  return null;
}

export function computeRangeIds(
  visibleNodes: TreeNode[],
  anchorId: string,
  targetId: string,
): Set<string> | null {
  const anchorIdx = visibleNodes.findIndex((n) => n.id === anchorId);
  const targetIdx = visibleNodes.findIndex((n) => n.id === targetId);
  if (anchorIdx === -1 || targetIdx === -1) return null;
  const start = Math.min(anchorIdx, targetIdx);
  const end = Math.max(anchorIdx, targetIdx);
  const ids = new Set<string>();
  for (let i = start; i <= end; i++) {
    ids.add(visibleNodes[i].id);
  }
  return ids;
}

export function deleteSelectedNodes(
  tree: TreeState,
  selectedIds: Set<string>,
  visibleNodes: TreeNode[],
): { newTree: TreeState; nextFocusId: string | null } {
  const idsToDelete = [...selectedIds].filter((id) => {
    const node = tree.nodesById.get(id);
    if (!node || node.parentId === null) return false;
    let cur = tree.nodesById.get(node.parentId);
    while (cur) {
      if (selectedIds.has(cur.id)) return false;
      cur = cur.parentId ? tree.nodesById.get(cur.parentId) : undefined;
    }
    return true;
  });

  if (idsToDelete.length === 0) return { newTree: tree, nextFocusId: null };

  const firstDeletedIdx = visibleNodes.findIndex((n) => selectedIds.has(n.id));

  let newTree = tree;
  for (const id of idsToDelete) {
    if (newTree.nodesById.has(id)) {
      newTree = removeNode(newTree, id);
    }
  }

  let nextFocusId: string | null = null;
  for (let i = firstDeletedIdx; i < visibleNodes.length; i++) {
    const id = visibleNodes[i].id;
    if (!selectedIds.has(id) && newTree.nodesById.has(id)) {
      nextFocusId = id;
      break;
    }
  }
  if (!nextFocusId) {
    for (let i = firstDeletedIdx - 1; i >= 0; i--) {
      const id = visibleNodes[i].id;
      if (!selectedIds.has(id) && newTree.nodesById.has(id)) {
        nextFocusId = id;
        break;
      }
    }
  }

  return { newTree, nextFocusId };
}
