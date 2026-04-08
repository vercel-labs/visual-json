# @visual-json/yaml

YAML support for [visual-json](https://github.com/vercel-labs/visual-json) — the visual JSON editor.

Parse and serialize YAML, convert between YAML and tree states, and detect schemas for well-known YAML files.

## Install

```bash
npm install @visual-json/yaml @visual-json/core
```

## Usage

```ts
import { fromYaml, toYaml, parseYamlContent, stringifyYamlContent } from "@visual-json/yaml";

// Parse YAML into a TreeState for use with visual-json components
const state = fromYaml(`
name: my-app
version: 1.0.0
scripts:
  build: tsc
`);

// Convert a TreeState back to YAML
const yaml = toYaml(state);
```

## API

<table>
  <thead>
    <tr>
      <th>Export</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>fromYaml(text)</code></td>
      <td>Parse a YAML string into a <code>TreeState</code></td>
    </tr>
    <tr>
      <td><code>toYaml(state)</code></td>
      <td>Serialize a <code>TreeState</code> back to a YAML string</td>
    </tr>
    <tr>
      <td><code>parseYamlContent(text)</code></td>
      <td>Parse a YAML string to a plain <code>JsonValue</code></td>
    </tr>
    <tr>
      <td><code>stringifyYamlContent(value)</code></td>
      <td>Serialize a <code>JsonValue</code> to a YAML string</td>
    </tr>
    <tr>
      <td><code>isYamlFile(filename)</code></td>
      <td>Returns <code>true</code> if the filename ends with <code>.yaml</code> or <code>.yml</code></td>
    </tr>
  </tbody>
</table>

## Schema Detection

The core `resolveSchema` function recognizes many popular YAML config files and automatically fetches the appropriate JSON Schema. This powers schema-aware editing in the VS Code extension for files like:

- `docker-compose.yml` / `docker-compose.yaml`
- `.github/workflows/*.yml`
- `.gitlab-ci.yml`
- `pnpm-workspace.yaml`
- `serverless.yml` / `serverless.yaml`
- `.prettierrc.yml` / `.eslintrc.yml`
- And many more

See [`@visual-json/core` schema docs](https://github.com/vercel-labs/visual-json/tree/main/packages/@visual-json/core) for the full list.

## License

Apache-2.0
