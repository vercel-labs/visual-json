# @visual-json/vscode

VS Code extension for [visual-json](https://github.com/vercel-labs/visual-json) — the visual JSON editor.

> **Beta** — This extension is under active development. Feedback, bug reports, and feature requests are welcome at [github.com/vercel-labs/visual-json/issues](https://github.com/vercel-labs/visual-json/issues).

## Features

- **Visual editor** for `.json`, `.jsonc`, `.yaml`, and `.yml` files via "Open With..." > "visual-json"
- **YAML support** — open and edit YAML files with the same tree and form views used for JSON
- **Tree sidebar** with expand/collapse, drag-and-drop, keyboard navigation, and search
- **Form editor** with inline editing, schema-aware inputs, and breadcrumb navigation
- **Schema support** — auto-detects schemas from `$schema` or known filenames (`package.json`, `tsconfig.json`, `docker-compose.yml`, GitHub Actions workflows, etc.)
- **Theme integration** — adapts to your VS Code color theme automatically
- **Explorer panel** — sidebar view that syncs with the active JSON or YAML file

## Development

From the monorepo root:

```bash
pnpm install
pnpm --filter @visual-json/vscode dev
```

Then open `apps/vscode` in VS Code and press `F5` to launch the Extension Development Host.

## Build

```bash
pnpm --filter @visual-json/vscode build
```

## License

Apache-2.0
