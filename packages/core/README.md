# @visual-json/core

Headless core for [visual-json](https://github.com/vercel-labs/visual-json) — the visual JSON editor. Schema-aware, embeddable, extensible.

This package is framework-agnostic — it provides the data layer without any UI dependencies.

## Install

```bash
npm install @visual-json/core
```

## Usage

```ts
import { fromJson, toJson, setValue, addProperty } from "@visual-json/core";

// Convert a JSON value into an editable tree
const tree = fromJson({ name: "my-app", version: "1.0.0" });

// Mutate immutably — returns a new tree with structural sharing
const updated = setValue(tree, tree.root.children[0].id, "new-app");

// Convert back to plain JSON
const json = toJson(updated.root);
```

## API

### Tree

<table>
  <thead>
    <tr>
      <th>Export</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>fromJson(value)</code></td>
      <td>Parse a <code>JsonValue</code> into a <code>TreeState</code></td>
    </tr>
    <tr>
      <td><code>toJson(node)</code></td>
      <td>Serialize a <code>TreeNode</code> back to a <code>JsonValue</code></td>
    </tr>
    <tr>
      <td><code>findNode(state, id)</code></td>
      <td>Look up a node by ID</td>
    </tr>
    <tr>
      <td><code>findNodeByPath(state, path)</code></td>
      <td>Look up a node by JSON path</td>
    </tr>
  </tbody>
</table>

### Operations

All operations return a new `TreeState` with structural sharing.

<table>
  <thead>
    <tr>
      <th>Export</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>setValue(state, nodeId, value)</code></td>
      <td>Set a node's value</td>
    </tr>
    <tr>
      <td><code>setKey(state, nodeId, newKey)</code></td>
      <td>Rename an object key</td>
    </tr>
    <tr>
      <td><code>addProperty(state, parentId, key, value)</code></td>
      <td>Add a child to an object or array</td>
    </tr>
    <tr>
      <td><code>insertProperty(state, parentId, key, value, index)</code></td>
      <td>Insert a child at a specific index</td>
    </tr>
    <tr>
      <td><code>insertNode(state, parentId, node, index)</code></td>
      <td>Insert an existing node subtree at a specific index, preserving IDs</td>
    </tr>
    <tr>
      <td><code>removeNode(state, nodeId)</code></td>
      <td>Remove a node</td>
    </tr>
    <tr>
      <td><code>moveNode(state, nodeId, newParentId, index?)</code></td>
      <td>Move a node to a new parent</td>
    </tr>
    <tr>
      <td><code>reorderChildren(state, parentId, from, to)</code></td>
      <td>Reorder children within a parent</td>
    </tr>
    <tr>
      <td><code>reorderChildrenMulti(state, parentId, movedIds, targetSiblingId, position)</code></td>
      <td>Reorder multiple children relative to a sibling</td>
    </tr>
    <tr>
      <td><code>changeType(state, nodeId, newType)</code></td>
      <td>Convert a node to a different type</td>
    </tr>
    <tr>
      <td><code>duplicateNode(state, nodeId)</code></td>
      <td>Duplicate a node as a sibling</td>
    </tr>
  </tbody>
</table>

### Schema

<table>
  <thead>
    <tr>
      <th>Export</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>resolveSchema(value, filename)</code></td>
      <td>Auto-detect and fetch a JSON Schema for a file</td>
    </tr>
    <tr>
      <td><code>getPropertySchema(schema, path)</code></td>
      <td>Get the schema for a specific path</td>
    </tr>
    <tr>
      <td><code>validateNode(node, schema)</code></td>
      <td>Validate a node against a schema</td>
    </tr>
  </tbody>
</table>

### Search & Diff

<table>
  <thead>
    <tr>
      <th>Export</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>searchNodes(state, query)</code></td>
      <td>Full-text search across keys and values</td>
    </tr>
    <tr>
      <td><code>computeDiff(a, b)</code></td>
      <td>Compute a structural diff between two JSON values</td>
    </tr>
    <tr>
      <td><code>History</code></td>
      <td>Undo/redo stack for <code>TreeState</code></td>
    </tr>
  </tbody>
</table>

## License

Apache-2.0
