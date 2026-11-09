#!/usr/bin/env node
/**
 * Supabase LOCAL dos testes E2E.
 *
 *   node e2e/scripts/db.mjs start   → sobe (aplica as migrations na 1ª vez)
 *   node e2e/scripts/db.mjs reset   → banco do zero com as migrations atuais
 *   node e2e/scripts/db.mjs stop    → desliga os containers
 *
 * Sempre copia supabase/migrations e supabase/functions do repositório para
 * e2e/supabase/, para que os agentes testem exatamente o código atual.
 * Roda a CLI com --workdir e2e/ (nunca toca no projeto remoto vinculado).
 */
import { cpSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CLI = "supabase@3.0.0";
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workdir = path.join(raiz, "e2e");

function sincronizar() {
  for (const pasta of ["migrations", "functions"]) {
    const destino = path.join(workdir, "supabase", pasta);
    rmSync(destino, { recursive: true, force: true });
    cpSync(path.join(raiz, "supabase", pasta), destino, { recursive: true });
  }
}

/** Executa a CLI escondendo chaves da saída (são de teste, mas não precisam ir para logs). */
function cli(args, { tolerarErro = false } = {}) {
  const r = spawnSync("npx", ["--yes", CLI, ...args, "--workdir", workdir], {
    cwd: workdir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const saida = `${r.stdout ?? ""}${r.stderr ?? ""}`
    .split("\n")
    .filter((l) => !/key|secret|jwt|token/i.test(l))
    .join("\n");
  process.stdout.write(saida);
  if (r.status !== 0 && !tolerarErro) {
    console.error(`\n✖ supabase ${args.join(" ")} falhou (código ${r.status})`);
    process.exit(r.status ?? 1);
  }
  return r.status === 0;
}

function rodando() {
  const r = spawnSync("npx", ["--yes", CLI, "status", "--workdir", workdir], {
    cwd: workdir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r.status === 0;
}

const comando = process.argv[2] ?? "start";

switch (comando) {
  case "start":
    sincronizar();
    cli(["start"]);
    break;
  case "reset":
    sincronizar();
    if (rodando()) cli(["db", "reset", "--local", "--no-seed"]);
    else cli(["start"]);
    break;
  case "stop":
    cli(["stop"], { tolerarErro: true });
    break;
  default:
    console.error(`Comando desconhecido: ${comando} (use start | reset | stop)`);
    process.exit(1);
}
