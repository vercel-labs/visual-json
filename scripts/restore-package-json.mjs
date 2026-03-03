/**
 * Restores package.json from the backup created by resolve-workspace-deps.mjs.
 * Run as a `postpack` lifecycle script.
 */

import { existsSync, renameSync } from "fs";
import { join } from "path";

const pkgJsonPath = join(process.cwd(), "package.json");
const backupPath = pkgJsonPath + ".bak";

if (existsSync(backupPath)) {
  renameSync(backupPath, pkgJsonPath);
}
