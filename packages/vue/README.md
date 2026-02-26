# @visual-json/vue

Vue 3 UI components for [visual-json](https://github.com/vercel-labs/visual-json) — the visual JSON editor. Schema-aware, embeddable, extensible.

Tree view, form view, diff view, search, breadcrumbs, and more — all themeable via CSS custom properties.

## Install

```bash
npm install @visual-json/vue @visual-json/core
```

**Peer dependency:** Vue 3.3 or later.

## Quick start

`JsonEditor` is the batteries-included component — it bundles a tree sidebar, form editor, search bar, and keyboard navigation.

```vue
<script setup>
import { ref } from "vue";
import { JsonEditor } from "@visual-json/vue";

const value = ref({ hello: "world" });
</script>

<template>
  <JsonEditor :value="value" @change="value = $event" />
</template>
```

### Props

<table>
  <thead>
    <tr>
      <th>Prop</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>value</code></td>
      <td><code>JsonValue</code></td>
      <td>Controlled JSON value</td>
    </tr>
    <tr>
      <td><code>defaultValue</code></td>
      <td><code>JsonValue</code></td>
      <td>Uncontrolled initial value</td>
    </tr>
    <tr>
      <td><code>schema</code></td>
      <td><code>JsonSchema | null</code></td>
      <td>Optional JSON Schema for validation and hints</td>
    </tr>
    <tr>
      <td><code>readOnly</code></td>
      <td><code>boolean</code></td>
      <td>Disable editing</td>
    </tr>
    <tr>
      <td><code>sidebarOpen</code></td>
      <td><code>boolean</code></td>
      <td>Show/hide tree sidebar</td>
    </tr>
    <tr>
      <td><code>treeShowValues</code></td>
      <td><code>boolean</code></td>
      <td>Display values in tree nodes</td>
    </tr>
    <tr>
      <td><code>treeShowCounts</code></td>
      <td><code>boolean</code></td>
      <td>Display child counts in tree nodes</td>
    </tr>
    <tr>
      <td><code>editorShowDescriptions</code></td>
      <td><code>boolean</code></td>
      <td>Show schema descriptions in the form</td>
    </tr>
    <tr>
      <td><code>editorShowCounts</code></td>
      <td><code>boolean</code></td>
      <td>Show child counts in the form</td>
    </tr>
    <tr>
      <td><code>height</code> / <code>width</code></td>
      <td><code>string | number</code></td>
      <td>Container dimensions</td>
    </tr>
    <tr>
      <td><code>style</code></td>
      <td><code>Record&lt;string, string&gt;</code></td>
      <td>CSS custom property overrides</td>
    </tr>
  </tbody>
</table>

### Events

<table>
  <thead>
    <tr>
      <th>Event</th>
      <th>Payload</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>change</code></td>
      <td><code>JsonValue</code></td>
      <td>Emitted when the data changes</td>
    </tr>
  </tbody>
</table>

## Composable API

For full control, use the lower-level primitives:

```vue
<script setup>
import { VisualJson, TreeView, FormView, SearchBar } from "@visual-json/vue";
</script>

<template>
  <VisualJson :value="json" @change="onJsonChange">
    <SearchBar />
    <TreeView />
    <FormView />
  </VisualJson>
</template>
```

### Components

<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>VisualJson</code></td>
      <td>Provider — manages tree state, history, and search via <code>provide/inject</code></td>
    </tr>
    <tr>
      <td><code>TreeView</code></td>
      <td>Collapsible tree with drag-and-drop, keyboard nav, and context menu</td>
    </tr>
    <tr>
      <td><code>FormView</code></td>
      <td>Inline key/value editor with schema-aware inputs</td>
    </tr>
    <tr>
      <td><code>DiffView</code></td>
      <td>Side-by-side structural diff between two JSON values</td>
    </tr>
    <tr>
      <td><code>SearchBar</code></td>
      <td>Cmd+F search with match navigation</td>
    </tr>
    <tr>
      <td><code>Breadcrumbs</code></td>
      <td>Path breadcrumbs with typeahead navigation</td>
    </tr>
    <tr>
      <td><code>ContextMenu</code></td>
      <td>Right-click menu for tree operations (uses <code>&lt;Teleport&gt;</code>)</td>
    </tr>
  </tbody>
</table>

### Composables

<table>
  <thead>
    <tr>
      <th>Composable</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>useStudio()</code></td>
      <td>Access <code>state</code> and <code>actions</code> from the nearest <code>VisualJson</code> provider</td>
    </tr>
    <tr>
      <td><code>useDragDrop()</code></td>
      <td>Drag-and-drop state and handlers for tree reordering</td>
    </tr>
  </tbody>
</table>

## Theming

All components read CSS custom properties for colors, fonts, and spacing. Override them via the `style` prop or on a parent element:

```vue
<JsonEditor
  :value="data"
  :style="{
    '--vj-bg': '#ffffff',
    '--vj-text': '#111111',
    '--vj-border': '#e5e5e5',
    '--vj-accent': '#2563eb',
    '--vj-font': '\'Fira Code\', monospace',
  }"
  @change="data = $event"
/>
```

See the [default variable list](src/components/JsonEditor.vue) for all available tokens.

## License

Apache-2.0
