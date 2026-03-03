# Design: Svelte 5 Support for `@visual-json/svelte`

## Problem

The `@visual-json/svelte` package exists in the monorepo but its `src/lib/` directory is empty. The React and Vue packages provide full editor UI (TreeView, FormView, DiffView, etc.). We need a Svelte 5 implementation with feature parity.

## Approach

Port the Vue implementation to Svelte 5 using idiomatic rune-based patterns. The public API surface matches Vue's (same function names, component names, and prop names), while the internals use Svelte 5 primitives.

---

## Package Structure

```
packages/@visual-json/svelte/src/lib/
  components/
    VisualJson.svelte       ← root provider (setContext)
    JsonEditor.svelte       ← full editor layout (TreeView + FormView + toolbar)
    TreeView.svelte         ← scrollable tree panel
    TreeNodeRow.svelte      ← individual tree row (drag/drop, selection)
    FormView.svelte         ← form panel for selected node
    FormField.svelte        ← renders one editable field (string/number/bool/enum/null)
    Breadcrumbs.svelte      ← path navigation bar with autocomplete
    SearchBar.svelte        ← search input with prev/next match
    ContextMenu.svelte      ← right-click context menu
    DiffView.svelte         ← side-by-side diff display
    EnumInput.svelte        ← dropdown for schema enum values
  context.ts               ← StudioState/StudioActions interfaces + STUDIO_KEY symbol
  selection-utils.ts        ← computeRangeIds (same logic as Vue)
  use-studio.ts             ← useStudio() → getContext(STUDIO_KEY)
  use-drag-drop.svelte.ts   ← useDragDrop() with $state runes
  index.ts                  ← barrel exports
```

---

## State & Context

### `context.ts`

Defines `StudioState`, `StudioActions`, `StudioContextValue`, and `STUDIO_KEY`.

Unlike Vue where fields are `Ref<T>`, Svelte 5 state is plain values accessed reactively via runes. The context object passed to `setContext` contains getters so reactive values propagate to child components.

```ts
export interface StudioState {
  readonly tree: TreeState;
  readonly focusedNodeId: string | null;
  readonly selectedNodeIds: Set<string>;
  readonly anchorNodeId: string | null;
  readonly drillDownNodeId: string | null;
  readonly expandedNodeIds: Set<string>;
  readonly schema: JsonSchema | null;
  readonly searchQuery: string;
  readonly searchMatches: SearchMatch[];
  readonly searchMatchIndex: number;
  readonly searchMatchNodeIds: Set<string>;  // derived
  readonly canUndo: boolean;                 // derived
  readonly canRedo: boolean;                 // derived
}

export interface StudioActions {
  setTree(tree: TreeState): void;
  selectNode(nodeId: string | null): void;
  selectAndDrillDown(nodeId: string | null): void;
  toggleNodeSelection(nodeId: string): void;
  selectNodeRange(toNodeId: string): void;
  setSelection(focusedId: string | null, selectedIds: Set<string>, anchorId: string | null): void;
  setVisibleNodesOverride(nodes: TreeNode[] | null): void;
  drillDown(nodeId: string | null): void;
  toggleExpand(nodeId: string): void;
  expandNode(nodeId: string): void;
  collapseNode(nodeId: string): void;
  expandAll(): void;
  collapseAll(): void;
  undo(): void;
  redo(): void;
  setSearchQuery(query: string): void;
  nextSearchMatch(): void;
  prevSearchMatch(): void;
}

export interface StudioContextValue {
  state: StudioState;
  actions: StudioActions;
}

export const STUDIO_KEY = Symbol("StudioContext");
```

### `use-studio.ts`

```ts
export function useStudio(): StudioContextValue {
  const ctx = getContext<StudioContextValue>(STUDIO_KEY);
  if (!ctx) throw new Error("useStudio must be used within a <VisualJson> provider");
  return ctx;
}
```

---

## Vue → Svelte 5 Idiom Map

| Vue pattern | Svelte 5 equivalent |
|---|---|
| `defineProps<{}>()` | `let { prop } = $props()` |
| `defineEmits` + `emit('change', v)` | `let { onchange } = $props()` callback prop |
| `shallowRef(x)` / `.value` | `$state(x)` / direct access |
| `computed(() => ...)` | `$derived(...)` |
| `watch(x, fn)` | `$effect(() => { ... })` |
| `provide(KEY, val)` | `setContext(KEY, val)` |
| `inject(KEY)` | `getContext(KEY)` |
| `<slot />` | `{@render children?.()}` |
| `onMounted` / `onUnmounted` | `$effect(() => { setup; return cleanup })` |

---

## Components

### `VisualJson.svelte`

- Props: `value: JsonValue`, `schema?: JsonSchema | null`
- Event: `onchange?: (value: JsonValue) => void` (callback prop pattern)
- Manages all state: tree, selection, history, search
- Calls `setContext(STUDIO_KEY, { state, actions })`
- Renders `{@render children?.()}`

### `JsonEditor.svelte`

- Stateless layout shell
- Renders toolbar (SearchBar + undo/redo), TreeView, FormView side by side
- Accepts optional CSS class prop

### All other components

Direct ports from Vue with the idiom substitutions above. Inline styles preserved (no CSS framework dependency).

---

## Exports (`index.ts`)

```ts
export { default as VisualJson } from "./components/VisualJson.svelte";
export { default as JsonEditor } from "./components/JsonEditor.svelte";
export { default as TreeView } from "./components/TreeView.svelte";
export { default as FormView } from "./components/FormView.svelte";
export { default as SearchBar } from "./components/SearchBar.svelte";
export { default as Breadcrumbs } from "./components/Breadcrumbs.svelte";
export { default as ContextMenu } from "./components/ContextMenu.svelte";
export { default as DiffView } from "./components/DiffView.svelte";
export { default as EnumInput } from "./components/EnumInput.svelte";
export { useStudio } from "./use-studio";
export { useDragDrop } from "./use-drag-drop.svelte";
export type { DragState } from "./use-drag-drop.svelte";
export type { StudioState, StudioActions, StudioContextValue } from "./context";
export { getVisibleNodes, getDisplayKey } from "@internal/ui";
export type { JsonValue, JsonSchema } from "@visual-json/core";
```

---

## Documentation Changes

- Add `@visual-json/svelte` row to root `README.md` table
- Update `packages/@visual-json/svelte/README.md` with usage examples

---

## Out of Scope

- Svelte example app (not needed for this task)
- New features not present in the Vue implementation
