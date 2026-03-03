import type { TreeNode, TreeState } from "@visual-json/core";

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

const LABEL_FIELDS = ["name", "type", "title", "id", "label", "key"];

/**
 * For array items that are objects, returns a meaningful label derived from
 * well-known child fields (name, type, title, id, label, key) instead of
 * the numeric index.
 */
export function getDisplayKey(node: TreeNode, state: TreeState): string {
  if (node.parentId === null) return "/";

  const parent = state.nodesById.get(node.parentId);
  if (parent?.type !== "array" || node.type !== "object") return node.key;

  for (const field of LABEL_FIELDS) {
    const child = node.children.find((c) => c.key === field);
    if (child?.value != null && child.value !== "") {
      return String(child.value);
    }
  }

  return node.key;
}

export function collectAllIds(node: TreeNode): string[] {
  const ids: string[] = [node.id];
  for (const child of node.children) {
    ids.push(...collectAllIds(child));
  }
  return ids;
}
