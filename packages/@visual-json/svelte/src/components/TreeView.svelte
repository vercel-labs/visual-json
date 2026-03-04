<script lang="ts">
  import { useStudio } from "../use-studio.js";
  import { useDragDrop } from "../use-drag-drop.svelte.js";
  import { getVisibleNodes } from "@internal/ui";
  import {
    duplicateNode,
    changeType,
    toJson,
    type NodeType,
    type TreeNode,
  } from "@visual-json/core";
  import {
    deleteSelectedNodes,
    computeSelectAllIds,
  } from "../selection-utils.js";
  import TreeNodeRow from "./TreeNodeRow.svelte";
  import ContextMenu, { type ContextMenuEntry } from "./ContextMenu.svelte";

  interface Props {
    class?: string;
    showValues?: boolean;
    showCounts?: boolean;
  }

  let {
    class: className,
    showValues = true,
    showCounts = false,
  }: Props = $props();

  const { state: studioState, actions } = useStudio();
  let containerRef = $state<HTMLDivElement | null>(null);
  let isFocused = $state(false);
  let contextMenu = $state<{ x: number; y: number; node: TreeNode } | null>(
    null,
  );

  const visibleNodes = $derived(
    getVisibleNodes(studioState.tree.root, (id) =>
      studioState.expandedNodeIds.has(id),
    ),
  );

  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  } = useDragDrop(
    () => visibleNodes,
    () => studioState.selectedNodeIds,
  );

  // Scroll focused node into view
  $effect(() => {
    const nodeId = studioState.focusedNodeId;
    if (nodeId && containerRef) {
      const el = containerRef.querySelector(`[data-node-id="${nodeId}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  });

  function handleSelectRange(nodeId: string) {
    actions.setVisibleNodesOverride(visibleNodes);
    actions.selectNodeRange(nodeId);
  }

  function handleContextMenu(e: MouseEvent, node: TreeNode) {
    e.preventDefault();
    if (!studioState.selectedNodeIds.has(node.id)) {
      actions.selectAndDrillDown(node.id);
    }
    contextMenu = { x: e.clientX, y: e.clientY, node };
  }

  async function writeClipboardText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to write to clipboard", error);
    }
  }

  function buildContextMenuItems(node: TreeNode): ContextMenuEntry[] {
    const items: ContextMenuEntry[] = [];
    const isNodeContainer = node.type === "object" || node.type === "array";

    if (isNodeContainer) {
      items.push({
        label: "Expand all children",
        action: () => {
          function collectIds(n: TreeNode): string[] {
            const ids: string[] = [n.id];
            for (const c of n.children) ids.push(...collectIds(c));
            return ids;
          }
          for (const id of collectIds(node)) actions.expandNode(id);
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
          for (const id of collectIds(node)) actions.collapseNode(id);
        },
      });
      items.push({ separator: true });
    }

    items.push({
      label: "Copy path",
      action: () => {
        void writeClipboardText(node.path);
      },
    });
    items.push({
      label: "Copy value as JSON",
      action: () => {
        const val = toJson(node);
        const text =
          typeof val === "string" ? val : JSON.stringify(val, null, 2);
        void writeClipboardText(text);
      },
    });

    if (node.parentId) {
      items.push({ separator: true });
      items.push({
        label: "Duplicate",
        action: () => {
          const newTree = duplicateNode(studioState.tree, node.id);
          actions.setTree(newTree);
        },
      });

      const typeSubmenu: ContextMenuEntry[] = (
        ["string", "number", "boolean", "null", "object", "array"] as NodeType[]
      )
        .filter((t) => t !== node.type)
        .map((t) => ({
          label: `Change to ${t}`,
          action: () => {
            const newTree = changeType(studioState.tree, node.id, t);
            actions.setTree(newTree);
          },
        }));
      items.push({ separator: true });
      items.push(...typeSubmenu);

      items.push({ separator: true });
      items.push({
        label: "Delete",
        action: () => {
          const { newTree, nextFocusId } = deleteSelectedNodes(
            studioState.tree,
            studioState.selectedNodeIds,
            visibleNodes,
          );
          if (newTree !== studioState.tree) {
            actions.setTree(newTree);
            if (nextFocusId) {
              actions.selectNode(nextFocusId);
            } else {
              actions.setSelection(null, new Set(), null);
            }
          }
        },
      });
    }

    return items;
  }

  function handleKeyDown(e: KeyboardEvent) {
    const currentIndex = visibleNodes.findIndex(
      (n) => n.id === studioState.focusedNodeId,
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
          if (!studioState.expandedNodeIds.has(node.id)) {
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
        const isNodeContainer =
          current.type === "object" || current.type === "array";
        if (isNodeContainer && studioState.expandedNodeIds.has(current.id)) {
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
            studioState.tree,
            studioState.focusedNodeId,
            studioState.selectedNodeIds,
          );
          if (ids) {
            actions.setSelection(
              studioState.focusedNodeId,
              ids,
              studioState.focusedNodeId,
            );
          }
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        if (studioState.selectedNodeIds.size > 1 && studioState.focusedNodeId) {
          actions.selectNode(studioState.focusedNodeId);
        } else {
          actions.setSelection(null, new Set(), null);
        }
        break;
      }
      case "Delete":
      case "Backspace": {
        e.preventDefault();
        const { newTree, nextFocusId } = deleteSelectedNodes(
          studioState.tree,
          studioState.selectedNodeIds,
          visibleNodes,
        );
        if (newTree === studioState.tree) break;
        actions.setTree(newTree);
        if (nextFocusId) {
          actions.selectNode(nextFocusId);
        } else {
          actions.setSelection(null, new Set(), null);
        }
        break;
      }
    }
  }
</script>

<div
  bind:this={containerRef}
  class={className}
  role="tree"
  tabindex="0"
  style="
		overflow: auto;
		background-color: var(--vj-bg, #1e1e1e);
		color: var(--vj-text, #cccccc);
		font-family: var(--vj-font, monospace);
		font-size: 13px;
		outline: none;
		flex: 1;
	"
  onkeydown={handleKeyDown}
  onfocus={() => (isFocused = true)}
  onblur={() => (isFocused = false)}
>
  <TreeNodeRow
    node={studioState.tree.root}
    depth={0}
    {dragState}
    {showValues}
    {showCounts}
    {isFocused}
    ondragstart={handleDragStart}
    ondragover={handleDragOver}
    ondragend={handleDragEnd}
    ondrop={handleDrop}
    oncontextmenu={handleContextMenu}
    onselectrange={handleSelectRange}
  />
</div>

{#if contextMenu}
  <ContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    items={buildContextMenuItems(contextMenu.node)}
    onclose={() => (contextMenu = null)}
  />
{/if}
