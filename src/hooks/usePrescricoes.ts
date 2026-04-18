import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Prescricao, MedicamentoItem } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prescricoes"] }),
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
