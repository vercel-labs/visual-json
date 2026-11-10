import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/ui"],
  external: ["react", "react-dom", "@visual-json/core"],
  // A string command is run without awaiting it, so a type error fails a one-shot build
  // while `tsup --watch` keeps watching.
  onSuccess: "tsc -p tsconfig.build.json && node scripts/bundle-dts.mjs",
});
