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

## Releasing

Releases are manual, single-PR affairs. There is no changesets automation. The maintainer controls the changelog voice and format.

To prepare a release:

1. Create a branch (e.g. `prepare-v0.5.0`)
2. Bump `version` in `packages/@visual-json/core/package.json`
3. Run `pnpm version:sync` to update all other `@visual-json/*` packages
4. Write the changelog entry in `CHANGELOG.md` at the top, under a new `## <version>` heading, wrapped in `<!-- release:start -->` and `<!-- release:end -->` markers. Remove the markers from the previous release entry so only the new release has markers.
5. Add a matching entry to `apps/web/src/app/docs/changelog/page.mdx` at the top (below the `# Changelog` heading)
6. Open a PR and merge to `main`

When the PR merges, CI compares `packages/@visual-json/core/package.json` version to what's on npm. If it differs, it builds, publishes all `@visual-json/*` packages, and creates the GitHub release automatically. The GitHub release body is extracted from the content between the `<!-- release:start -->` and `<!-- release:end -->` markers in `CHANGELOG.md`.

## Documentation

Use HTML `<table>` elements for tables in all documentation files (README.md, MDX docs). Do not use markdown pipe tables.

When making a user-facing change (adding, removing, or renaming a component, prop, API, or feature), update all relevant documentation in the same PR: web app docs (`apps/web/src/app/docs/`), package READMEs, and any SKILL.md files that reference the changed surface area.
