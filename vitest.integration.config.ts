import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({ test: { environment: "node", include: ["tests/integration/**/*.test.ts"], fileParallelism: false }, resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/support/server-only.ts") } } });
