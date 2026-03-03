/**
 * Resolves pnpm `workspace:*` dependencies to real version ranges before
 * packing / publishing.  Run as a `prepack` lifecycle script so the tarball
 * sent to npm contains concrete versions while the source package.json keeps
 * the workspace protocol for local development.
 *
 * A backup (package.json.bak) is written so `restore-package-json.mjs` can
 * revert the file in `postpack`.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgJsonPath = join(process.cwd(), "package.json");
const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));

function getWorkspacePackage(name) {
  if (!name.startsWith("@")) return null;
  const [scope, pkgName] = name.split("/");
  const candidate = join(rootDir, "packages", scope, pkgName, "package.json");
  if (!existsSync(candidate)) return null;
  return JSON.parse(readFileSync(candidate, "utf-8"));
}

function resolveVersion(version, depPkg) {
  const specifier = version.slice("workspace:".length);
  switch (specifier) {
    case "*":
    case "":
      return depPkg.version;
    case "^":
      return `^${depPkg.version}`;
    case "~":
      return `~${depPkg.version}`;
    default:
      return specifier;
  }
}

let changed = false;

for (const field of ["dependencies", "peerDependencies"]) {
  const deps = pkg[field];
  if (!deps) continue;

  for (const [name, version] of Object.entries(deps)) {
    if (!version.startsWith("workspace:")) continue;
    const depPkg = getWorkspacePackage(name);
    if (!depPkg) throw new Error(`Cannot resolve workspace dependency: ${name}`);
    deps[name] = resolveVersion(version, depPkg);
    console.log(`  ${field} ${name}: ${version} → ${deps[name]}`);
    changed = true;
  }
}

if (pkg.devDependencies) {
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    if (!version.startsWith("workspace:")) continue;
    const depPkg = getWorkspacePackage(name);
    if (depPkg?.private) {
      delete pkg.devDependencies[name];
      console.log(`  devDependencies ${name}: removed (private package)`);
      changed = true;
    } else if (depPkg) {
      pkg.devDependencies[name] = resolveVersion(version, depPkg);
      console.log(
        `  devDependencies ${name}: ${version} → ${pkg.devDependencies[name]}`
      );
      changed = true;
    }
  }
}

if (changed) {
  copyFileSync(pkgJsonPath, pkgJsonPath + ".bak");
  writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`Resolved workspace deps for ${pkg.name}`);
}
