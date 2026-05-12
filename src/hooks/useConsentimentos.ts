import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { ConsentimentoRow, ConsentimentoTipo } from "@/lib/database.types";

/**
 * Versão atual dos termos. Bump quando o texto mudar — usuários verão
 * "termo desatualizado" e precisarão reaceitar.
 */
export const TERMOS_VERSAO = {
  termos_uso: "1.0",
  politica_privacidade: "1.0",
  tratamento_saude: "1.0",
  compartilhamento_medicos: "1.0",
  comunicacoes_marketing: "1.0",
} as const satisfies Record<ConsentimentoTipo, string>;

export const CONSENTIMENTOS_OBRIGATORIOS: ConsentimentoTipo[] = [
  "termos_uso",
  "politica_privacidade",
  "tratamento_saude",
];

export function useMeusConsentimentos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["meus-consentimentos", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("meus_consentimentos");
      if (error) throw error;
      return (data ?? []) as ConsentimentoRow[];
    },
  });
}

interface RegistrarConsentimentoInput {
  tipo: ConsentimentoTipo | string;
  versao?: string;
  aceito: boolean;
}

export function useRegistrarConsentimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipo, versao, aceito }: RegistrarConsentimentoInput) => {
      const versaoFinal =
        versao ?? TERMOS_VERSAO[tipo as ConsentimentoTipo] ?? "1.0";
      const userAgent =
        typeof navigator !== "undefined" ? navigator.userAgent : null;
      const { data, error } = await supabase.rpc("registrar_consentimento", {
        p_tipo: tipo,
        p_versao_termo: versaoFinal,
        p_aceito: aceito,
        p_ip_address: null, // IP só é confiável via servidor — deixar null.
        p_user_agent: userAgent,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meus-consentimentos"] });
      qc.invalidateQueries({ queryKey: ["meus-acessos"] });
    },
  });
}

/** Registra uma lista de consentimentos sequencialmente (ex: pós-cadastro). */
export async function registrarConsentimentosLote(
  itens: { tipo: ConsentimentoTipo | string; aceito: boolean; versao?: string }[],
): Promise<void> {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
  for (const item of itens) {
    const versao =
      item.versao ?? TERMOS_VERSAO[item.tipo as ConsentimentoTipo] ?? "1.0";
    const { error } = await supabase.rpc("registrar_consentimento", {
      p_tipo: item.tipo,
      p_versao_termo: versao,
      p_aceito: item.aceito,
      p_ip_address: null,
      p_user_agent: userAgent,
    });
    if (error) {
      console.warn(`[consent] falha em ${item.tipo}:`, error.message);
    }
  }
}
