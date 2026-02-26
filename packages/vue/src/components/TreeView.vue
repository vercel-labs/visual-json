<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { TreeNode } from "@visual-json/core";
import {
  removeNode,
  duplicateNode,
  changeType,
  toJson,
  type NodeType,
} from "@visual-json/core";
import { useStudio } from "../composables/use-studio";
import { useDragDrop } from "../composables/use-drag-drop";
import { getVisibleNodes } from "../utils/get-visible-nodes";
import TreeNodeRow from "./TreeNodeRow.vue";
import ContextMenu, { type ContextMenuEntry } from "./ContextMenu.vue";

const props = withDefaults(
  defineProps<{
    class?: string;
    showValues?: boolean;
    showCounts?: boolean;
  }>(),
  { showValues: true, showCounts: false },
);

const { state, actions } = useStudio();
const containerRef = ref<HTMLDivElement | null>(null);
const { dragState, handleDragStart, handleDragOver, handleDragEnd, handleDrop } =
  useDragDrop();

const contextMenu = ref<{ x: number; y: number; node: TreeNode } | null>(null);
const isFocused = ref(false);

const visibleNodes = computed(() =>
  getVisibleNodes(state.tree.value.root, (id) =>
    state.expandedNodeIds.value.has(id),
  ),
);

watch(
  () => state.selectedNodeId.value,
  (nodeId) => {
    if (nodeId && containerRef.value) {
      const el = containerRef.value.querySelector(`[data-node-id="${nodeId}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  },
);

function handleContextMenu(e: MouseEvent, node: TreeNode) {
  e.preventDefault();
  actions.selectNode(node.id);
  contextMenu.value = { x: e.clientX, y: e.clientY, node };
}

function buildContextMenuItems(node: TreeNode): ContextMenuEntry[] {
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
        const newTree = duplicateNode(state.tree.value, node.id);
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
          const newTree = changeType(state.tree.value, node.id, t);
          actions.setTree(newTree);
        },
      }));
    items.push({ separator: true });
    items.push(...typeSubmenu);

    items.push({ separator: true });
    items.push({
      label: "Delete",
      action: () => {
        const newTree = removeNode(state.tree.value, node.id);
        actions.setTree(newTree);
      },
    });
  }

  return items;
}

function handleKeyDown(e: KeyboardEvent) {
  const currentIndex = visibleNodes.value.findIndex(
    (n) => n.id === state.selectedNodeId.value,
  );

  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      const next = visibleNodes.value[currentIndex + 1];
      if (next) actions.selectNode(next.id);
      break;
    }
    case "ArrowUp": {
      e.preventDefault();
      const prev = visibleNodes.value[currentIndex - 1];
      if (prev) actions.selectNode(prev.id);
      break;
    }
    case "ArrowRight": {
      e.preventDefault();
      const node = currentIndex >= 0 ? visibleNodes.value[currentIndex] : null;
      if (node && (node.type === "object" || node.type === "array")) {
        if (!state.expandedNodeIds.value.has(node.id)) {
          actions.expandNode(node.id);
        } else if (node.children.length > 0) {
          actions.selectNode(node.children[0].id);
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
      if (isContainer && state.expandedNodeIds.value.has(current.id)) {
        actions.collapseNode(current.id);
      } else if (current.parentId) {
        actions.selectNode(current.parentId);
      }
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
          actions.selectNode(nextSelect.id);
        }
      }
      break;
    }
  }
}
</script>

<template>
  <div
    ref="containerRef"
    role="tree"
    tabindex="0"
    :style="{
      overflow: 'auto',
      backgroundColor: 'var(--vj-bg, #1e1e1e)',
      color: 'var(--vj-text, #cccccc)',
      fontFamily: 'var(--vj-font, monospace)',
      fontSize: '13px',
      outline: 'none',
      flex: 1,
    }"
    @keydown="handleKeyDown"
    @focus="() => (isFocused = true)"
    @blur="() => (isFocused = false)"
  >
    <TreeNodeRow
      :node="state.tree.value.root"
      :depth="0"
      :drag-state="dragState"
      :show-values="props.showValues ?? true"
      :show-counts="props.showCounts ?? false"
      :is-focused="isFocused"
      @drag-start="handleDragStart"
      @drag-over="handleDragOver"
      @drag-end="handleDragEnd"
      @drop="handleDrop"
      @context-menu="handleContextMenu"
    />
  </div>
  <ContextMenu
    v-if="contextMenu"
    :x="contextMenu.x"
    :y="contextMenu.y"
    :items="buildContextMenuItems(contextMenu.node)"
    @close="() => (contextMenu = null)"
  />
</template>
