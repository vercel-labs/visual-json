import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ["src/**/*.ts", "src/**/*.vue"],
      outDir: "dist",
      insertTypesEntry: true,
      rollupTypes: true,
      bundledPackages: ["@internal/ui"],
      // vite-plugin-dts looks typescript up from its own install location, which finds the
      // repo root's TypeScript 7. API Extractor needs this package's TypeScript 5.
      rollupOptions: {
        typescriptCompilerFolder: dirname(
          createRequire(import.meta.url).resolve("typescript/package.json"),
        ),
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "VisualJsonVue",
      fileName: (format) => `index.${format === "es" ? "mjs" : "js"}`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["vue", "@visual-json/core"],
      output: {
        globals: {
          vue: "Vue",
          "@visual-json/core": "VisualJsonCore",
        },
      },
    },
  },
});
