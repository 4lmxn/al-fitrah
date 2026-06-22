import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` is a build-time guard with no runtime in plain Node;
      // alias it to an empty module so server modules import cleanly in tests.
      "server-only": fileURLToPath(new URL("./tests/unit/stubs/empty.ts", import.meta.url)),
    },
  },
});
