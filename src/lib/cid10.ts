/**
 * Atalhos de CID-10 frequentes na atenção ambulatorial. Não é a tabela
 * completa: serve para agilizar a hipótese diagnóstica; códigos fora da
 * lista são digitados livremente no campo.
 */
export interface Cid {
  codigo: string;
  descricao: string;
}

export const CID10_FREQUENTES: Cid[] = [
  { codigo: "A09", descricao: "Diarreia e gastroenterite de origem infecciosa presumível" },
  { codigo: "B34.9", descricao: "Infecção viral não especificada" },
  { codigo: "E03.9", descricao: "Hipotireoidismo não especificado" },
  { codigo: "E10", descricao: "Diabetes mellitus insulinodependente" },
  { codigo: "E11", descricao: "Diabetes mellitus não-insulinodependente" },
  { codigo: "E66.9", descricao: "Obesidade não especificada" },
  { codigo: "E78.5", descricao: "Hiperlipidemia não especificada" },
  { codigo: "F32.9", descricao: "Episódio depressivo não especificado" },
  { codigo: "F41.1", descricao: "Ansiedade generalizada" },
  { codigo: "G43.9", descricao: "Enxaqueca não especificada" },
  { codigo: "G47.0", descricao: "Distúrbios do início e da manutenção do sono (insônias)" },
  { codigo: "H10.9", descricao: "Conjuntivite não especificada" },
  { codigo: "H66.9", descricao: "Otite média não especificada" },
  { codigo: "I10", descricao: "Hipertensão essencial (primária)" },
  { codigo: "I20.9", descricao: "Angina pectoris não especificada" },
  { codigo: "I48", descricao: "Flutter e fibrilação atrial" },
  { codigo: "I50.9", descricao: "Insuficiência cardíaca não especificada" },
  { codigo: "J00", descricao: "Nasofaringite aguda (resfriado comum)" },
  { codigo: "J02.9", descricao: "Faringite aguda não especificada" },
  { codigo: "J06.9", descricao: "Infecção aguda das vias aéreas superiores não especificada" },
  { codigo: "J18.9", descricao: "Pneumonia não especificada" },
  { codigo: "J44.9", descricao: "Doença pulmonar obstrutiva crônica não especificada" },
  { codigo: "J45.9", descricao: "Asma não especificada" },
  { codigo: "K21.9", descricao: "Doença de refluxo gastroesofágico sem esofagite" },
  { codigo: "K29.7", descricao: "Gastrite não especificada" },
  { codigo: "K59.0", descricao: "Constipação" },
  { codigo: "L30.9", descricao: "Dermatite não especificada" },
  { codigo: "M25.5", descricao: "Dor articular" },
  { codigo: "M54.2", descricao: "Cervicalgia" },
  { codigo: "M54.5", descricao: "Dor lombar baixa" },
  { codigo: "M79.1", descricao: "Mialgia" },
  { codigo: "N18.9", descricao: "Doença renal crônica não especificada" },
  { codigo: "N39.0", descricao: "Infecção do trato urinário de localização não especificada" },
  { codigo: "R05", descricao: "Tosse" },
  { codigo: "R10.4", descricao: "Outras dores abdominais e as não especificadas" },
  { codigo: "R11", descricao: "Náusea e vômitos" },
  { codigo: "R42", descricao: "Tontura e instabilidade" },
  { codigo: "R50.9", descricao: "Febre não especificada" },
  { codigo: "R51", descricao: "Cefaleia" },
  { codigo: "R53", descricao: "Mal-estar, fadiga" },
  { codigo: "U07.1", descricao: "COVID-19, vírus identificado" },
  { codigo: "Z00.0", descricao: "Exame médico geral" },
  { codigo: "Z76.0", descricao: "Emissão de prescrição de repetição" },
];

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscarCid(termo: string, limite = 6): Cid[] {
  const q = normalizar(termo.trim());
  if (q.length < 2) return [];
  return CID10_FREQUENTES.filter(
    (c) => normalizar(c.codigo).startsWith(q) || normalizar(c.descricao).includes(q),
  ).slice(0, limite);
}
