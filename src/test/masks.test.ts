import { describe, it, expect } from "vitest";
import { maskCPF, filterCRM, maskPhone, maskCEP } from "@/lib/masks";

describe("maskCPF", () => {
  it("formata CPF completo", () => {
    expect(maskCPF("12345678900")).toBe("123.456.789-00");
  });
  it("limita a 14 caracteres com máscara", () => {
    expect(maskCPF("123456789001234")).toBe("123.456.789-00");
  });
  it("ignora não-dígitos na entrada", () => {
    expect(maskCPF("123.456.789-00")).toBe("123.456.789-00");
  });
  it("formata parcialmente enquanto digita", () => {
    expect(maskCPF("123")).toBe("123");
    expect(maskCPF("12345")).toBe("123.45");
    expect(maskCPF("12345678")).toBe("123.456.78");
  });
  it("retorna vazio para entrada vazia", () => {
    expect(maskCPF("")).toBe("");
  });
});

describe("filterCRM", () => {
  it("converte para maiúsculo", () => {
    expect(filterCRM("123456/sp")).toBe("123456/SP");
  });
  it("remove caracteres inválidos", () => {
    expect(filterCRM("123 456.SP")).toBe("123456SP");
  });
  it("mantém / e -", () => {
    expect(filterCRM("123456/SP")).toBe("123456/SP");
    expect(filterCRM("SP-123456")).toBe("SP-123456");
  });
  it("limita a 12 caracteres", () => {
    expect(filterCRM("123456789012345")).toBe("123456789012");
  });
});

describe("maskPhone", () => {
  it("formata celular com 11 dígitos", () => {
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
  });
  it("formata fixo com 10 dígitos", () => {
    expect(maskPhone("1134567890")).toBe("(11) 3456-7890");
  });
});

describe("maskCEP", () => {
  it("formata CEP", () => {
    expect(maskCEP("01310100")).toBe("01310-100");
  });
  it("limita a 9 caracteres com máscara", () => {
    expect(maskCEP("0131010099")).toBe("01310-100");
  });
});
