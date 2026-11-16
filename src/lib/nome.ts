const TITULOS = new Set(["dr", "dra", "prof", "profa", "sr", "sra"]);

/**
 * Nome curto para saudações: o primeiro nome, mantendo o título quando a
 * administração cadastra "Dra. Helena Duarte" (→ "Dra. Helena", não "Dra.").
 */
export function primeiroNome(nome: string | null | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const ehTitulo = TITULOS.has(partes[0].replace(/\.$/, "").toLowerCase());
  if (ehTitulo && partes.length > 1) return `${partes[0]} ${partes[1]}`;
  return partes[0];
}

/** "Dr(a). Nome" — sem duplicar o título quando ele já faz parte do cadastro. */
export function nomeMedico(nome: string | null | undefined): string {
  const limpo = (nome ?? "").trim();
  if (!limpo) return "—";
  const primeira = limpo.split(/\s+/)[0].replace(/\.$/, "").toLowerCase();
  return TITULOS.has(primeira) ? limpo : `Dr(a). ${limpo}`;
}
