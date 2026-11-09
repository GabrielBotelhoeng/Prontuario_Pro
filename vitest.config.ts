import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Testes unitários nunca leem o .env de produção: ambiente fixo e local.
  envDir: path.resolve(__dirname, "src/test"),
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:65535",
      VITE_SUPABASE_ANON_KEY: "chave-de-teste-unitario",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
