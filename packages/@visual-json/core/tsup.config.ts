import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  sourcemap: true,
  clean: true,
  // A string command is run without awaiting it, so a type error fails a one-shot build
  // while `tsup --watch` keeps watching.
  onSuccess: "tsc -p tsconfig.build.json",
});
