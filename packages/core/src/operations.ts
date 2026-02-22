import type {
  JsonPrimitive,
  JsonValue,
  NodeType,
  TreeNode,
  TreeState,
} from "./types";
import { toJson, getNodeType, buildSubtree } from "./tree";

function rebuildMap(root: TreeNode): Map<string, TreeNode> {
  const map = new Map<string, TreeNode>();
  function walk(node: TreeNode) {
    map.set(node.id, node);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return map;
}

function recomputePaths(node: TreeNode, newParentPath: string): TreeNode {
  const newPath = newParentPath
    ? `${newParentPath}/${node.key}`
    : `/${node.key}`;
  if (node.path === newPath && node.children.length === 0) return node;
  return {
    ...node,
    path: newPath,
    children: node.children.map((child) => recomputePaths(child, newPath)),
  };
}

/**
 * Clone only the ancestor chain from root to `targetId` (structural sharing),
 * apply `updater` to the target, and rebuild the `nodesById` map.
 */
function clonePathToNode(
  state: TreeState,
  targetId: string,
  updater: (node: TreeNode) => TreeNode,
): TreeState {
  const chain: string[] = [];
  let cur: TreeNode | undefined = state.nodesById.get(targetId);
  while (cur) {
    chain.unshift(cur.id);
    cur = cur.parentId ? state.nodesById.get(cur.parentId) : undefined;
  }
  if (chain.length === 0) return state;

  function cloneAlongPath(node: TreeNode, depth: number): TreeNode {
    if (depth === chain.length - 1) {
      return updater(node);
    }
    const nextInChain = chain[depth + 1];
    return {
      ...node,
      children: node.children.map((child) =>
        child.id === nextInChain ? cloneAlongPath(child, depth + 1) : child,
      ),
    };
  }

  const newRoot = cloneAlongPath(state.root, 0);
  return { root: newRoot, nodesById: rebuildMap(newRoot) };
}

function reindexArrayChildren(parent: TreeNode): TreeNode {
  if (parent.type !== "array") return parent;
  const parentPath = parent.path === "/" ? "" : parent.path;
  return {
    ...parent,
    children: parent.children.map((child, i) => {
      const newKey = String(i);
      if (child.key === newKey) return child;
      return recomputePaths({ ...child, key: newKey }, parentPath);
    }),
  };
}

export function setValue(
  state: TreeState,
  nodeId: string,
  value: JsonValue,
): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node) return state;

  const newType = getNodeType(value);

  if (newType !== "object" && newType !== "array") {
    return clonePathToNode(state, nodeId, (n) => ({
      ...n,
      type: newType,
      value: value as JsonPrimitive,
      children: [],
    }));
  }

  return clonePathToNode(state, nodeId, (n) => {
    const parentPath = n.path.split("/").slice(0, -1).join("/") || "";
    const nodesById = new Map<string, TreeNode>();
    const subtree = buildSubtree(
      n.key,
      value,
      parentPath,
      n.parentId,
      nodesById,
    );
    return { ...subtree, id: n.id };
  });
}

export function setKey(
  state: TreeState,
  nodeId: string,
  newKey: string,
): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node || !node.parentId) return state;

  const parent = state.nodesById.get(node.parentId);
  if (!parent || parent.type !== "object") return state;

  return clonePathToNode(state, nodeId, (n) => {
    const parentPath = parent.path === "/" ? "" : parent.path;
    const newPath = `${parentPath}/${newKey}`;
    const updated: TreeNode = { ...n, key: newKey, path: newPath };
    if (updated.children.length > 0) {
      updated.children = updated.children.map((child) =>
        recomputePaths(child, newPath),
      );
    }
    return updated;
  });
}

export function addProperty(
  state: TreeState,
  parentId: string,
  key: string,
  value: JsonValue,
): TreeState {
  const parent = state.nodesById.get(parentId);
  if (!parent) return state;

  return clonePathToNode(state, parentId, (p) => {
    const parentPath = p.path === "/" ? "" : p.path;
    const nodesById = new Map<string, TreeNode>();
    const newChild = buildSubtree(key, value, parentPath, p.id, nodesById);
    return { ...p, children: [...p.children, newChild] };
  });
}

