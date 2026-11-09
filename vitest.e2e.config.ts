import { defineConfig } from "vitest/config";
import path from "path";

// Testes E2E: agentes médico e paciente contra o Supabase LOCAL (e2e/).
// envDir aponta para e2e/ para nunca carregar o .env de produção.
export default defineConfig({
  envDir: path.resolve(__dirname, "e2e"),
  test: {
    include: ["e2e/**/*.e2e.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
