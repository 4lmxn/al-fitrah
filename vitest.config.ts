import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Run as the server runs (see Dockerfile). "Today" is computed from the
    // process timezone throughout, so tests left on the runner's zone pass in
    // Bangalore and fail in CI's UTC — which is exactly the production bug,
    // discovered in the wrong place.
    env: { TZ: "Asia/Kolkata" },
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
