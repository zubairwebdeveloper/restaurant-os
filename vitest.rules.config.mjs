import { defineConfig } from "vitest/config";
import path from "node:path";

// Rules tests need the Firebase emulators (see `npm run test:rules` and docs/TESTING.md).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    environment: "node",
    include: ["tests/security/**/*.test.js"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
