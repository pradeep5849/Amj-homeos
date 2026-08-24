import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", env: { DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test", SESSION_SECRET: "test-only-session-secret-with-32-characters" }, coverage: { provider: "v8" } },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
