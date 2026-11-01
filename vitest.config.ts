import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/index.ts"],
    },
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@core": fileURLToPath(new URL("./src/app/core", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/app/shared", import.meta.url)),
      "@features": fileURLToPath(new URL("./src/app/features", import.meta.url)),
      "@rendering": fileURLToPath(new URL("./src/babylonjs", import.meta.url)),
    },
  },
});
