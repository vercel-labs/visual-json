import { useState, useCallback, useRef } from "react";
import { isDescendant } from "@visual-json/core";
import {
  type DragState,
  INITIAL_DRAG_STATE,
  computeDrop,
} from "@visual-json/ui-shared";
import { useStudio } from "./context";

export type { DragState } from "@visual-json/ui-shared";

export function useDragDrop() {
  const { state, actions } = useStudio();
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const dragStateRef = useRef<DragState>(dragState);
  dragStateRef.current = dragState;

  const handleDragStart = useCallback((nodeId: string) => {
    setDragState({
      draggedNodeId: nodeId,
      dropTargetNodeId: null,
      dropPosition: null,
    });
  }, []);

  const handleDragOver = useCallback(
    (nodeId: string, position: "before" | "after") => {
      const draggedId = dragStateRef.current.draggedNodeId;
      if (draggedId && isDescendant(state.tree, nodeId, draggedId)) return;

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
    const newTree = computeDrop(state.tree, dragStateRef.current);
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
