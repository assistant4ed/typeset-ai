import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        inline: ["puppeteer"],
      },
    },
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
      "@anthropic-ai/sdk": resolve(
        __dirname,
        "node_modules/.pnpm/@anthropic-ai+sdk@0.39.0/node_modules/@anthropic-ai/sdk/index.mjs",
      ),
      "puppeteer": resolve(
        __dirname,
        "node_modules/.pnpm/puppeteer@21.7.0_typescript@5.3.3/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js",
      ),
      "jszip": resolve(
        __dirname,
        "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/index.js",
      ),
    },
  },
});
