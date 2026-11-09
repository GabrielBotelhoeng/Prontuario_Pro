import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { AuditLog, Profile } from "@/lib/database.types";

export interface UsuarioAdmin extends Profile {
  documento: string | null;
  especialidade: string | null;
}

/** Lista todas as contas (RLS: admin_select_*). Junta CRM/CPF das tabelas especializadas. */
export function useUsuarios() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["admin", "usuarios"],
    enabled: profile?.tipo === "admin",
    queryFn: async (): Promise<UsuarioAdmin[]> => {
      const [perfis, medicos, pacientes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("medicos").select("id, crm, especialidade"),
        supabase.from("pacientes").select("id, cpf"),
      ]);
      if (perfis.error) throw perfis.error;

      const crm = new Map((medicos.data ?? []).map((m) => [m.id, m]));
      const cpf = new Map((pacientes.data ?? []).map((p) => [p.id, p.cpf as string]));

      return (perfis.data as Profile[]).map((p) => ({
        ...p,
        documento: p.tipo === "medico" ? crm.get(p.id)?.crm ?? null : p.tipo === "paciente" ? cpf.get(p.id) ?? null : null,
        especialidade: crm.get(p.id)?.especialidade ?? null,
      }));
    },
  });
}

export interface NovoUsuario {
  tipo: Profile["tipo"];
  nome: string;
  email: string;
  documento?: string;
  especialidade?: string;
}

async function invocarAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-usuarios", { body });
  if (error) {
    // FunctionsHttpError carrega a resposta JSON com a mensagem amigável.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const payload = await ctx.json();
        if (payload?.error) throw new Error(payload.error);
      } catch (inner) {
        if (inner instanceof Error && inner.message) throw inner;
      }
    }
    throw new Error("Serviço de administração indisponível. Verifique se a função admin-usuarios foi publicada.");
  }
  return data as T;
}

export function useCriarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (u: NovoUsuario) =>
      invocarAdmin<{ user_id: string; senha_temporaria: string }>({ action: "criar", ...u }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "usuarios"] }),
  });
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: (userId: string) =>
      invocarAdmin<{ senha_temporaria: string }>({ action: "redefinir_senha", user_id: userId }),
  });
}

export function useDefinirAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ativo }: { userId: string; ativo: boolean }) =>
      invocarAdmin<{ ok: true }>({ action: "definir_ativo", user_id: userId, ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "usuarios"] }),
  });
}

export interface AuditLogAdmin extends AuditLog {
  actor_nome: string | null;
  target_nome: string | null;
}

export function useAuditoriaGeral(limite = 300) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["admin", "auditoria", limite],
    enabled: profile?.tipo === "admin",
    queryFn: async (): Promise<AuditLogAdmin[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limite);
      if (error) throw error;

      const ids = new Set<string>();
      (data as AuditLog[]).forEach((l) => {
        if (l.actor_id) ids.add(l.actor_id);
        if (l.target_user_id) ids.add(l.target_user_id);
      });
      const { data: perfis } = ids.size
        ? await supabase.from("profiles").select("id, nome").in("id", [...ids])
        : { data: [] as { id: string; nome: string }[] };
      const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome]));

      return (data as AuditLog[]).map((l) => ({
        ...l,
        actor_nome: l.actor_id ? nome.get(l.actor_id) ?? null : null,
        target_nome: l.target_user_id ? nome.get(l.target_user_id) ?? null : null,
      }));
    },
  });
}
