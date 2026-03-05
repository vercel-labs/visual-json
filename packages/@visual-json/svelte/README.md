# @visual-json/svelte

Svelte 5 UI components for the visual JSON editor. Schema-aware, embeddable, extensible.

## Installation

```sh
npm install @visual-json/svelte
```

## Usage

### Full editor (`JsonEditor`)

The simplest way to embed a full JSON editor with tree view, form view, search, and breadcrumbs:

```svelte
<script>
  import { JsonEditor } from "@visual-json/svelte";

  let value = $state({ name: "Alice", age: 30 });
</script>

<JsonEditor {value} onchange={(v) => (value = v)} height="500px" />
```

### Composing individual panels

Use `<VisualJson>` as a provider and compose `<TreeView>`, `<FormView>`, and `<SearchBar>` manually:

```svelte
<script>
  import {
    VisualJson,
    TreeView,
    FormView,
    SearchBar,
  } from "@visual-json/svelte";

  let value = $state({});
</script>

<VisualJson {value} onchange={(v) => (value = v)}>
  <SearchBar />
  <div style="display: flex; height: 400px;">
    <TreeView />
    <FormView />
  </div>
</VisualJson>
```

### Schema validation

Pass a JSON Schema to get type-aware editing, enum dropdowns, and required field indicators:

```svelte
<JsonEditor
  {value}
  schema={{
    type: "object",
    properties: {
      name: { type: "string", title: "Name" },
      age: { type: "number", minimum: 0 },
      role: { type: "string", enum: ["admin", "user", "guest"] },
    },
    required: ["name"],
  }}
  onchange={(v) => (value = v)}
/>
```

## Components

<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>JsonEditor</code></td>
      <td>Full editor with tree, form, search, breadcrumbs, and resizable sidebar</td>
    </tr>
    <tr>
      <td><code>VisualJson</code></td>
      <td>Root context provider — wrap your own layout with this</td>
    </tr>
    <tr>
      <td><code>TreeView</code></td>
      <td>Collapsible tree panel with keyboard navigation, drag-drop, and context menu</td>
    </tr>
    <tr>
      <td><code>FormView</code></td>
      <td>Form panel with inline key/value editing and schema-aware fields</td>
    </tr>
    <tr>
      <td><code>SearchBar</code></td>
      <td>Search input with match navigation (Cmd+F to focus)</td>
    </tr>
    <tr>
      <td><code>Breadcrumbs</code></td>
      <td>Path navigation bar with autocomplete</td>
    </tr>
    <tr>
      <td><code>DiffView</code></td>
      <td>Side-by-side diff display between two JSON values</td>
    </tr>
    <tr>
      <td><code>ContextMenu</code></td>
      <td>Right-click context menu (rendered to body via portal)</td>
    </tr>
    <tr>
      <td><code>EnumInput</code></td>
      <td>Dropdown input for enum and boolean values</td>
    </tr>
  </tbody>
</table>

## `JsonEditor` Props

<table>
  <thead>
    <tr>
      <th>Prop</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>value</code></td>
      <td><code>JsonValue</code></td>
      <td>—</td>
      <td>Controlled JSON value</td>
    </tr>
    <tr>
      <td><code>defaultValue</code></td>
      <td><code>JsonValue</code></td>
      <td><code>{}</code></td>
      <td>Uncontrolled initial value</td>
    </tr>
    <tr>
      <td><code>onchange</code></td>
      <td><code>(value: JsonValue) =&gt; void</code></td>
      <td>—</td>
      <td>Called when value changes</td>
    </tr>
    <tr>
      <td><code>schema</code></td>
      <td><code>JsonSchema | null</code></td>
      <td><code>null</code></td>
      <td>JSON Schema for type-aware editing</td>
    </tr>
    <tr>
      <td><code>height</code></td>
      <td><code>string | number</code></td>
      <td><code>"100%"</code></td>
      <td>Editor height</td>
    </tr>
    <tr>
      <td><code>width</code></td>
      <td><code>string | number</code></td>
      <td><code>"100%"</code></td>
      <td>Editor width</td>
    </tr>
    <tr>
      <td><code>sidebarOpen</code></td>
      <td><code>boolean</code></td>
      <td><code>true</code></td>
      <td>Show the tree sidebar</td>
    </tr>
    <tr>
      <td><code>treeShowValues</code></td>
      <td><code>boolean</code></td>
      <td><code>true</code></td>
      <td>Show values in the tree panel</td>
    </tr>
    <tr>
      <td><code>treeShowCounts</code></td>
      <td><code>boolean</code></td>
      <td><code>false</code></td>
      <td>Show child counts in the tree panel</td>
    </tr>
    <tr>
      <td><code>editorShowDescriptions</code></td>
      <td><code>boolean</code></td>
      <td><code>false</code></td>
      <td>Show schema descriptions in the form panel</td>
    </tr>
    <tr>
      <td><code>editorShowCounts</code></td>
      <td><code>boolean</code></td>
      <td><code>false</code></td>
      <td>Show child counts in the form panel</td>
    </tr>
  </tbody>
</table>

## Theming

Override CSS custom properties on a parent element:

```css
.my-editor {
  --vj-bg: #1e1e1e;
  --vj-bg-panel: #252526;
  --vj-bg-hover: #2a2d2e;
  --vj-bg-selected: #094771;
  --vj-text: #cccccc;
  --vj-text-muted: #999999;
  --vj-accent: #007acc;
  --vj-border: #333333;
  --vj-string: #ce9178;
  --vj-number: #b5cea8;
  --vj-boolean: #569cd6;
  --vj-null: #569cd6;
  --vj-font: monospace;
}
```
