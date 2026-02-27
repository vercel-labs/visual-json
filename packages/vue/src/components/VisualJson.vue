<script setup lang="ts">
import { shallowRef, computed, watch, onMounted, onUnmounted, provide } from "vue";
import {
  fromJson,
  toJson,
  History,
  searchNodes,
  getAncestorIds,
  type JsonValue,
  type JsonSchema,
  type TreeState,
  type TreeNode,
  type SearchMatch,
} from "@visual-json/core";
import { collectAllIds, getVisibleNodes } from "@visual-json/ui-shared";
import { STUDIO_KEY } from "../provide-inject";
import type { StudioState, StudioActions } from "../provide-inject";
import { computeRangeIds } from "../selection-utils";

const props = withDefaults(
  defineProps<{
    value: JsonValue;
    schema?: JsonSchema | null;
  }>(),
  { schema: null },
);

const emit = defineEmits<{
  change: [value: JsonValue];
}>();

const tree = shallowRef<TreeState>(fromJson(props.value));
const focusedNodeId = shallowRef<string | null>(null);
const selectedNodeIds = shallowRef<Set<string>>(new Set<string>());
const anchorNodeId = shallowRef<string | null>(null);
const drillDownNodeId = shallowRef<string | null>(null);
const expandedNodeIds = shallowRef<Set<string>>(new Set([tree.value.root.id]));

const visibleNodes = computed(() =>
  getVisibleNodes(tree.value.root, (id) => expandedNodeIds.value.has(id)),
);

let visibleNodesOverride: TreeNode[] | null = null;

let history = new History();
const historyVersion = shallowRef(0);
const canUndo = computed(() => {
  historyVersion.value;
  return history.canUndo;
});
const canRedo = computed(() => {
  historyVersion.value;
  return history.canRedo;
});

const searchQuery = shallowRef("");
const searchMatches = shallowRef<SearchMatch[]>([]);
const searchMatchIndex = shallowRef(0);
const searchMatchNodeIds = computed(
  () => new Set(searchMatches.value.map((m) => m.nodeId)),
);

let isInternalChange = false;

// Initialize history with initial state
history.push(tree.value);

function focusSelectAndDrillDown(nodeId: string | null) {
  focusedNodeId.value = nodeId;
  selectedNodeIds.value = nodeId ? new Set([nodeId]) : new Set<string>();
  anchorNodeId.value = nodeId;
  drillDownNodeId.value = nodeId;
}

// Sync external value changes
watch(
  () => props.value,
  (val) => {
    if (isInternalChange) {
      isInternalChange = false;
      return;
    }
    const newTree = fromJson(val);
    tree.value = newTree;
    expandedNodeIds.value = new Set([newTree.root.id]);
    focusSelectAndDrillDown(null);
    history = new History();
    history.push(newTree);
    historyVersion.value++;
    searchQuery.value = "";
    searchMatches.value = [];
    searchMatchIndex.value = 0;
  },
  { flush: "sync" },
);

// Update search results when tree changes
watch(
  tree,
  (newTree) => {
    if (!searchQuery.value.trim()) return;
    const matches = searchNodes(newTree, searchQuery.value);
    searchMatches.value = matches;
    searchMatchIndex.value = Math.min(
      searchMatchIndex.value,
      Math.max(matches.length - 1, 0),
    );
  },
  { flush: "sync" },
);

function setTree(newTree: TreeState) {
  tree.value = newTree;
  history.push(newTree);
  historyVersion.value++;
  isInternalChange = true;
  emit("change", toJson(newTree.root));
}

function undo() {
  const prev = history.undo();
  if (prev) {
    tree.value = prev;
    historyVersion.value++;
    isInternalChange = true;
    emit("change", toJson(prev.root));
  }
}

function redo() {
  const next = history.redo();
  if (next) {
    tree.value = next;
    historyVersion.value++;
    isInternalChange = true;
    emit("change", toJson(next.root));
  }
}

function handleKeyDown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (mod && e.key === "z" && e.shiftKey) {
    e.preventDefault();
    redo();
  } else if (mod && e.key === "y") {
    e.preventDefault();
    redo();
  }
}

onMounted(() => document.addEventListener("keydown", handleKeyDown));
onUnmounted(() => document.removeEventListener("keydown", handleKeyDown));

