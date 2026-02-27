import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { TreeNode, NodeType } from "@visual-json/core";
import {
  removeNode,
  duplicateNode,
  changeType,
  toJson,
} from "@visual-json/core";
import { useStudio } from "./context";
import { ContextMenu, type ContextMenuEntry } from "./context-menu";
import { getDisplayKey, getVisibleNodes } from "@visual-json/ui-shared";
import { deleteSelectedNodes, computeSelectAllIds } from "./selection-utils";
import {
  useDragDrop,
  setMultiDragImage,
  type DragState,
} from "./use-drag-drop";

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  dragState: DragState;
  showValues: boolean;
  showCounts: boolean;
  isFocused: boolean;
  onSelectRange: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragOver: (nodeId: string, position: "before" | "after") => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
}

function TreeNodeRow({
  node,
  depth,
  dragState,
  showValues,
  showCounts,
  isFocused,
  onSelectRange,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onContextMenu,
}: TreeNodeRowProps) {
  const { state, actions } = useStudio();
  const isSelected = state.selectedNodeIds.has(node.id);
  const isExpanded = state.expandedNodeIds.has(node.id);
  const isContainer = node.type === "object" || node.type === "array";
  const [hovered, setHovered] = useState(false);
  const isRoot = node.parentId === null;
  const isSearchMatch = state.searchMatchNodeIds.has(node.id);
  const isActiveMatch =
    state.searchMatches.length > 0 &&
    state.searchMatches[state.searchMatchIndex]?.nodeId === node.id;

  const isDragTarget = dragState.dropTargetNodeId === node.id;
  const isDraggedNode = dragState.draggedNodeIds.has(node.id);

  function displayValue(): string {
    if (isContainer) {
      return node.type === "array"
        ? `[${node.children.length}]`
        : `{${node.children.length}}`;
    }
    if (node.value === null) return "null";
    if (typeof node.value === "string") return node.value;
    return String(node.value);
  }

  function handleDragOverEvent(e: React.DragEvent) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "before" : "after";
    onDragOver(node.id, position);
  }

  let borderTopColor = "transparent";
  let borderBottomColor = "transparent";
  if (isDragTarget && dragState.dropPosition === "before") {
    borderTopColor = "var(--vj-accent, #007acc)";
  } else if (isDragTarget && dragState.dropPosition === "after") {
    borderBottomColor = "var(--vj-accent, #007acc)";
  }

  return (
    <>
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={isContainer ? isExpanded : undefined}
        onClick={(e) => {
          if (e.shiftKey) {
            onSelectRange(node.id);
          } else if (e.metaKey || e.ctrlKey) {
            actions.toggleNodeSelection(node.id);
          } else {
            actions.selectAndDrillDown(node.id);
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={(e) => onContextMenu(e, node)}
        draggable={!isRoot}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          if (
            state.selectedNodeIds.size > 1 &&
            state.selectedNodeIds.has(node.id)
          ) {
            setMultiDragImage(e, state.selectedNodeIds.size);
          }
          onDragStart(node.id);
        }}
        onDragOver={handleDragOverEvent}
        onDragEnd={onDragEnd}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
        data-node-id={node.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "1px 8px",
          paddingLeft: 8 + depth * 16,
          cursor: "pointer",
          backgroundColor: isSelected
            ? isFocused
              ? "var(--vj-bg-selected, #2a5a1e)"
              : "var(--vj-bg-selected-muted, var(--vj-bg-hover, #2a2d2e))"
            : isActiveMatch
              ? "var(--vj-bg-match-active, #51502b)"
              : isSearchMatch
                ? "var(--vj-bg-match, #3a3520)"
                : hovered
                  ? "var(--vj-bg-hover, #2a2d2e)"
                  : "transparent",
          minHeight: 28,
          userSelect: "none",
          opacity: isDraggedNode ? 0.4 : 1,
          borderTop: `2px solid ${borderTopColor}`,
          borderBottom: `2px solid ${borderBottomColor}`,
          boxSizing: "border-box",
          color:
            isSelected && isFocused
              ? "var(--vj-text-selected, var(--vj-text, #cccccc))"
              : "var(--vj-text, #cccccc)",
        }}
      >
        {isContainer ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleExpand(node.id);
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 0,
              width: 16,
              fontSize: 9,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.15s",
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            &#9654;
          </button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}
        <span
          style={{
            color: "inherit",
            fontSize: 13,
            fontFamily: "var(--vj-font, monospace)",
            flexShrink: 0,
            fontWeight: isRoot ? 600 : 400,
          }}
        >
          {isRoot ? "/" : getDisplayKey(node, state.tree)}
        </span>
        {!isRoot && isContainer && showCounts && (
          <span
            style={{
              color: isSelected ? "inherit" : "var(--vj-text-muted, #888888)",
              fontSize: 13,
              fontFamily: "var(--vj-font, monospace)",
              whiteSpace: "nowrap",
              marginLeft: "auto",
            }}
          >
            {displayValue()}
          </span>
        )}
        {!isRoot && !isContainer && showValues && (
          <span
            style={{
              color:
                node.type === "string"
                  ? "var(--vj-string, #ce9178)"
                  : "var(--vj-number, #b5cea8)",
              fontSize: 13,
              fontFamily: "var(--vj-font, monospace)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginLeft: "auto",
            }}
          >
            {displayValue()}
          </span>
        )}
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            dragState={dragState}
            showValues={showValues}
            showCounts={showCounts}
            isFocused={isFocused}
            onSelectRange={onSelectRange}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            onContextMenu={onContextMenu}
          />
        ))}
    </>
  );
}

