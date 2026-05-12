import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { AuditAction, AuditLogRow } from "@/lib/database.types";

/**
 * Lista de acessos do usuário autenticado.
 * Paciente: vê quem acessou seus dados.
 * Médico:   vê o que ele próprio fez.
 */
export function useMeusAcessos(limit = 100, offset = 0) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["meus-acessos", user?.id, limit, offset],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("meus_acessos", {
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      return (data ?? []) as AuditLogRow[];
    },
  });
}

interface LogAuditParams {
  action: AuditAction | string;
  resourceType?: string | null;
  resourceId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Registra um evento de auditoria LGPD via RPC SECURITY DEFINER.
 * Erros são silenciados (logados no console) para não bloquear o fluxo
 * principal — auditoria nunca pode ser razão para uma operação falhar.
 */
export function useLogAuditEvent() {
  return useMutation({
    mutationFn: async ({
      action,
      resourceType = null,
      resourceId = null,
      targetUserId = null,
      metadata = {},
    }: LogAuditParams) => {
      const { data, error } = await supabase.rpc("log_audit_event", {
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_target_user_id: targetUserId,
        p_metadata: metadata,
      });
      if (error) {
        console.warn("[audit] falha ao registrar evento:", error.message);
        return null;
      }
      return data as string;
    },
  });
}

/** Helper imperativo para uso fora de hooks (effects pontuais). */
export async function logAuditEvent(params: LogAuditParams): Promise<string | null> {
  const { error, data } = await supabase.rpc("log_audit_event", {
    p_action: params.action,
    p_resource_type: params.resourceType ?? null,
    p_resource_id: params.resourceId ?? null,
    p_target_user_id: params.targetUserId ?? null,
    p_metadata: params.metadata ?? {},
  });
  if (error) {
    console.warn("[audit] falha ao registrar evento:", error.message);
    return null;
  }
  return data as string;
}

export function useInvalidateAcessos() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["meus-acessos"] });
}
