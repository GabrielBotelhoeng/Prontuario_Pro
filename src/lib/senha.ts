/** Regras mínimas de senha do hospital. Retorna a primeira violação ou null. */
export function validarSenha(senha: string): string | null {
  if (senha.length < 8) return "A senha deve ter ao menos 8 caracteres.";
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  return null;
}

/** Força estimada 0–4, apenas para feedback visual. */
export function forcaSenha(senha: string): number {
  let f = 0;
  if (senha.length >= 8) f++;
  if (senha.length >= 12) f++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) f++;
  if (/\d/.test(senha) && /[^A-Za-z0-9]/.test(senha)) f++;
  return f;
}
