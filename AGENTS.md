# Agents

## Verification

Run `pnpm type-check` after every change to ensure there are no type errors.

## UI Components

Use the shadcn CLI (`npx shadcn@latest add <component>`) to install UI components in `apps/web`. Never write shadcn components by hand.

## User-Facing Dialogs

Never use native JS `alert()`, `confirm()`, or `prompt()`. Use custom UI components instead.

## Dev Servers

All apps and examples with dev servers use [portless](https://github.com/vercel-labs/portless) to avoid hardcoded ports. Portless assigns random ports and exposes each app via `.localhost` URLs.

Naming convention:

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Portless name</th>
      <th>URL</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Main web app</td>
      <td><code>visual-json</code></td>
      <td><code>http://visual-json.localhost:1355</code></td>
    </tr>
    <tr>
      <td>Examples</td>
      <td><code>[name]-example.visual-json</code></td>
      <td><code>http://[name]-example.visual-json.localhost:1355</code></td>
    </tr>
  </tbody>
</table>

When adding a new example that runs a dev server, wrap its `dev` script with `portless <name>`:

```json
{
  "scripts": {
    "dev": "portless my-app-example.visual-json next dev --turbopack"
  }
}
```

Do **not** add `--port` flags -- portless handles port assignment automatically. Do **not** add portless as a project dependency; it must be installed globally.

## Documentation

Use HTML `<table>` elements for tables in all documentation files (README.md, MDX docs). Do not use markdown pipe tables.
