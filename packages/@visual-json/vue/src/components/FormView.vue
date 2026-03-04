<script setup lang="ts">
import { shallowRef, computed, watch, provide, onMounted, onUnmounted } from "vue";
import type { JsonSchemaProperty } from "@visual-json/core";
import { useStudio } from "../composables/use-studio";
import { useDragDrop } from "../composables/use-drag-drop";
import { getVisibleNodes, getDisplayKey } from "@internal/ui";
import { deleteSelectedNodes, computeSelectAllIds } from "../selection-utils";
import { FORM_VIEW_KEY } from "./form-view-context";
import Breadcrumbs from "./Breadcrumbs.vue";
import FormField from "./FormField.vue";

const props = withDefaults(
  defineProps<{
    class?: string;
    showDescriptions?: boolean;
    showCounts?: boolean;
  }>(),
  { showDescriptions: false, showCounts: false },
);

const { state, actions } = useStudio();

const containerRef = shallowRef<HTMLDivElement | null>(null);
const isFocused = shallowRef(false);
const editingNodeId = shallowRef<string | null>(null);
const collapsedIds = shallowRef<Set<string>>(new Set());
let preEditTree = state.tree.value;

const displayNode = computed(() => {
  const drillDownNode = state.drillDownNodeId.value
    ? state.tree.value.nodesById.get(state.drillDownNodeId.value)
    : null;
  return drillDownNode ?? state.tree.value.root;
});

// Reset form state when display node changes
watch(
  () => displayNode.value.id,
  () => {
    editingNodeId.value = null;
    collapsedIds.value = new Set();
  },
);

const visibleNodes = computed(() =>
  getVisibleNodes(displayNode.value, (id) => !collapsedIds.value.has(id)),
);

const { dragState, handleDragStart, handleDragOver, handleDragEnd, handleDrop } =
  useDragDrop(visibleNodes, state.selectedNodeIds);

// Override visible nodes for range selection in form view
onMounted(() => {
  actions.setVisibleNodesOverride(visibleNodes.value);
});
onUnmounted(() => {
  actions.setVisibleNodesOverride(null);
});
watch(visibleNodes, (nodes) => {
  actions.setVisibleNodesOverride(nodes);
});

const metrics = computed(() => {
  let maxKey = 1;
  let maxD = 0;
  const baseSegments =
    displayNode.value.path === "/"
      ? 0
      : displayNode.value.path.split("/").filter(Boolean).length;
  for (const node of visibleNodes.value) {
    const keyText =
      node.parentId === null ? "/" : getDisplayKey(node, state.tree.value);
    if (keyText.length > maxKey) maxKey = keyText.length;
    const segments =
      node.path === "/" ? 0 : node.path.split("/").filter(Boolean).length;
    const depth = segments - baseSegments;
    if (depth > maxD) maxD = depth;
  }
  return { maxKeyLength: maxKey, maxDepth: maxD };
});

const maxKeyLength = computed(() => metrics.value.maxKeyLength);
const maxDepth = computed(() => metrics.value.maxDepth);

const schema = computed(() => state.schema.value);
const rootSchema = computed<JsonSchemaProperty | undefined>(
  () => state.schema.value ?? undefined,
);

function onSelect(nodeId: string, e: MouseEvent) {
  editingNodeId.value = null;
  if (e.shiftKey) {
    actions.setVisibleNodesOverride(visibleNodes.value);
    actions.selectNodeRange(nodeId);
  } else if (e.metaKey || e.ctrlKey) {
    actions.toggleNodeSelection(nodeId);
  } else {
    actions.selectNode(nodeId);
  }
}

function onToggleCollapse(nodeId: string) {
  const next = new Set(collapsedIds.value);
  if (next.has(nodeId)) next.delete(nodeId);
  else next.add(nodeId);
  collapsedIds.value = next;
}

function onStartEditing(nodeId: string) {
  preEditTree = state.tree.value;
  editingNodeId.value = nodeId;
}

