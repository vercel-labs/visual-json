<script setup lang="ts">
import { shallowRef } from "vue";
import type { TreeNode } from "@visual-json/core";
import { useStudio } from "../composables/use-studio";
import { getDisplayKey, setMultiDragImage } from "@internal/ui";
import type { DragState } from "../composables/use-drag-drop";

// Self-import for recursive usage
import TreeNodeRow from "./TreeNodeRow.vue";

const props = defineProps<{
  node: TreeNode;
  depth: number;
  dragState: DragState;
  showValues: boolean;
  showCounts: boolean;
  isFocused: boolean;
}>();

const emit = defineEmits<{
  dragStart: [nodeId: string];
  dragOver: [nodeId: string, position: "before" | "after"];
  dragEnd: [];
  drop: [];
  contextMenu: [e: MouseEvent, node: TreeNode];
  selectRange: [nodeId: string];
}>();

const { state, actions } = useStudio();
const hovered = shallowRef(false);

function isSelected() {
  return state.selectedNodeIds.value.has(props.node.id);
}
function isExpanded() {
  return state.expandedNodeIds.value.has(props.node.id);
}

const isContainer =
  props.node.type === "object" || props.node.type === "array";
const isRoot = props.node.parentId === null;

function isSearchMatch() {
  return state.searchMatchNodeIds.value.has(props.node.id);
}
function isActiveMatch() {
  return (
    state.searchMatches.value.length > 0 &&
    state.searchMatches.value[state.searchMatchIndex.value]?.nodeId ===
      props.node.id
  );
}

function displayValue(): string {
  if (isContainer) {
    return props.node.type === "array"
      ? `[${props.node.children.length}]`
      : `{${props.node.children.length}}`;
  }
  if (props.node.value === null) return "null";
  if (typeof props.node.value === "string") return props.node.value;
  return String(props.node.value);
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const position = e.clientY < midY ? "before" : "after";
  emit("dragOver", props.node.id, position);
}

function getBorderTopColor() {
  if (
    props.dragState.dropTargetNodeId === props.node.id &&
    props.dragState.dropPosition === "before"
  ) {
    return "var(--vj-accent, #007acc)";
  }
  return "transparent";
}

function getBorderBottomColor() {
  if (
    props.dragState.dropTargetNodeId === props.node.id &&
    props.dragState.dropPosition === "after"
  ) {
    return "var(--vj-accent, #007acc)";
  }
  return "transparent";
}

function getRowBg() {
  const sel = isSelected();
  const active = isActiveMatch();
  const match = isSearchMatch();
  const hov = hovered.value;
  if (sel) {
    return props.isFocused
      ? "var(--vj-bg-selected, #2a5a1e)"
      : "var(--vj-bg-selected-muted, var(--vj-bg-hover, #2a2d2e))";
  }
  if (active) return "var(--vj-bg-match-active, #51502b)";
  if (match) return "var(--vj-bg-match, #3a3520)";
  if (hov) return "var(--vj-bg-hover, #2a2d2e)";
  return "transparent";
}

function handleClick(e: MouseEvent) {
  if (e.shiftKey) {
    emit("selectRange", props.node.id);
  } else if (e.metaKey || e.ctrlKey) {
    actions.toggleNodeSelection(props.node.id);
  } else {
    actions.selectAndDrillDown(props.node.id);
  }
}

function handleDragStart(e: DragEvent) {
  e.dataTransfer!.effectAllowed = "move";
  if (
    state.selectedNodeIds.value.size > 1 &&
    state.selectedNodeIds.value.has(props.node.id)
  ) {
    setMultiDragImage(e.dataTransfer!, state.selectedNodeIds.value.size);
  }
  emit("dragStart", props.node.id);
}
</script>

<template>
  <div
    role="treeitem"
    :aria-selected="isSelected()"
    :aria-expanded="isContainer ? isExpanded() : undefined"
    :draggable="!isRoot"
    :data-node-id="node.id"
    :style="{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '1px 8px',
      paddingLeft: 8 + depth * 16 + 'px',
      cursor: 'pointer',
      backgroundColor: getRowBg(),
      minHeight: '28px',
      userSelect: 'none',
      opacity: dragState.draggedNodeIds.has(node.id) ? 0.4 : 1,
      borderTop: `2px solid ${getBorderTopColor()}`,
      borderBottom: `2px solid ${getBorderBottomColor()}`,
      boxSizing: 'border-box',
      color:
        isSelected() && isFocused
          ? 'var(--vj-text-selected, var(--vj-text, #cccccc))'
          : 'var(--vj-text, #cccccc)',
    }"
    @click="handleClick"
    @mouseenter="() => (hovered = true)"
    @mouseleave="() => (hovered = false)"
    @contextmenu="(e) => emit('contextMenu', e, node)"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @dragend="() => emit('dragEnd')"
    @drop.prevent="() => emit('drop')"
  >
    <button
      v-if="isContainer"
      :aria-label="isExpanded() ? 'Collapse' : 'Expand'"
      :style="{
        background: 'none',
        border: 'none',
        color: 'inherit',
        cursor: 'pointer',
        padding: 0,
        width: '16px',
        fontSize: '9px',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.15s',
        transform: isExpanded() ? 'rotate(90deg)' : 'rotate(0deg)',
      }"
      @click.stop="() => actions.toggleExpand(node.id)"
    >
      &#9654;
    </button>
    <span v-else :style="{ width: '16px', flexShrink: 0 }" />

    <span
      :style="{
        color: 'inherit',
        fontSize: '13px',
        fontFamily: 'var(--vj-font, monospace)',
        flexShrink: 0,
        fontWeight: isRoot ? 600 : 400,
      }"
    >
      {{ isRoot ? "/" : getDisplayKey(node, state.tree.value) }}
    </span>

    <span
      v-if="!isRoot && isContainer && showCounts"
      :style="{
        color: isSelected() ? 'inherit' : 'var(--vj-text-muted, #888888)',
        fontSize: '13px',
        fontFamily: 'var(--vj-font, monospace)',
        whiteSpace: 'nowrap',
        marginLeft: 'auto',
      }"
    >
      {{ displayValue() }}
    </span>

    <span
      v-if="!isRoot && !isContainer && showValues"
      :style="{
        color:
          node.type === 'string'
            ? 'var(--vj-string, #ce9178)'
            : 'var(--vj-number, #b5cea8)',
        fontSize: '13px',
        fontFamily: 'var(--vj-font, monospace)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginLeft: 'auto',
      }"
    >
      {{ displayValue() }}
    </span>
  </div>

  <template v-if="isExpanded()">
    <TreeNodeRow
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
      :drag-state="dragState"
      :show-values="showValues"
      :show-counts="showCounts"
      :is-focused="isFocused"
      @drag-start="(id) => emit('dragStart', id)"
      @drag-over="(id, pos) => emit('dragOver', id, pos)"
      @drag-end="() => emit('dragEnd')"
      @drop="() => emit('drop')"
      @context-menu="(e, n) => emit('contextMenu', e, n)"
      @select-range="(id) => emit('selectRange', id)"
    />
  </template>
</template>
