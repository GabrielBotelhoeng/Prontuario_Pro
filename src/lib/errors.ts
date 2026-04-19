const errorMap: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos",
  "User already registered": "Este email já está cadastrado",
  "Email not confirmed": "Confirme seu email antes de fazer login",
  "Password should be at least 6 characters": "Senha deve ter pelo menos 6 caracteres",
  "Invalid email": "Email inválido",
  "signup_disabled": "Cadastros temporariamente desabilitados",
  "email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos.",
};

export function translateSupabaseError(message: string): string {
  for (const [key, translated] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return translated;
  }
  return "Ocorreu um erro. Tente novamente.";
}
