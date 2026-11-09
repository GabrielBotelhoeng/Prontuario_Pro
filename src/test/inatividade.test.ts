import { describe, it, expect } from "vitest";
import { INATIVIDADE_AVISO_MS, INATIVIDADE_LIMITE_MS, estadoSessao, segundosRestantes } from "@/lib/inatividade";

const MIN = 60_000;
const t0 = 1_000_000;

describe("estadoSessao", () => {
  it("sessão ativa logo após atividade", () => {
    expect(estadoSessao(t0, t0)).toBe("ativa");
    expect(estadoSessao(t0, t0 + 12 * MIN)).toBe("ativa");
  });

  it("avisa 2 minutos antes do limite", () => {
    expect(estadoSessao(t0, t0 + INATIVIDADE_LIMITE_MS - INATIVIDADE_AVISO_MS)).toBe("aviso");
    expect(estadoSessao(t0, t0 + 14 * MIN)).toBe("aviso");
  });

  it("expira ao atingir 15 minutos sem uso", () => {
    expect(estadoSessao(t0, t0 + 15 * MIN)).toBe("expirada");
    expect(estadoSessao(t0, t0 + 60 * MIN)).toBe("expirada");
  });
});

describe("segundosRestantes", () => {
  it("conta regressiva até o encerramento e nunca fica negativa", () => {
    expect(segundosRestantes(t0, t0 + 13 * MIN)).toBe(120);
    expect(segundosRestantes(t0, t0 + 14 * MIN + 30_000)).toBe(30);
    expect(segundosRestantes(t0, t0 + 20 * MIN)).toBe(0);
  });
});
