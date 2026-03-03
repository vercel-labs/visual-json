import type React from "react";
import { useState, useCallback, useRef, useMemo } from "react";
import { isDescendant, type TreeNode } from "@visual-json/core";
import {
  computeDrop,
  setMultiDragImage as setMultiDragImageShared,
  type DragState,
} from "@internal/ui";
import { useStudio } from "./context";

export type { DragState } from "@internal/ui";

const EMPTY_SET: ReadonlySet<string> = Object.freeze(new Set<string>());

const INITIAL_DRAG_STATE: DragState = {
  draggedNodeIds: EMPTY_SET,
  dropTargetNodeId: null,
  dropPosition: null,
};

export function setMultiDragImage(e: React.DragEvent, count: number) {
  setMultiDragImageShared(e.dataTransfer, count);
}

export function useDragDrop(
  visibleNodes: TreeNode[],
  selectedNodeIds: ReadonlySet<string>,
) {
  const { state, actions } = useStudio();
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const dragStateRef = useRef<DragState>(dragState);
  dragStateRef.current = dragState;

  const visibleNodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    visibleNodes.forEach((n, i) => map.set(n.id, i));
    return map;
  }, [visibleNodes]);

  const handleDragStart = useCallback(
    (nodeId: string) => {
      let ids: ReadonlySet<string>;
      if (selectedNodeIds.size > 0 && selectedNodeIds.has(nodeId)) {
        ids = selectedNodeIds;
      } else {
        ids = new Set([nodeId]);
      }
      setDragState({
        draggedNodeIds: ids,
        dropTargetNodeId: null,
        dropPosition: null,
      });
    },
    [selectedNodeIds],
  );

  const rawDragOver = useCallback(
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

  const handleDragOver = useCallback(
    (nodeId: string, position: "before" | "after") => {
      if (position === "before") {
        const idx = visibleNodeIndexMap.get(nodeId);
        if (idx !== undefined && idx > 0) {
          rawDragOver(visibleNodes[idx - 1].id, "after");
          return;
        }
      }
      rawDragOver(nodeId, position);
    },
    [visibleNodes, visibleNodeIndexMap, rawDragOver],
  );

  const handleDragEnd = useCallback(() => {
    setDragState(INITIAL_DRAG_STATE);
  }, []);

  const handleDrop = useCallback(() => {
    const currentDragState = dragStateRef.current;
    const newTree = computeDrop(state.tree, currentDragState);
    if (newTree) {
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
