import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: { resolve: ["@internal/ui"] },
  sourcemap: true,
  clean: true,
  noExternal: ["@internal/ui"],
  external: ["react", "react-dom", "@visual-json/core"],
});