export interface TreeViewProps {
  className?: string;
  showValues?: boolean;
  showCounts?: boolean;
}

export function TreeView({
  className,
  showValues = true,
  showCounts = false,
}: TreeViewProps) {
  const { state, actions } = useStudio();
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleNodes = useMemo(
    () =>
      getVisibleNodes(state.tree.root, (id) => state.expandedNodeIds.has(id)),
    [state.tree.root, state.expandedNodeIds],
  );

  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  } = useDragDrop(visibleNodes, state.selectedNodeIds);

  const handleSelectRange = useCallback(
    (nodeId: string) => {
      actions.setVisibleNodesOverride(visibleNodes);
      actions.selectNodeRange(nodeId);
    },
    [visibleNodes, actions],
  );

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNode;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: TreeNode) => {
      e.preventDefault();
      if (!state.selectedNodeIds.has(node.id)) {
        actions.selectAndDrillDown(node.id);
      }
      setContextMenu({ x: e.clientX, y: e.clientY, node });
    },
    [actions, state.selectedNodeIds],
  );

  const buildContextMenuItems = useCallback(
    (node: TreeNode): ContextMenuEntry[] => {
      const items: ContextMenuEntry[] = [];
      const isContainer = node.type === "object" || node.type === "array";

      if (isContainer) {
        items.push({
          label: "Expand all children",
          action: () => {
            function collectIds(n: TreeNode): string[] {
              const ids: string[] = [n.id];
              for (const c of n.children) ids.push(...collectIds(c));
              return ids;
            }
            const allIds = collectIds(node);
            for (const id of allIds) actions.expandNode(id);
          },
        });
        items.push({
          label: "Collapse all children",
          action: () => {
            function collectIds(n: TreeNode): string[] {
              const ids: string[] = [];
              for (const c of n.children) {
                ids.push(c.id);
                ids.push(...collectIds(c));
              }
              return ids;
            }
            const childIds = collectIds(node);
            for (const id of childIds) actions.collapseNode(id);
          },
        });
        items.push({ separator: true });
      }

      items.push({
        label: "Copy path",
        action: () => navigator.clipboard.writeText(node.path).catch(() => {}),
      });
      items.push({
        label: "Copy value as JSON",
        action: () => {
          const val = toJson(node);
          const text =
            typeof val === "string" ? val : JSON.stringify(val, null, 2);
          navigator.clipboard.writeText(text).catch(() => {});
        },
      });

      if (node.parentId) {
        items.push({ separator: true });
        items.push({
          label: "Duplicate",
          action: () => {
            const newTree = duplicateNode(state.tree, node.id);
            actions.setTree(newTree);
          },
        });

        const typeSubmenu: ContextMenuEntry[] = (
          [
            "string",
            "number",
            "boolean",
            "null",
            "object",
            "array",
          ] as NodeType[]
        )
          .filter((t) => t !== node.type)
          .map((t) => ({
            label: `Change to ${t}`,
            action: () => {
              const newTree = changeType(state.tree, node.id, t);
              actions.setTree(newTree);
            },
          }));
        items.push({ separator: true });
        items.push(...typeSubmenu);

        items.push({ separator: true });
        items.push({
          label: "Delete",
          action: () => {
            const newTree = removeNode(state.tree, node.id);
            actions.setTree(newTree);
          },
        });
      }

      return items;
    },
    [state.tree, actions],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = visibleNodes.findIndex(
        (n) => n.id === state.focusedNodeId,
      );

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = visibleNodes[currentIndex + 1];
          if (next) {
            if (e.shiftKey) {
              handleSelectRange(next.id);
            } else {
              actions.selectNode(next.id);
            }
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = visibleNodes[currentIndex - 1];
          if (prev) {
            if (e.shiftKey) {
              handleSelectRange(prev.id);
            } else {
              actions.selectNode(prev.id);
            }
          }
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const node = currentIndex >= 0 ? visibleNodes[currentIndex] : null;
          if (node && (node.type === "object" || node.type === "array")) {
            if (!state.expandedNodeIds.has(node.id)) {
              actions.expandNode(node.id);
            } else if (node.children.length > 0) {
              actions.selectNode(node.children[0].id);
            }
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const current = currentIndex >= 0 ? visibleNodes[currentIndex] : null;
          if (!current) break;
          const isContainer =
            current.type === "object" || current.type === "array";
          if (isContainer && state.expandedNodeIds.has(current.id)) {
            actions.collapseNode(current.id);
          } else if (current.parentId) {
            actions.selectNode(current.parentId);
          }
          break;
        }
        case "a": {
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            const ids = computeSelectAllIds(
              state.tree,
              state.focusedNodeId,
              state.selectedNodeIds,
            );
            if (ids) {
              actions.setSelection(
                state.focusedNodeId,
                ids,
                state.focusedNodeId,
              );
            }
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          if (state.selectedNodeIds.size > 1 && state.focusedNodeId) {
            actions.selectNode(state.focusedNodeId);
          } else {
            actions.setSelection(null, new Set<string>(), null);
          }
          break;
        }
        case "Delete":
        case "Backspace": {
          e.preventDefault();
          const { newTree, nextFocusId } = deleteSelectedNodes(
            state.tree,
            state.selectedNodeIds,
            visibleNodes,
          );
          if (newTree === state.tree) break;
          actions.setTree(newTree);
          if (nextFocusId) {
            actions.selectNode(nextFocusId);
          } else {
            actions.setSelection(null, new Set<string>(), null);
          }
          break;
        }
      }
    },
    [
      visibleNodes,
      state.focusedNodeId,
      state.selectedNodeIds,
      state.expandedNodeIds,
      state.tree,
      actions,
      handleSelectRange,
    ],
  );

  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (state.focusedNodeId && containerRef.current) {
      const el = containerRef.current.querySelector(
        `[data-node-id="${state.focusedNodeId}"]`,
      );
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [state.focusedNodeId]);

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        role="tree"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          overflow: "auto",
          backgroundColor: "var(--vj-bg, #1e1e1e)",
          color: "var(--vj-text, #cccccc)",
          fontFamily: "var(--vj-font, monospace)",
          fontSize: 13,
          outline: "none",
          flex: 1,
        }}
      >
        <TreeNodeRow
          node={state.tree.root}
          depth={0}
          dragState={dragState}
          showValues={showValues}
          showCounts={showCounts}
          isFocused={isFocused}
          onSelectRange={handleSelectRange}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onContextMenu={handleContextMenu}
        />
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextMenuItems(contextMenu.node)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
