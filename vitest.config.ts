import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "build/**", ".react-router/**"],
    coverage: { reporter: ["text", "html"] },
  },
});
