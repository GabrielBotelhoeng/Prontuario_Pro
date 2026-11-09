/** Sessão encerra após este tempo sem atividade (computadores compartilhados no hospital). */
export const INATIVIDADE_LIMITE_MS = 15 * 60_000;
/** Aviso aparece este tempo antes do encerramento. */
export const INATIVIDADE_AVISO_MS = 2 * 60_000;

export type EstadoSessao = "ativa" | "aviso" | "expirada";

export function estadoSessao(
  ultimaAtividade: number,
  agora: number,
  limite = INATIVIDADE_LIMITE_MS,
  aviso = INATIVIDADE_AVISO_MS,
): EstadoSessao {
  const parado = agora - ultimaAtividade;
  if (parado >= limite) return "expirada";
  if (parado >= limite - aviso) return "aviso";
  return "ativa";
}

export function segundosRestantes(ultimaAtividade: number, agora: number, limite = INATIVIDADE_LIMITE_MS): number {
  return Math.max(0, Math.ceil((limite - (agora - ultimaAtividade)) / 1000));
}
