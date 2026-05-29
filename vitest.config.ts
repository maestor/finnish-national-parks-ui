import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      excludeAfterRemap: true,
      exclude: [
        "coverage/**",
        ".next/**",
        "e2e/**",
        "next-env.d.ts",
        "next.config.ts",
        "playwright.config.ts",
        "postcss.config.mjs",
        "vitest.config.ts",
        "src/proxy.ts",
        "src/app/manifest.ts",
        "src/app/robots.ts",
        "src/app/sw.ts",
        "src/app/serwist/**",
        "src/**/loading.tsx",
        "src/lib/api-types.ts",
        "src/test/**",
      ],
      thresholds: {
        statements: 90,
        branches: 83,
        functions: 90,
        lines: 90,
      },
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
