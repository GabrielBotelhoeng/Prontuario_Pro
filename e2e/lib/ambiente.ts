import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Credenciais do Supabase LOCAL de teste, lidas de `supabase status`.
 * Trava de segurança: aborta se a URL não for local — os agentes nunca
 * podem rodar contra a produção.
 */
interface Ambiente {
  url: string;
  anonKey: string;
  serviceKey: string;
}

function carregar(): Ambiente {
  const workdir = path.resolve(__dirname, "..");
  const bruto = execSync(`npx --yes supabase@3.0.0 status -o json --workdir "${workdir}"`, {
    cwd: workdir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const json = JSON.parse(bruto.slice(bruto.indexOf("{")));

  const url: string = json.API_URL;
  const anonKey: string = json.ANON_KEY ?? json.PUBLISHABLE_KEY;
  const serviceKey: string = json.SERVICE_ROLE_KEY ?? json.SECRET_KEY;

  if (!url || !anonKey || !serviceKey) {
    throw new Error("Supabase local não está rodando. Execute: node e2e/scripts/db.mjs start");
  }
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    throw new Error(`Recusado: os testes E2E só rodam contra Supabase local (recebido ${host}).`);
  }
  return { url, anonKey, serviceKey };
}

export const ambiente = carregar();
