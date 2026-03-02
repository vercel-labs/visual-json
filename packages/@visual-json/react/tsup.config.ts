import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: { resolve: ["@internal/ui-shared"] },
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/ui-shared"],
  external: ["react", "react-dom", "@visual-json/core"],
});
