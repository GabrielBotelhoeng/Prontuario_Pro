import { describe, it, expect } from "vitest";
import { translateSupabaseError } from "@/lib/errors";

describe("translateSupabaseError", () => {
  it("traduz credenciais inválidas", () => {
    expect(translateSupabaseError("Invalid login credentials")).toBe(
      "Email ou senha incorretos"
    );
  });
  it("traduz email já cadastrado", () => {
    expect(translateSupabaseError("User already registered")).toBe(
      "Este email já está cadastrado"
    );
  });
  it("traduz email não confirmado", () => {
    expect(translateSupabaseError("Email not confirmed")).toBe(
      "Confirme seu email antes de fazer login"
    );
  });
  it("traduz senha curta", () => {
    expect(
      translateSupabaseError("Password should be at least 6 characters")
    ).toBe("Senha deve ter pelo menos 6 caracteres");
  });
  it("retorna mensagem genérica para erros desconhecidos", () => {
    expect(translateSupabaseError("some unknown error xyz")).toBe(
      "Ocorreu um erro. Tente novamente."
    );
  });
  it("funciona com mensagem em casing diferente", () => {
    expect(translateSupabaseError("invalid login credentials")).toBe(
      "Email ou senha incorretos"
    );
  });
});
