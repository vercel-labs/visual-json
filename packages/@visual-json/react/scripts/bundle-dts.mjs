// Bundles the declarations tsc writes to .types into dist/index.d.ts, inlining the types of
// @internal/ui (a private package bundled into this one). rolldown-plugin-dts reads the .d.ts
// files as they are (dtsInput), so this step needs no TypeScript API.
import { join } from "node:path";
import { rolldown } from "rolldown";
import { dts } from "rolldown-plugin-dts";

const cwd = join(import.meta.dirname, "..");

const bundle = await rolldown({
  cwd,
  input: { index: join(cwd, ".types/index.d.ts") },
  external: ["react", "react-dom", "@visual-json/core"],
  plugins: [
    dts({
      dtsInput: true,
      emitDtsOnly: true,
      generator: "oxc",
      resolve: ["@internal/ui"],
      sourcemap: false,
    }),
  ],
});
await bundle.write({ dir: "dist", format: "es" });
await bundle.close();
