import { defineConfig } from "tsup";
import { emitTypes } from "../../../scripts/emit-types.mjs";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  onSuccess: async () => {
    emitTypes(__dirname);
  },
});
