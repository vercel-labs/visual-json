#!/usr/bin/env node

/**
 * Verifies that all @visual-json/* packages have the same version.
 * Used in CI to catch version drift.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const packagesDir = join(rootDir, "packages", "@visual-json");

const corePackageJson = JSON.parse(
  readFileSync(join(packagesDir, "core", "package.json"), "utf-8"),
);
const version = corePackageJson.version;

const packages = ["react", "vue", "svelte", "yaml"];
const mismatches = [];

for (const pkg of packages) {
  const pkgJsonPath = join(packagesDir, pkg, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  if (pkgJson.version !== version) {
    mismatches.push(`  @visual-json/${pkg}: ${pkgJson.version}`);
  }
}

if (mismatches.length > 0) {
  console.error("Version mismatch detected!");
  console.error(`  @visual-json/core: ${version}`);
  for (const m of mismatches) console.error(m);
  console.error("");
  console.error("Run 'pnpm run version:sync' to fix this.");
  process.exit(1);
}

console.log(`All @visual-json/* packages are in sync: ${version}`);