export function removeNode(state: TreeState, nodeId: string): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node || !node.parentId) return state;

  return clonePathToNode(state, node.parentId, (p) => {
    const newChildren = p.children.filter((c) => c.id !== nodeId);
    return reindexArrayChildren({ ...p, children: newChildren });
  });
}

export function moveNode(
  state: TreeState,
  nodeId: string,
  newParentId: string,
  index?: number,
): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node || !node.parentId) return state;

  const srcParent = state.nodesById.get(node.parentId);
  const dstParent = state.nodesById.get(newParentId);
  if (!srcParent || !dstParent) return state;

  const nodeValue = toJson(node);

  const removed = clonePathToNode(state, node.parentId, (p) => {
    const newChildren = p.children.filter((c) => c.id !== nodeId);
    return reindexArrayChildren({ ...p, children: newChildren });
  });

  return clonePathToNode(removed, newParentId, (p) => {
    const parentPath = p.path === "/" ? "" : p.path;
    const nodesById = new Map<string, TreeNode>();
    const newChild = buildSubtree(
      p.type === "array" ? String(index ?? p.children.length) : node.key,
      nodeValue,
      parentPath,
      p.id,
      nodesById,
    );
    const newChildren = [...p.children];
    const insertAt = index ?? newChildren.length;
    newChildren.splice(insertAt, 0, newChild);
    return reindexArrayChildren({ ...p, children: newChildren });
  });
}

export function reorderChildren(
  state: TreeState,
  parentId: string,
  fromIndex: number,
  toIndex: number,
): TreeState {
  const parent = state.nodesById.get(parentId);
  if (!parent) return state;

  return clonePathToNode(state, parentId, (p) => {
    const newChildren = [...p.children];
    const [item] = newChildren.splice(fromIndex, 1);
    newChildren.splice(toIndex, 0, item);
    return reindexArrayChildren({ ...p, children: newChildren });
  });
}

function convertValue(current: JsonValue, newType: NodeType): JsonValue {
  switch (newType) {
    case "string":
      if (current === null || current === undefined) return "";
      if (typeof current === "object") return JSON.stringify(current);
      return String(current);
    case "number": {
      const n = Number(current);
      return isNaN(n) ? 0 : n;
    }
    case "boolean":
      return Boolean(current);
    case "null":
      return null;
    case "object":
      if (
        current !== null &&
        typeof current === "object" &&
        !Array.isArray(current)
      )
        return current;
      if (Array.isArray(current)) {
        const obj: Record<string, JsonValue> = {};
        current.forEach((item, i) => {
          obj[String(i)] = item;
        });
        return obj;
      }
      return {};
    case "array":
      if (Array.isArray(current)) return current;
      if (current !== null && typeof current === "object")
        return Object.values(current);
      return current === null || current === undefined ? [] : [current];
    default:
      return current;
  }
}

export function changeType(
  state: TreeState,
  nodeId: string,
  newType: NodeType,
): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node) return state;

  const currentValue = toJson(node);
  const newValue = convertValue(currentValue, newType);
  return setValue(state, nodeId, newValue);
}

export function duplicateNode(state: TreeState, nodeId: string): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node || !node.parentId) return state;

  const parent = state.nodesById.get(node.parentId);
  if (!parent) return state;

  const nodeValue = toJson(node);

  return clonePathToNode(state, node.parentId, (p) => {
    const idx = p.children.findIndex((c) => c.id === nodeId);
    const parentPath = p.path === "/" ? "" : p.path;
    const newKey = p.type === "array" ? String(idx + 1) : `${node.key}_copy`;
    const nodesById = new Map<string, TreeNode>();
    const newChild = buildSubtree(
      newKey,
      structuredClone(nodeValue),
      parentPath,
      p.id,
      nodesById,
    );
    const newChildren = [...p.children];
    newChildren.splice(idx + 1, 0, newChild);
    return reindexArrayChildren({ ...p, children: newChildren });
  });
}
