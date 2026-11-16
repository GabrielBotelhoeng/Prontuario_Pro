import { describe, it, expect } from "vitest";
import { nomeMedico, primeiroNome } from "@/lib/nome";

describe("primeiroNome", () => {
  it("usa o primeiro nome", () => {
    expect(primeiroNome("Carlos Mendes")).toBe("Carlos");
  });
  it("mantém o título junto do nome", () => {
    expect(primeiroNome("Dra. Helena Duarte")).toBe("Dra. Helena");
    expect(primeiroNome("Dr Otávio Lima")).toBe("Dr Otávio");
  });
  it("ignora espaços extras", () => {
    expect(primeiroNome("  Ana   Souza ")).toBe("Ana");
  });
  it("lida com vazio, null e título sozinho", () => {
    expect(primeiroNome("")).toBe("");
    expect(primeiroNome(null)).toBe("");
    expect(primeiroNome("Dra.")).toBe("Dra.");
  });
});

describe("nomeMedico", () => {
  it("prefixa Dr(a). quando o cadastro não tem título", () => {
    expect(nomeMedico("Helena Duarte")).toBe("Dr(a). Helena Duarte");
  });
  it("não duplica o título", () => {
    expect(nomeMedico("Dra. Helena Duarte")).toBe("Dra. Helena Duarte");
    expect(nomeMedico("Dr Otávio")).toBe("Dr Otávio");
  });
  it("traço quando não há nome", () => {
    expect(nomeMedico(null)).toBe("—");
  });
});
