<script setup lang="ts">
import { shallowRef, computed, watch } from "vue";
import type { TreeNode } from "@visual-json/core";
import {
  duplicateNode,
  changeType,
  toJson,
  type NodeType,
} from "@visual-json/core";
import { useStudio } from "../composables/use-studio";
import { useDragDrop } from "../composables/use-drag-drop";
import { getVisibleNodes } from "@visual-json/ui-shared";
import { deleteSelectedNodes, computeSelectAllIds } from "../selection-utils";
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
const containerRef = shallowRef<HTMLDivElement | null>(null);

const visibleNodes = computed(() =>
  getVisibleNodes(state.tree.value.root, (id) =>
    state.expandedNodeIds.value.has(id),
  ),
);

const { dragState, handleDragStart, handleDragOver, handleDragEnd, handleDrop } =
  useDragDrop(visibleNodes, state.selectedNodeIds);

const contextMenu = shallowRef<{ x: number; y: number; node: TreeNode } | null>(null);
const isFocused = shallowRef(false);

function handleSelectRange(nodeId: string) {
  actions.setVisibleNodesOverride(visibleNodes.value);
  actions.selectNodeRange(nodeId);
}

watch(
  () => state.focusedNodeId.value,
  (nodeId) => {
    if (nodeId && containerRef.value) {
      const el = containerRef.value.querySelector(`[data-node-id="${nodeId}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  },
);

function handleContextMenu(e: MouseEvent, node: TreeNode) {
  e.preventDefault();
  if (!state.selectedNodeIds.value.has(node.id)) {
    actions.selectAndDrillDown(node.id);
  }
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
        const { newTree, nextFocusId } = deleteSelectedNodes(
          state.tree.value,
          state.selectedNodeIds.value,
          visibleNodes.value,
        );
        if (newTree !== state.tree.value) {
          actions.setTree(newTree);
          if (nextFocusId) {
            actions.selectNode(nextFocusId);
          } else {
            actions.setSelection(null, new Set<string>(), null);
          }
        }
      },
    });
  }

  return items;
}

function handleKeyDown(e: KeyboardEvent) {
  const currentIndex = visibleNodes.value.findIndex(
    (n) => n.id === state.focusedNodeId.value,
  );

  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      const next = visibleNodes.value[currentIndex + 1];
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
      const prev = visibleNodes.value[currentIndex - 1];
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
      @select-range="handleSelectRange"
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
