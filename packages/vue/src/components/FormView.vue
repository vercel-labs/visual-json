<script setup lang="ts">
import { shallowRef, computed, watch, provide } from "vue";
import { removeNode, type JsonSchemaProperty } from "@visual-json/core";
import { useStudio } from "../composables/use-studio";
import { useDragDrop } from "../composables/use-drag-drop";
import { getVisibleNodes, getDisplayKey } from "@visual-json/ui-shared";
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
const { dragState, handleDragStart, handleDragOver, handleDragEnd, handleDrop } =
  useDragDrop();

const containerRef = shallowRef<HTMLDivElement | null>(null);
const isFocused = shallowRef(false);
const formSelectedNodeId = shallowRef<string | null>(null);
const editingNodeId = shallowRef<string | null>(null);
const collapsedIds = shallowRef<Set<string>>(new Set());
let preEditTree = state.tree.value;

const displayNode = computed(() => {
  const selectedNode = state.selectedNodeId.value
    ? state.tree.value.nodesById.get(state.selectedNodeId.value)
    : null;
  return selectedNode ?? state.tree.value.root;
});

// Reset form state when display node changes
watch(
  () => displayNode.value.id,
  () => {
    formSelectedNodeId.value = null;
    editingNodeId.value = null;
    collapsedIds.value = new Set();
  },
);

const visibleNodes = computed(() =>
  getVisibleNodes(displayNode.value, (id) => !collapsedIds.value.has(id)),
);

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

function onSelect(nodeId: string) {
  formSelectedNodeId.value = nodeId;
  editingNodeId.value = null;
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

  const currentIndex = visibleNodes.value.findIndex(
    (n) => n.id === formSelectedNodeId.value,
  );

  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      const next = visibleNodes.value[currentIndex + 1];
      if (next) {
        formSelectedNodeId.value = next.id;
        scrollToNode(next.id);
      }
      break;
    }
    case "ArrowUp": {
      e.preventDefault();
      const prev = visibleNodes.value[currentIndex - 1];
      if (prev) {
        formSelectedNodeId.value = prev.id;
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
          formSelectedNodeId.value = node.children[0].id;
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
          formSelectedNodeId.value = parentInVisible.id;
          scrollToNode(parentInVisible.id);
        }
      }
      break;
    }
    case "Enter": {
      e.preventDefault();
      if (formSelectedNodeId.value) {
        preEditTree = state.tree.value;
        editingNodeId.value = formSelectedNodeId.value;
      }
      break;
    }
    case "Escape": {
      e.preventDefault();
      editingNodeId.value = null;
      break;
    }
    case "Delete":
    case "Backspace": {
      e.preventDefault();
      const toDelete =
        currentIndex >= 0 ? visibleNodes.value[currentIndex] : null;
      if (toDelete && toDelete.parentId) {
        const nextSelect =
          visibleNodes.value[currentIndex + 1] ??
          visibleNodes.value[currentIndex - 1];
        const newTree = removeNode(state.tree.value, toDelete.id);
        actions.setTree(newTree);
        if (nextSelect && nextSelect.id !== toDelete.id) {
          formSelectedNodeId.value = nextSelect.id;
        } else {
          formSelectedNodeId.value = null;
        }
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
  formSelectedNodeId,
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
