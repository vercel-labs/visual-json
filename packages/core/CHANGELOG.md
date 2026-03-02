# @visual-json/core

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

## 0.1.1

### Patch Changes

- fix published package

## 0.1.0

### Minor Changes

- Initial release of `@visual-json/core` — the headless engine for visual-json.
- JSON-to-tree model (`fromJson` / `toJson`) with stable node IDs.
- Full mutation API: `setValue`, `setKey`, `addProperty`, `removeNode`, `moveNode`, `reorderChildren`, `changeType`, `duplicateNode`.
- Undo / redo via `History` class.
- Tree search with `searchNodes`.
- JSON Schema resolution and per-node validation (`resolveSchema`, `validateNode`).
