import { useState, useCallback, useRef } from "react";
import {
  removeNode,
  insertProperty,
  isDescendant,
  toJson,
} from "@visual-json/core";
import { useStudio } from "./context";

export interface DragState {
  draggedNodeIds: Set<string>;
  dropTargetNodeId: string | null;
  dropPosition: "before" | "after" | null;
}

const EMPTY_SET = new Set<string>();

const INITIAL_DRAG_STATE: DragState = {
  draggedNodeIds: EMPTY_SET,
  dropTargetNodeId: null,
  dropPosition: null,
};

export function useDragDrop() {
  const { state, actions } = useStudio();
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const dragStateRef = useRef<DragState>(dragState);
  dragStateRef.current = dragState;

  const handleDragStart = useCallback(
    (nodeId: string, selectedIds?: Set<string>) => {
      let ids: Set<string>;
      if (selectedIds && selectedIds.size > 0 && selectedIds.has(nodeId)) {
        ids = selectedIds;
      } else {
        ids = new Set([nodeId]);
      }
      setDragState({
        draggedNodeIds: ids,
        dropTargetNodeId: null,
        dropPosition: null,
      });
    },
    [],
  );

  const handleDragOver = useCallback(
    (nodeId: string, position: "before" | "after") => {
      const draggedIds = dragStateRef.current.draggedNodeIds;
      for (const draggedId of draggedIds) {
        if (
          nodeId === draggedId ||
          isDescendant(state.tree, nodeId, draggedId)
        ) {
          return;
        }
      }

      setDragState((prev) => ({
        ...prev,
        dropTargetNodeId: nodeId,
        dropPosition: position,
      }));
    },
    [state.tree],
  );

  const handleDragEnd = useCallback(() => {
    setDragState(INITIAL_DRAG_STATE);
  }, []);

  const handleDrop = useCallback(() => {
    const { draggedNodeIds, dropTargetNodeId, dropPosition } =
      dragStateRef.current;
    if (draggedNodeIds.size === 0 || !dropTargetNodeId || !dropPosition) return;

    const targetNode = state.tree.nodesById.get(dropTargetNodeId);
    if (!targetNode || !targetNode.parentId) return;

    for (const id of draggedNodeIds) {
      if (isDescendant(state.tree, dropTargetNodeId, id)) return;
    }

    const targetParentId = targetNode.parentId;
    const targetParent = state.tree.nodesById.get(targetParentId);
    if (!targetParent) return;

    const parentChildren = targetParent.children;
    const orderedDragIds = parentChildren
      .filter((c) => draggedNodeIds.has(c.id))
      .map((c) => c.id);

    const allSameParent =
      orderedDragIds.length === draggedNodeIds.size &&
      [...draggedNodeIds].every((id) => {
        const n = state.tree.nodesById.get(id);
        return n?.parentId === targetParentId;
      });

    if (allSameParent) {
      const remaining = parentChildren.filter((c) => !draggedNodeIds.has(c.id));
      let insertIdx = remaining.findIndex((c) => c.id === dropTargetNodeId);
      if (insertIdx === -1) {
        insertIdx = dropPosition === "after" ? remaining.length : 0;
      } else {
        if (dropPosition === "after") insertIdx++;
      }
      const dragged = orderedDragIds.map(
        (id) => parentChildren.find((c) => c.id === id)!,
      );
      const newChildren = [...remaining];
      newChildren.splice(insertIdx, 0, ...dragged);

      const { clonePathToNode, reindexArrayChildren, rebuildMap } =
        getInternals();
      const newRoot = clonePathToNode(state.tree.root, targetParentId, (p) =>
        reindexArrayChildren({ ...p, children: newChildren }),
      );
      actions.setTree({ root: newRoot, nodesById: rebuildMap(newRoot) });
    } else {
      const draggedData = [...draggedNodeIds]
        .map((id) => state.tree.nodesById.get(id))
        .filter((n): n is NonNullable<typeof n> => !!n && n.parentId !== null)
        .map((n) => ({ key: n.key, value: toJson(n) }));

      let newTree = state.tree;
      for (const id of draggedNodeIds) {
        if (newTree.nodesById.has(id)) {
          newTree = removeNode(newTree, id);
        }
      }

      const updatedTarget = newTree.nodesById.get(dropTargetNodeId);
      if (!updatedTarget || !updatedTarget.parentId) {
        setDragState(INITIAL_DRAG_STATE);
        return;
      }

      const updatedParent = newTree.nodesById.get(updatedTarget.parentId)!;
      let insertIdx = updatedParent.children.findIndex(
        (c) => c.id === dropTargetNodeId,
      );
      if (dropPosition === "after") insertIdx++;

      for (let i = 0; i < draggedData.length; i++) {
        const { key, value } = draggedData[i];
        const actualKey =
          updatedParent.type === "array" ? String(insertIdx + i) : key;
        newTree = insertProperty(
          newTree,
          updatedParent.id,
          actualKey,
          value,
          insertIdx + i,
        );
      }

      actions.setTree(newTree);
    }

    setDragState(INITIAL_DRAG_STATE);
  }, [state.tree, actions]);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
}

import type { TreeNode, TreeState } from "@visual-json/core";

function getInternals() {
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

  function clonePathToNode(
    root: TreeNode,
    targetId: string,
    updater: (node: TreeNode) => TreeNode,
  ): TreeNode {
    if (root.id === targetId) return updater(root);
    return {
      ...root,
      children: root.children.map((child) => {
        if (child.id === targetId) return updater(child);
        const hasTarget = findInSubtree(child, targetId);
        if (hasTarget) return clonePathToNode(child, targetId, updater);
        return child;
      }),
    };
  }

  function findInSubtree(node: TreeNode, targetId: string): boolean {
    if (node.id === targetId) return true;
    return node.children.some((c) => findInSubtree(c, targetId));
  }

  return { rebuildMap, reindexArrayChildren, clonePathToNode };
}
