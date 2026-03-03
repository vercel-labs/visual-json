<script lang="ts">
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
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
		type SearchMatch
	} from '@visual-json/core';
	import { collectAllIds, getVisibleNodes } from '@internal/ui';
	import { STUDIO_KEY, type StudioState, type StudioActions } from '../context.js';
	import { computeRangeIds } from '../selection-utils.js';

	interface Props {
		value: JsonValue;
		schema?: JsonSchema | null;
		onchange?: (value: JsonValue) => void;
		children?: Snippet;
	}

	let { value, schema = null, onchange, children }: Props = $props();

	let tree = $state<TreeState>(fromJson(value));
	let focusedNodeId = $state<string | null>(null);
	let selectedNodeIds = $state<Set<string>>(new Set());
	let anchorNodeId = $state<string | null>(null);
	let drillDownNodeId = $state<string | null>(null);
	let expandedNodeIds = $state<Set<string>>(new Set([tree.root.id]));

	let visibleNodesOverride: TreeNode[] | null = null;
	let history = new History();
	let historyVersion = $state(0);

	let searchQuery = $state('');
	let searchMatches = $state<SearchMatch[]>([]);
	let searchMatchIndex = $state(0);

	let isInternalChange = false;

	history.push(tree);

	function focusSelectAndDrillDown(nodeId: string | null) {
		focusedNodeId = nodeId;
		selectedNodeIds = nodeId ? new Set([nodeId]) : new Set();
		anchorNodeId = nodeId;
		drillDownNodeId = nodeId;
	}

	// Sync external value changes
	$effect(() => {
		const v = value;
		if (isInternalChange) {
			isInternalChange = false;
			return;
		}
		const newTree = fromJson(v);
		tree = newTree;
		expandedNodeIds = new Set([newTree.root.id]);
		focusSelectAndDrillDown(null);
		history = new History();
		history.push(newTree);
		historyVersion++;
		searchQuery = '';
		searchMatches = [];
		searchMatchIndex = 0;
	});

	// Update search results when tree changes
	$effect(() => {
		const currentTree = tree;
		const query = searchQuery;
		if (!query.trim()) return;
		const matches = searchNodes(currentTree, query);
		searchMatches = matches;
		searchMatchIndex = Math.min(searchMatchIndex, Math.max(matches.length - 1, 0));
	});

	function setTree(newTree: TreeState) {
		tree = newTree;
		history.push(newTree);
		historyVersion++;
		isInternalChange = true;
		onchange?.(toJson(newTree.root));
	}

	function undo() {
		const prev = history.undo();
		if (prev) {
			tree = prev;
			historyVersion++;
			isInternalChange = true;
			onchange?.(toJson(prev.root));
		}
	}

	function redo() {
		const next = history.redo();
		if (next) {
			tree = next;
			historyVersion++;
			isInternalChange = true;
			onchange?.(toJson(next.root));
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		const mod = e.metaKey || e.ctrlKey;
		if (mod && e.key === 'z' && !e.shiftKey) {
			e.preventDefault();
			undo();
		} else if (mod && e.key === 'z' && e.shiftKey) {
			e.preventDefault();
			redo();
		} else if (mod && e.key === 'y') {
			e.preventDefault();
			redo();
		}
	}

	$effect(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	});

	const visibleNodes = $derived(getVisibleNodes(tree.root, (id) => expandedNodeIds.has(id)));

	const stateCtx: StudioState = {
		get tree() {
			return tree;
		},
		get focusedNodeId() {
			return focusedNodeId;
		},
		get selectedNodeIds() {
			return selectedNodeIds;
		},
		get anchorNodeId() {
			return anchorNodeId;
		},
		get drillDownNodeId() {
			return drillDownNodeId;
		},
		get expandedNodeIds() {
			return expandedNodeIds;
		},
		get schema() {
			return schema ?? null;
		},
		get searchQuery() {
			return searchQuery;
		},
		get searchMatches() {
			return searchMatches;
		},
		get searchMatchIndex() {
			return searchMatchIndex;
		},
		get searchMatchNodeIds() {
			return new Set(searchMatches.map((m) => m.nodeId));
		},
		get canUndo() {
			return historyVersion >= 0 && history.canUndo;
		},
		get canRedo() {
			return historyVersion >= 0 && history.canRedo;
		}
	};

	const actions: StudioActions = {
		setTree,
		selectNode(nodeId) {
			focusedNodeId = nodeId;
			selectedNodeIds = nodeId ? new Set([nodeId]) : new Set();
			anchorNodeId = nodeId;
		},
		selectAndDrillDown: focusSelectAndDrillDown,
		toggleNodeSelection(nodeId) {
			const next = new Set(selectedNodeIds);
			if (next.has(nodeId)) {
				next.delete(nodeId);
			} else {
				next.add(nodeId);
			}
			selectedNodeIds = next;
			if (next.size === 0) {
				focusedNodeId = null;
				anchorNodeId = null;
			} else {
				focusedNodeId = nodeId;
				anchorNodeId = nodeId;
			}
		},
		selectNodeRange(toNodeId) {
			const nodes = visibleNodesOverride ?? visibleNodes;
			const anchor = anchorNodeId;
			if (!anchor) {
				focusedNodeId = toNodeId;
				selectedNodeIds = new Set([toNodeId]);
				anchorNodeId = toNodeId;
				return;
			}
			const rangeIds = computeRangeIds(nodes, anchor, toNodeId);
			if (!rangeIds) {
				focusedNodeId = toNodeId;
				selectedNodeIds = new Set([toNodeId]);
				anchorNodeId = toNodeId;
				return;
			}
			selectedNodeIds = rangeIds;
			focusedNodeId = toNodeId;
		},
		setSelection(focusedId, newSelectedIds, newAnchorId) {
			focusedNodeId = focusedId;
			selectedNodeIds = newSelectedIds;
			anchorNodeId = newAnchorId;
		},
		setVisibleNodesOverride(nodes) {
			visibleNodesOverride = nodes;
		},
		drillDown(nodeId) {
			drillDownNodeId = nodeId;
		},
		toggleExpand(nodeId) {
			const next = new Set(expandedNodeIds);
			if (next.has(nodeId)) next.delete(nodeId);
			else next.add(nodeId);
			expandedNodeIds = next;
		},
		expandNode(nodeId) {
			expandedNodeIds = new Set([...expandedNodeIds, nodeId]);
		},
		collapseNode(nodeId) {
			const next = new Set(expandedNodeIds);
			next.delete(nodeId);
			expandedNodeIds = next;
		},
		expandAll() {
			expandedNodeIds = new Set(collectAllIds(tree.root));
		},
		collapseAll() {
			expandedNodeIds = new Set([tree.root.id]);
		},
		undo,
		redo,
		setSearchQuery(query) {
			searchQuery = query;
			if (!query.trim()) {
				searchMatches = [];
				searchMatchIndex = 0;
				return;
			}
			const matches = searchNodes(tree, query);
			searchMatches = matches;
			searchMatchIndex = 0;
			if (matches.length > 0) {
				const ancestors = getAncestorIds(
					tree,
					matches.map((m) => m.nodeId)
				);
				const next = new Set(expandedNodeIds);
				for (const id of ancestors) next.add(id);
				expandedNodeIds = next;
				focusSelectAndDrillDown(matches[0].nodeId);
			}
		},
		nextSearchMatch() {
			if (searchMatches.length === 0) return;
			const nextIdx = (searchMatchIndex + 1) % searchMatches.length;
			searchMatchIndex = nextIdx;
			focusSelectAndDrillDown(searchMatches[nextIdx].nodeId);
		},
		prevSearchMatch() {
			if (searchMatches.length === 0) return;
			const prevIdx = (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
			searchMatchIndex = prevIdx;
			focusSelectAndDrillDown(searchMatches[prevIdx].nodeId);
		}
	};

	setContext(STUDIO_KEY, { state: stateCtx, actions });
</script>

{@render children?.()}
