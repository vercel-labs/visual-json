import type { TreeNode, TreeState } from "@visual-json/core";

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
