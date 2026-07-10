import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    environmentMatchGlobs: [
      ["tests/islands/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**/*.ts", "src/components/islands/**/*.vue"],
      exclude: ["src/env.d.ts", "src/content/data/**", "**/*.astro"],
      thresholds: {
        lines: 60,
        functions: 65,
        branches: 50,
        statements: 60,
      },
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
