import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/index.ts", "**/*.d.ts"],
      thresholds: {
        lines: 80,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@typeset-ai/core": resolve(__dirname, "packages/core/src"),
    },
  },
});
