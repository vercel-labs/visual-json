# @visual-json/react

## 0.3.1

### Patch Changes

- Fix published packages containing unresolved `workspace:*` dependencies
- Updated dependencies
  - @visual-json/core@0.3.1

## 0.3.0

### Minor Changes

- Shared UI utilities (diff, drag-and-drop, form, tree helpers, theme) extracted to `@internal/ui` for cross-framework reuse.
- Refactored monorepo package structure: packages moved under `packages/@visual-json/`.

### Patch Changes

- Updated dependencies
  - @visual-json/core@0.3.0

## 0.2.0

### Minor Changes

- ### Features
  - Multi-select in TreeView — shift-click range selection, cmd/ctrl-click toggle, bulk drag-and-drop reordering.
  - Schema-aware enum dropdowns in FormView, including boolean enums.
  - VS Code extension support — breadcrumbs, form view, and search bar adapted for webview.

  ### Fixes
  - Prevent dropping a node into its own descendants.
  - Sync tree mode edits to raw mode.
  - Mobile focus issues in breadcrumbs, form view, search bar.

  ### Internal
  - `isDescendant` moved from react to core with unit tests.
  - New core operations: `insertProperty`, `insertNode`, `reorderChildrenMulti`, `buildSubtree`, `reparentSubtree`.

### Patch Changes

- Updated dependencies
  - @visual-json/core@0.2.0

## 0.1.1

### Patch Changes

- fix published package
- Updated dependencies
  - @visual-json/core@0.1.1

## 0.1.0

### Minor Changes

- Initial release of `@visual-json/react` — React components for visual-json.
- `VisualJson` context provider with state management, history, and search.
- `JsonEditor` wrapper component for quick integration.
- `TreeView` — collapsible tree editor with keyboard navigation and drag-and-drop.
- `FormView` — inline schema-aware form editor.
- `SearchBar` — search with match navigation, expand/collapse controls.
- `Breadcrumbs` — path-based breadcrumb navigation.
- `ContextMenu` — right-click context menu for node operations.
