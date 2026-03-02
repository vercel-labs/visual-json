import type { TreeNode, TreeState } from "./types";

export interface SearchMatch {
  nodeId: string;
  field: "key" | "value";
}

export function searchNodes(tree: TreeState, query: string): SearchMatch[] {
  if (!query.trim()) return [];
  const matches: SearchMatch[] = [];
  const lower = query.toLowerCase();

  function walk(node: TreeNode) {
    if (node.key && node.key.toLowerCase().includes(lower)) {
      matches.push({ nodeId: node.id, field: "key" });
    }
    if (
      node.value !== undefined &&
      node.value !== null &&
      String(node.value).toLowerCase().includes(lower)
    ) {
      matches.push({ nodeId: node.id, field: "value" });
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(tree.root);
  return matches;
}

/**
 * Collect all ancestor node IDs for each matched node so the tree
 * can auto-expand paths to search results.
 */
export function getAncestorIds(
  tree: TreeState,
  nodeIds: string[],
): Set<string> {
  const ancestors = new Set<string>();

  for (const nodeId of nodeIds) {
    let current = tree.nodesById.get(nodeId);
    while (current && current.parentId) {
      ancestors.add(current.parentId);
      current = tree.nodesById.get(current.parentId);
    }
  }

  return ancestors;
}
