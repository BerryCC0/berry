import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest doesn't pick up TypeScript path aliases from tsconfig.json
// automatically. Mirror the ones we use in tests here so `@/...` imports
// resolve in `.test.ts` files. Keep in sync with the `paths` block in
// tsconfig.json (only the aliases tests actually use need to appear here).
export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/__tests__/**/*.test.ts",
      "app/**/*.test.ts",
      "ponder/tests/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@/app": path.resolve(__dirname, "app"),
      "@/OS": path.resolve(__dirname, "src/OS"),
      "@/Apps": path.resolve(__dirname, "src/Apps"),
      "@/shared": path.resolve(__dirname, "src/shared"),
      "@": path.resolve(__dirname, "."),
    },
  },
});
