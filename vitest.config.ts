import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**/*.ts", "src/components/islands/**/*.tsx"],
      exclude: ["src/env.d.ts", "src/content/data/**", "**/*.astro"],
      thresholds: {
        // Current baseline 2026-07-09. Raise per TODO.astro/18 as
        // component + island tests land. Target: 75/75/65/75.
        lines: 45,
        functions: 65,
        branches: 65,
        statements: 45,
      },
      reportsDirectory: "coverage",
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
      react: "preact/compat",
      "react-dom": "preact/compat",
    },
  },
});
