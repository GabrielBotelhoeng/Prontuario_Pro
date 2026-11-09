import { describe, it, expect } from "vitest";
import { buscarCid, CID10_FREQUENTES } from "@/lib/cid10";

describe("buscarCid", () => {
  it("ignora termos com menos de 2 caracteres", () => {
    expect(buscarCid("")).toEqual([]);
    expect(buscarCid("a")).toEqual([]);
  });

  it("encontra pelo prefixo do código, sem diferenciar maiúsculas", () => {
    expect(buscarCid("i10").map((c) => c.codigo)).toEqual(["I10"]);
    expect(buscarCid("M54").map((c) => c.codigo)).toEqual(["M54.2", "M54.5"]);
  });

  it("encontra pela descrição ignorando acentos", () => {
    expect(buscarCid("hipertensao").map((c) => c.codigo)).toContain("I10");
    expect(buscarCid("insônia").map((c) => c.codigo)).toContain("G47.0");
  });

  it("respeita o limite de resultados", () => {
    expect(buscarCid("nao", 3)).toHaveLength(3);
  });

  it("não tem códigos duplicados na lista", () => {
    const codigos = CID10_FREQUENTES.map((c) => c.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });
});
