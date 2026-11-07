import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // API tests share one seeded test database, so files run one after another.
    fileParallelism: false,
    testTimeout: 30000,
  },
});
