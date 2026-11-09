import { randomInt, randomUUID } from "node:crypto";

/** Dados fictícios — existem só no banco local dos testes. */

const rodada = Date.now().toString(36);

export function gerarCPF(): { digitos: string; mascarado: string } {
  let base: number[];
  do {
    base = Array.from({ length: 9 }, () => randomInt(10));
  } while (base.every((d) => d === base[0]));
  const dv = (nums: number[]) => {
    const soma = nums.reduce((acc, n, i) => acc + n * (nums.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  const digitos = [...base, d1, d2].join("");
  return { digitos, mascarado: digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") };
}

export function gerarCRM(uf = "SP"): { normalizado: string; mascarado: string } {
  const numero = String(randomInt(100000, 999999));
  return { normalizado: `${numero}${uf}`, mascarado: `${numero}/${uf}` };
}

export function email(papel: string) {
  return `${papel}.${rodada}@prontuario.test`;
}

export function senhaForte() {
  return `E2e-${randomUUID().slice(0, 8)}-9x`;
}

/** Data/hora em Brasília (UTC−3) daqui a N dias, no horário pedido, em ISO. */
export function horarioBrasilia(diasAFrente: number, hora: number, minuto = 0): string {
  const hoje = new Date();
  const alvo = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + diasAFrente, hora + 3, minuto));
  return alvo.toISOString();
}

/** yyyy-MM-dd do dia em Brasília daqui a N dias. */
export function diaBrasilia(diasAFrente: number): string {
  return horarioBrasilia(diasAFrente, 12).slice(0, 10);
}

/** PDF mínimo válido para os testes de documentos. */
export function pdfFicticio(titulo: string): Blob {
  const corpo = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n% ${titulo}\ntrailer<</Root 1 0 R>>\n%%EOF`;
  return new Blob([corpo], { type: "application/pdf" });
}
