import type { TreeNode } from "@visual-json/core";

export function getVisibleNodes(
  root: TreeNode,
  isExpanded: (nodeId: string) => boolean,
): TreeNode[] {
  const result: TreeNode[] = [];

  function walk(node: TreeNode) {
    result.push(node);
    if (
      isExpanded(node.id) &&
      (node.type === "object" || node.type === "array")
    ) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);
  return result;
}
