import { describe, it, expect } from "vitest";
import { validarArquivo } from "@/hooks/useDocumentos";

function criarArquivo(nome: string, tamanho: number, tipo = "application/pdf"): File {
  const blob = new Blob(["x".repeat(tamanho)], { type: tipo });
  return new File([blob], nome, { type: tipo });
}

describe("validarArquivo", () => {
  it("aceita PDF dentro do limite", () => {
    const arquivo = criarArquivo("exame.pdf", 1024);
    expect(validarArquivo(arquivo)).toBeNull();
  });

  it("aceita JPEG dentro do limite", () => {
    const arquivo = criarArquivo("foto.jpg", 1024, "image/jpeg");
    expect(validarArquivo(arquivo)).toBeNull();
  });

  it("aceita PNG dentro do limite", () => {
    const arquivo = criarArquivo("imagem.png", 1024, "image/png");
    expect(validarArquivo(arquivo)).toBeNull();
  });

  it("rejeita extensão inválida (.docx)", () => {
    const arquivo = criarArquivo("relatorio.docx", 1024);
    expect(validarArquivo(arquivo)).toMatch(/inválido/i);
  });

  it("rejeita extensão inválida (.gif)", () => {
    const arquivo = criarArquivo("animacao.gif", 1024, "image/gif");
    expect(validarArquivo(arquivo)).toMatch(/inválido/i);
  });

  it("rejeita arquivo maior que 20 MB", () => {
    const vinteMbMaisUm = 20 * 1024 * 1024 + 1;
    const arquivo = criarArquivo("grande.pdf", vinteMbMaisUm);
    expect(validarArquivo(arquivo)).toMatch(/20 MB/);
  });

  it("aceita arquivo exatamente em 20 MB", () => {
    const vinteMb = 20 * 1024 * 1024;
    const arquivo = criarArquivo("limite.pdf", vinteMb);
    expect(validarArquivo(arquivo)).toBeNull();
  });
});

describe("padrão de path no Storage", () => {
  it("path segue formato {pacienteId}/{uuid}.{ext}", () => {
    const pacienteId = "123e4567-e89b-12d3-a456-426614174000";
    const uuid = crypto.randomUUID();
    const ext = "pdf";
    const path = `${pacienteId}/${uuid}.${ext}`;

    expect(path).toMatch(
      /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$/
    );
  });
});
