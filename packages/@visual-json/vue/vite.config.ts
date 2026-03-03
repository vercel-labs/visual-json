import { resolve } from "node:path";
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
