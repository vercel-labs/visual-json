#!/usr/bin/env node

/**
 * Syncs the version from @visual-json/core to all other @visual-json/* packages.
 * Run this script after bumping the version in packages/@visual-json/core/package.json.
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const packagesDir = join(rootDir, "packages", "@visual-json");

const corePackageJson = JSON.parse(
  readFileSync(join(packagesDir, "core", "package.json"), "utf-8"),
);
const version = corePackageJson.version;

console.log(`Syncing version ${version} to all @visual-json/* packages...`);

const packages = ["react", "vue", "svelte", "yaml"];

for (const pkg of packages) {
  const pkgJsonPath = join(packagesDir, pkg, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  if (pkgJson.version !== version) {
    const oldVersion = pkgJson.version;
    pkgJson.version = version;
    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
    console.log(`  Updated @visual-json/${pkg}: ${oldVersion} -> ${version}`);
  } else {
    console.log(`  @visual-json/${pkg} already up to date`);
  }
}

console.log("Version sync complete.");