const state: StudioState = {
  tree,
  focusedNodeId,
  selectedNodeIds,
  anchorNodeId,
  drillDownNodeId,
  expandedNodeIds,
  schema: computed<JsonSchema | null>(() => props.schema ?? null),
  searchQuery,
  searchMatches,
  searchMatchIndex,
  searchMatchNodeIds,
  canUndo,
  canRedo,
};

const actions: StudioActions = {
  setTree,
  selectNode(nodeId) {
    focusedNodeId.value = nodeId;
    selectedNodeIds.value = nodeId ? new Set([nodeId]) : new Set<string>();
    anchorNodeId.value = nodeId;
  },
  selectAndDrillDown: focusSelectAndDrillDown,
  toggleNodeSelection(nodeId) {
    const next = new Set(selectedNodeIds.value);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    selectedNodeIds.value = next;
    if (next.size === 0) {
      focusedNodeId.value = null;
      anchorNodeId.value = null;
    } else {
      focusedNodeId.value = nodeId;
      anchorNodeId.value = nodeId;
    }
  },
  selectNodeRange(toNodeId) {
    const nodes = visibleNodesOverride ?? visibleNodes.value;
    const anchor = anchorNodeId.value;
    if (!anchor) {
      focusedNodeId.value = toNodeId;
      selectedNodeIds.value = new Set([toNodeId]);
      anchorNodeId.value = toNodeId;
      return;
    }
    const rangeIds = computeRangeIds(nodes, anchor, toNodeId);
    if (!rangeIds) {
      focusedNodeId.value = toNodeId;
      selectedNodeIds.value = new Set([toNodeId]);
      anchorNodeId.value = toNodeId;
      return;
    }
    selectedNodeIds.value = rangeIds;
    focusedNodeId.value = toNodeId;
  },
  setSelection(focusedId, newSelectedIds, newAnchorId) {
    focusedNodeId.value = focusedId;
    selectedNodeIds.value = newSelectedIds;
    anchorNodeId.value = newAnchorId;
  },
  setVisibleNodesOverride(nodes) {
    visibleNodesOverride = nodes;
  },
  drillDown(nodeId) {
    drillDownNodeId.value = nodeId;
  },
  toggleExpand(nodeId) {
    const next = new Set(expandedNodeIds.value);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    expandedNodeIds.value = next;
  },
  expandNode(nodeId) {
    const next = new Set(expandedNodeIds.value);
    next.add(nodeId);
    expandedNodeIds.value = next;
  },
  collapseNode(nodeId) {
    const next = new Set(expandedNodeIds.value);
    next.delete(nodeId);
    expandedNodeIds.value = next;
  },
  expandAll() {
    expandedNodeIds.value = new Set(collectAllIds(tree.value.root));
  },
  collapseAll() {
    expandedNodeIds.value = new Set([tree.value.root.id]);
  },
  undo,
  redo,
  setSearchQuery(query) {
    searchQuery.value = query;
    if (!query.trim()) {
      searchMatches.value = [];
      searchMatchIndex.value = 0;
      return;
    }
    const matches = searchNodes(tree.value, query);
    searchMatches.value = matches;
    searchMatchIndex.value = 0;

    if (matches.length > 0) {
      const ancestors = getAncestorIds(
        tree.value,
        matches.map((m) => m.nodeId),
      );
      const next = new Set(expandedNodeIds.value);
      for (const id of ancestors) next.add(id);
      expandedNodeIds.value = next;
      focusSelectAndDrillDown(matches[0].nodeId);
    }
  },
  nextSearchMatch() {
    if (searchMatches.value.length === 0) return;
    const nextIdx = (searchMatchIndex.value + 1) % searchMatches.value.length;
    searchMatchIndex.value = nextIdx;
    focusSelectAndDrillDown(searchMatches.value[nextIdx].nodeId);
  },
  prevSearchMatch() {
    if (searchMatches.value.length === 0) return;
    const prevIdx =
      (searchMatchIndex.value - 1 + searchMatches.value.length) %
      searchMatches.value.length;
    searchMatchIndex.value = prevIdx;
    focusSelectAndDrillDown(searchMatches.value[prevIdx].nodeId);
  },
};

provide(STUDIO_KEY, { state, actions });
</script>

<template>
  <slot />
</template>
