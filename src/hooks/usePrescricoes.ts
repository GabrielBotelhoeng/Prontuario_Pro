import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Prescricao, MedicamentoItem } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";
import { logAuditEvent } from "@/hooks/useAuditLogs";

const PRESCRICOES_SELECT = `
  *,
  paciente:pacientes(profile:profiles(nome, email)),
  medico:medicos(crm, especialidade, clinica_nome, profile:profiles(nome, email))
`;

export function usePrescricoesMedico() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["prescricoes", "medico", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescricoes")
        .select(PRESCRICOES_SELECT)
        .eq("medico_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prescricao[];
    },
  });
}

export function usePrescricoesPaciente() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`prescricoes-paciente-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "prescricoes",
          filter: `paciente_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["prescricoes", "paciente", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["prescricoes", "paciente", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescricoes")
        .select(PRESCRICOES_SELECT)
        .eq("paciente_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prescricao[];
    },
  });
}

interface NovaPrescricaoData {
  paciente_id: string;
  tipo_receita: Prescricao["tipo_receita"];
  medicamentos: MedicamentoItem[];
  status: "rascunho" | "finalizada";
  consulta_id?: string;
}

export function useCreatePrescricao() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: NovaPrescricaoData) => {
      const { data: result, error } = await supabase
        .from("prescricoes")
        .insert({ ...data, medico_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result as Prescricao;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["prescricoes"] });
      logAuditEvent({
        action: "prescricao_criada",
        resourceType: "prescricao",
        resourceId: result.id,
        targetUserId: result.paciente_id,
        metadata: { tipo_receita: result.tipo_receita, status: result.status },
      });
    },
  });
}

export function useUpdatePrescricao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<NovaPrescricaoData> & { id: string }) => {
      const { error } = await supabase.from("prescricoes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prescricoes"] }),
  });
}

export interface PrescricaoValidada {
  id: string;
  tipo_receita: Prescricao["tipo_receita"];
  status: Prescricao["status"];
  data_emissao: string;
  medicamentos: MedicamentoItem[];
  medico: {
    nome: string;
    crm: string;
    especialidade: string;
    clinica_nome: string | null;
  };
  paciente_primeiro_nome: string;
}

export function useValidarPrescricao(id: string | undefined) {
  return useQuery({
    queryKey: ["validar-prescricao", id],
    enabled: !!id,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("validar_prescricao", { p_id: id });
      if (error) throw error;
      return (data ?? null) as PrescricaoValidada | null;
    },
  });
}