function scrollToNode(nodeId: string) {
  requestAnimationFrame(() => {
    const el = containerRef.value?.querySelector(
      `[data-form-node-id="${nodeId}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  });
}

function handleKeyDown(e: KeyboardEvent) {
  if (editingNodeId.value) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      actions.setTree(preEditTree);
      editingNodeId.value = null;
      containerRef.value?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      editingNodeId.value = null;
      containerRef.value?.focus();
    }
    return;
  }

  let currentIndex = visibleNodes.value.findIndex(
    (n) => n.id === state.focusedNodeId.value,
  );
  if (currentIndex === -1 && visibleNodes.value.length > 0) {
    currentIndex = 0;
  }

  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      const next = visibleNodes.value[currentIndex + 1];
      if (next) {
        if (e.shiftKey) {
          actions.setVisibleNodesOverride(visibleNodes.value);
          actions.selectNodeRange(next.id);
        } else {
          actions.selectNode(next.id);
        }
        scrollToNode(next.id);
      }
      break;
    }
    case "ArrowUp": {
      e.preventDefault();
      const prev = visibleNodes.value[currentIndex - 1];
      if (prev) {
        if (e.shiftKey) {
          actions.setVisibleNodesOverride(visibleNodes.value);
          actions.selectNodeRange(prev.id);
        } else {
          actions.selectNode(prev.id);
        }
        scrollToNode(prev.id);
      }
      break;
    }
    case "ArrowRight": {
      e.preventDefault();
      const node =
        currentIndex >= 0 ? visibleNodes.value[currentIndex] : null;
      if (node && (node.type === "object" || node.type === "array")) {
        if (collapsedIds.value.has(node.id)) {
          const next = new Set(collapsedIds.value);
          next.delete(node.id);
          collapsedIds.value = next;
        } else if (node.children.length > 0) {
          actions.selectNode(node.children[0].id);
          scrollToNode(node.children[0].id);
        }
      }
      break;
    }
    case "ArrowLeft": {
      e.preventDefault();
      const current =
        currentIndex >= 0 ? visibleNodes.value[currentIndex] : null;
      if (!current) break;
      const isContainer =
        current.type === "object" || current.type === "array";
      if (isContainer && !collapsedIds.value.has(current.id)) {
        const next = new Set(collapsedIds.value);
        next.add(current.id);
        collapsedIds.value = next;
      } else if (current.parentId) {
        const parentInVisible = visibleNodes.value.find(
          (n) => n.id === current.parentId,
        );
        if (parentInVisible) {
          actions.selectNode(parentInVisible.id);
          scrollToNode(parentInVisible.id);
        }
      }
      break;
    }
    case "Enter": {
      e.preventDefault();
      if (state.focusedNodeId.value) {
        preEditTree = state.tree.value;
        actions.selectNode(state.focusedNodeId.value);
        editingNodeId.value = state.focusedNodeId.value;
      }
      break;
    }
    case "a": {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const ids = computeSelectAllIds(
          state.tree.value,
          state.focusedNodeId.value,
          state.selectedNodeIds.value,
        );
        if (ids) {
          actions.setSelection(
            state.focusedNodeId.value,
            ids,
            state.focusedNodeId.value,
          );
        }
      }
      break;
    }
    case "Escape": {
      e.preventDefault();
      if (state.selectedNodeIds.value.size > 1 && state.focusedNodeId.value) {
        actions.selectNode(state.focusedNodeId.value);
      } else {
        actions.setSelection(null, new Set<string>(), null);
      }
      break;
    }
    case "Delete":
    case "Backspace": {
      e.preventDefault();
      const { newTree, nextFocusId } = deleteSelectedNodes(
        state.tree.value,
        state.selectedNodeIds.value,
        visibleNodes.value,
      );
      if (newTree === state.tree.value) break;
      actions.setTree(newTree);
      if (nextFocusId) {
        actions.selectNode(nextFocusId);
      } else {
        actions.setSelection(null, new Set<string>(), null);
      }
      break;
    }
  }
}

provide(FORM_VIEW_KEY, {
  schema,
  rootSchema,
  showDescriptions: props.showDescriptions,
  showCounts: props.showCounts,
  editingNodeId,
  collapsedIds,
  maxKeyLength,
  maxDepth,
  isFocused,
  dragState,
  onSelect,
  onToggleCollapse,
  onStartEditing,
  onDragStart: handleDragStart,
  onDragOver: handleDragOver,
  onDragEnd: handleDragEnd,
  onDrop: handleDrop,
});
</script>

<template>
  <div
    :style="{
      backgroundColor: 'var(--vj-bg, #1e1e1e)',
      color: 'var(--vj-text, #cccccc)',
      height: '100%',
      fontFamily: 'var(--vj-font, monospace)',
      display: 'flex',
      flexDirection: 'column',
    }"
  >
    <div
      :style="{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderBottom: '1px solid var(--vj-border, #333333)',
        backgroundColor: 'var(--vj-bg, #1e1e1e)',
        flexShrink: 0,
      }"
    >
      <Breadcrumbs />
    </div>
    <div
      ref="containerRef"
      data-form-container
      tabindex="0"
      :style="{
        flex: 1,
        overflow: 'auto',
        outline: 'none',
      }"
      @keydown="handleKeyDown"
      @focus="() => (isFocused = true)"
      @blur="
        (e) => {
          if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
            isFocused = false;
          }
        }
      "
    >
      <FormField :node="displayNode" :depth="0" />
    </div>
  </div>
</template>
