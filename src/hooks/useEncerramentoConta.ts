import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { SolicitacaoEncerramento } from "@/lib/database.types";

/**
 * Solicitação de encerramento mais recente do usuário autenticado.
 * Retorna `null` se nenhuma foi feita ainda.
 */
export function useMinhaSolicitacaoEncerramento() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["solicitacao-encerramento", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "minha_solicitacao_encerramento",
      );
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as SolicitacaoEncerramento | null;
    },
  });
}

/**
 * Cria pedido de encerramento de conta (LGPD art. 18 VI).
 * O backend audita via log_audit_event e impede pedidos duplicados pendentes.
 */
export function useSolicitarEncerramento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (motivo: string | null) => {
      const { data, error } = await supabase.rpc(
        "solicitar_encerramento_conta",
        { p_motivo: motivo },
      );
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacao-encerramento"] });
      qc.invalidateQueries({ queryKey: ["meus-acessos"] });
    },
  });
}
