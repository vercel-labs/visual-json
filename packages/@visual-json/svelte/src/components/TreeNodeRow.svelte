<script lang="ts">
  import { useStudio } from "../use-studio.js";
  import { getDisplayKey, setMultiDragImage } from "@internal/ui";
  import type { DragState } from "@internal/ui";
  import type { TreeNode } from "@visual-json/core";
  import TreeNodeRow from "./TreeNodeRow.svelte";

  interface Props {
    node: TreeNode;
    depth: number;
    dragState: DragState;
    showValues: boolean;
    showCounts: boolean;
    isFocused: boolean;
    ondragstart?: (nodeId: string) => void;
    ondragover?: (nodeId: string, position: "before" | "after") => void;
    ondragend?: () => void;
    ondrop?: () => void;
    oncontextmenu?: (e: MouseEvent, node: TreeNode) => void;
    onselectrange?: (nodeId: string) => void;
  }

  let {
    node,
    depth,
    dragState,
    showValues,
    showCounts,
    isFocused,
    ondragstart,
    ondragover,
    ondragend,
    ondrop,
    oncontextmenu,
    onselectrange,
  }: Props = $props();

  const { state: studioState, actions } = useStudio();
  let hovered = $state(false);

  const isContainer = $derived(node.type === "object" || node.type === "array");
  const isRoot = $derived(node.parentId === null);

  function isSelected() {
    return studioState.selectedNodeIds.has(node.id);
  }
  function isExpanded() {
    return studioState.expandedNodeIds.has(node.id);
  }
  function isSearchMatch() {
    return studioState.searchMatchNodeIds.has(node.id);
  }
  function isActiveMatch() {
    return (
      studioState.searchMatches.length > 0 &&
      studioState.searchMatches[studioState.searchMatchIndex]?.nodeId ===
        node.id
    );
  }

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

  function handleDragOverEvent(e: DragEvent) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "before" : "after";
    ondragover?.(node.id, position);
  }

  function getBorderTopColor() {
    if (
      dragState.dropTargetNodeId === node.id &&
      dragState.dropPosition === "before"
    ) {
      return "var(--vj-accent, #007acc)";
    }
    return "transparent";
  }

  function getBorderBottomColor() {
    if (
      dragState.dropTargetNodeId === node.id &&
      dragState.dropPosition === "after"
    ) {
      return "var(--vj-accent, #007acc)";
    }
    return "transparent";
  }

  function getRowBg() {
    const sel = isSelected();
    const active = isActiveMatch();
    const match = isSearchMatch();
    if (sel) {
      return isFocused
        ? "var(--vj-bg-selected, #2a5a1e)"
        : "var(--vj-bg-selected-muted, var(--vj-bg-hover, #2a2d2e))";
    }
    if (active) return "var(--vj-bg-match-active, #51502b)";
    if (match) return "var(--vj-bg-match, #3a3520)";
    if (hovered) return "var(--vj-bg-hover, #2a2d2e)";
    return "transparent";
  }

  function handleClick(e: MouseEvent) {
    if (e.shiftKey) {
      onselectrange?.(node.id);
    } else if (e.metaKey || e.ctrlKey) {
      actions.toggleNodeSelection(node.id);
    } else {
      actions.selectAndDrillDown(node.id);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      actions.selectAndDrillDown(node.id);
    }
  }

  function handleDragStart(e: DragEvent) {
    e.dataTransfer!.effectAllowed = "move";
    if (
      studioState.selectedNodeIds.size > 1 &&
      studioState.selectedNodeIds.has(node.id)
    ) {
      setMultiDragImage(e.dataTransfer!, studioState.selectedNodeIds.size);
    }
    ondragstart?.(node.id);
  }
</script>

<div
  role="treeitem"
  aria-selected={isSelected()}
  aria-expanded={isContainer ? isExpanded() : undefined}
  tabindex="-1"
  draggable={!isRoot}
  data-node-id={node.id}
  style="
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 1px 8px;
		padding-left: {8 + depth * 16}px;
		cursor: pointer;
		background-color: {getRowBg()};
		min-height: 28px;
		user-select: none;
		opacity: {dragState.draggedNodeIds.has(node.id) ? 0.4 : 1};
		border-top: 2px solid {getBorderTopColor()};
		border-bottom: 2px solid {getBorderBottomColor()};
		box-sizing: border-box;
		color: {isSelected() && isFocused
    ? 'var(--vj-text-selected, var(--vj-text, #cccccc))'
    : 'var(--vj-text, #cccccc)'};
	"
  onclick={handleClick}
  onkeydown={handleKeyDown}
  onmouseenter={() => (hovered = true)}
  onmouseleave={() => (hovered = false)}
  oncontextmenu={(e) => oncontextmenu?.(e, node)}
  ondragstart={handleDragStart}
  ondragover={handleDragOverEvent}
  ondragend={() => ondragend?.()}
  ondrop={(e) => {
    e.preventDefault();
    ondrop?.();
  }}
>
  {#if isContainer}
    <button
      aria-label={isExpanded() ? "Collapse" : "Expand"}
      style="
				background: none;
				border: none;
				color: inherit;
				cursor: pointer;
				padding: 0;
				width: 16px;
				font-size: 9px;
				flex-shrink: 0;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				transition: transform 0.15s;
				transform: {isExpanded() ? 'rotate(90deg)' : 'rotate(0deg)'};
			"
      onclick={(e) => {
        e.stopPropagation();
        actions.toggleExpand(node.id);
      }}
    >
      &#9654;
    </button>
  {:else}
    <span style="width: 16px; flex-shrink: 0;"></span>
  {/if}

  <span
    style="
			color: inherit;
			font-size: 13px;
			font-family: var(--vj-font, monospace);
			flex-shrink: 0;
			font-weight: {isRoot ? 600 : 400};
		"
  >
    {isRoot ? "/" : getDisplayKey(node, studioState.tree)}
  </span>

  {#if !isRoot && isContainer && showCounts}
    <span
      style="
				color: {isSelected() ? 'inherit' : 'var(--vj-text-muted, #888888)'};
				font-size: 13px;
				font-family: var(--vj-font, monospace);
				white-space: nowrap;
				margin-left: auto;
			"
    >
      {displayValue()}
    </span>
  {/if}

  {#if !isRoot && !isContainer && showValues}
    <span
      style="
				color: {node.type === 'string'
        ? 'var(--vj-string, #ce9178)'
        : 'var(--vj-number, #b5cea8)'};
				font-size: 13px;
				font-family: var(--vj-font, monospace);
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				margin-left: auto;
			"
    >
      {displayValue()}
    </span>
  {/if}
</div>

{#if isExpanded()}
  {#each node.children as child (child.id)}
    <TreeNodeRow
      node={child}
      depth={depth + 1}
      {dragState}
      {showValues}
      {showCounts}
      {isFocused}
      ondragstart={(id) => ondragstart?.(id)}
      ondragover={(id, pos) => ondragover?.(id, pos)}
      ondragend={() => ondragend?.()}
      ondrop={() => ondrop?.()}
      oncontextmenu={(e, n) => oncontextmenu?.(e, n)}
      onselectrange={(id) => onselectrange?.(id)}
    />
  {/each}
{/if}
