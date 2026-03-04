<script lang="ts">
  import { setContext, getContext, tick } from "svelte";
  import { useStudio } from "../use-studio.js";
  import { useDragDrop } from "../use-drag-drop.svelte.js";
  import { getVisibleNodes, getDisplayKey } from "@internal/ui";
  import { type JsonSchemaProperty } from "@visual-json/core";
  import {
    deleteSelectedNodes,
    computeSelectAllIds,
  } from "../selection-utils.js";
  import { FORM_VIEW_KEY, type FormViewContext } from "../form-view-context.js";
  import Breadcrumbs from "./Breadcrumbs.svelte";
  import FormField from "./FormField.svelte";

  interface Props {
    class?: string;
    showDescriptions?: boolean;
    showCounts?: boolean;
  }

  let {
    class: className,
    showDescriptions = false,
    showCounts = false,
  }: Props = $props();

  const { state: studioState, actions } = useStudio();
  type DebugWindow = Window & { __VJ_DEBUG_EDIT__?: boolean };
  function debugEdit(event: string, details: Record<string, unknown> = {}) {
    if (typeof window === "undefined") return;
    if (!(window as DebugWindow).__VJ_DEBUG_EDIT__) return;
    console.log("[vj-edit][FormView]", event, details);
  }

  let containerRef = $state<HTMLDivElement | null>(null);
  let isFocused = $state(false);
  let editingNodeId = $state<string | null>(null);
  let collapsedIds = $state<Set<string>>(new Set());
  let preEditTree = studioState.tree;
  let lastDisplayNodeId = $state<string | null>(null);

  const displayNodeId = $derived(
    studioState.drillDownNodeId ?? studioState.tree.root.id,
  );
  const displayNode = $derived(
    studioState.tree.nodesById.get(displayNodeId) ?? studioState.tree.root,
  );

  // Reset form state when display node changes
  $effect(() => {
    const currentDisplayNodeId = displayNodeId;
    if (lastDisplayNodeId === currentDisplayNodeId) return;
    debugEdit("display-node-changed-reset", {
      prevDisplayNodeId: lastDisplayNodeId,
      nextDisplayNodeId: currentDisplayNodeId,
      editingNodeId,
    });
    lastDisplayNodeId = currentDisplayNodeId;
    editingNodeId = null;
    collapsedIds = new Set();
  });

  const visibleNodes = $derived(
    getVisibleNodes(displayNode, (id) => !collapsedIds.has(id)),
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

  // Override visible nodes for range selection
  $effect(() => {
    actions.setVisibleNodesOverride(visibleNodes);
    return () => actions.setVisibleNodesOverride(null);
  });

  const metrics = $derived.by(() => {
    let maxKey = 1;
    let maxD = 0;
    const baseSegments =
      displayNode.path === "/"
        ? 0
        : displayNode.path.split("/").filter(Boolean).length;
    for (const node of visibleNodes) {
      const keyText =
        node.parentId === null ? "/" : getDisplayKey(node, studioState.tree);
      if (keyText.length > maxKey) maxKey = keyText.length;
      const segments =
        node.path === "/" ? 0 : node.path.split("/").filter(Boolean).length;
      const depth = segments - baseSegments;
      if (depth > maxD) maxD = depth;
    }
    return { maxKeyLength: maxKey, maxDepth: maxD };
  });

  const schema = $derived(studioState.schema);
  const rootSchema = $derived<JsonSchemaProperty | undefined>(
    studioState.schema ?? undefined,
  );

  function onSelect(nodeId: string, e: MouseEvent) {
    containerRef?.focus();
    debugEdit("select-node", {
      nodeId,
      shift: e.shiftKey,
      mod: e.metaKey || e.ctrlKey,
      wasEditingNodeId: editingNodeId,
    });
    editingNodeId = null;
    if (e.shiftKey) {
      actions.setVisibleNodesOverride(visibleNodes);
      actions.selectNodeRange(nodeId);
    } else if (e.metaKey || e.ctrlKey) {
      actions.toggleNodeSelection(nodeId);
    } else {
      actions.selectNode(nodeId);
    }
  }

  function onToggleCollapse(nodeId: string) {
    const next = new Set(collapsedIds);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    collapsedIds = next;
  }

  function onStartEditing(nodeId: string) {
    preEditTree = studioState.tree;
    editingNodeId = nodeId;
    debugEdit("start-editing", {
      nodeId,
      focusedNodeId: studioState.focusedNodeId,
    });
  }

  function scrollToNode(nodeId: string) {
    requestAnimationFrame(() => {
      const el = containerRef?.querySelector(`[data-form-node-id="${nodeId}"]`);
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (editingNodeId) {
      debugEdit("editing-keydown", { key: e.key, editingNodeId });
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        actions.setTree(preEditTree);
        editingNodeId = null;
        debugEdit("exit-editing-escape", {
          focusedNodeId: studioState.focusedNodeId,
        });
        containerRef?.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        editingNodeId = null;
        debugEdit("exit-editing-enter", {
          focusedNodeId: studioState.focusedNodeId,
        });
        containerRef?.focus();
      }
      return;
    }

    let currentIndex = visibleNodes.findIndex(
      (n) => n.id === studioState.focusedNodeId,
    );
    if (currentIndex === -1 && visibleNodes.length > 0) currentIndex = 0;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = visibleNodes[currentIndex + 1];
        if (next) {
          if (e.shiftKey) {
            actions.setVisibleNodesOverride(visibleNodes);
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
        const prev = visibleNodes[currentIndex - 1];
        if (prev) {
          if (e.shiftKey) {
            actions.setVisibleNodesOverride(visibleNodes);
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
        const node = currentIndex >= 0 ? visibleNodes[currentIndex] : null;
        if (node && (node.type === "object" || node.type === "array")) {
          if (collapsedIds.has(node.id)) {
            const next = new Set(collapsedIds);
            next.delete(node.id);
            collapsedIds = next;
          } else if (node.children.length > 0) {
            actions.selectNode(node.children[0].id);
            scrollToNode(node.children[0].id);
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
        if (isNodeContainer && !collapsedIds.has(current.id)) {
          const next = new Set(collapsedIds);
          next.add(current.id);
          collapsedIds = next;
        } else if (current.parentId) {
          const parentInVisible = visibleNodes.find(
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
        if (studioState.focusedNodeId) {
          preEditTree = studioState.tree;
          actions.selectNode(studioState.focusedNodeId);
          editingNodeId = studioState.focusedNodeId;
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

  const formCtx: FormViewContext = {
    get schema() {
      return schema;
    },
    get rootSchema() {
      return rootSchema;
    },
    get showDescriptions() {
      return showDescriptions;
    },
    get showCounts() {
      return showCounts;
    },
    get editingNodeId() {
      return editingNodeId;
    },
    get collapsedIds() {
      return collapsedIds;
    },
    get maxKeyLength() {
      return metrics.maxKeyLength;
    },
    get maxDepth() {
      return metrics.maxDepth;
    },
    get isFocused() {
      return isFocused;
    },
    get dragState() {
      return dragState;
    },
    onSelect,
    onToggleCollapse,
    onStartEditing,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDrop: handleDrop,
  };

  setContext(FORM_VIEW_KEY, formCtx);
</script>

<div
  class={className}
  style="
		background-color: var(--vj-bg, #1e1e1e);
		color: var(--vj-text, #cccccc);
		height: 100%;
		font-family: var(--vj-font, monospace);
		display: flex;
		flex-direction: column;
	"
>
  <div
    style="
			display: flex;
			align-items: center;
			padding: 4px 8px;
			border-bottom: 1px solid var(--vj-border, #333333);
			background-color: var(--vj-bg, #1e1e1e);
			flex-shrink: 0;
		"
  >
    <Breadcrumbs />
  </div>
  <div
    bind:this={containerRef}
    data-form-container
    role="tree"
    tabindex="0"
    style="flex: 1; overflow: auto; outline: none;"
    onkeydown={handleKeyDown}
    onfocus={() => {
      isFocused = true;
      debugEdit("form-focused", {
        focusedNodeId: studioState.focusedNodeId,
        editingNodeId,
      });
    }}
    onblur={(e) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
        isFocused = false;
        debugEdit("form-blurred", {
          relatedTargetTag:
            (e.relatedTarget as HTMLElement | null)?.tagName ?? null,
          editingNodeId,
        });
      }
    }}
  >
    <FormField node={displayNode} depth={0} />
  </div>
</div>
