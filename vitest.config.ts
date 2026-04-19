import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [["packages/@visual-json/react/**", "jsdom"]],
  },
});
