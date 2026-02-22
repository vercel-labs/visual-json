# @visual-json/core

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
