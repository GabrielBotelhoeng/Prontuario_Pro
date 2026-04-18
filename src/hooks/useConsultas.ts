import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Consulta } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";

const CONSULTAS_SELECT = `
  *,
  paciente:pacientes(cpf, profile:profiles(nome, email)),
  medico:medicos(crm, especialidade, clinica_nome, profile:profiles(nome, email))
`;

export function useConsultasMedico() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["consultas", "medico", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(CONSULTAS_SELECT)
        .eq("medico_id", user!.id)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data as Consulta[];
    },
  });
}

export function useConsultasPaciente() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["consultas", "paciente", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(CONSULTAS_SELECT)
        .eq("paciente_id", user!.id)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data as Consulta[];
    },
  });
}

export function useProximaConsultaMedico() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["proxima-consulta", "medico", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(CONSULTAS_SELECT)
        .eq("medico_id", user!.id)
        .in("status", ["Confirmado", "Aguardando", "Em andamento"])
        .gte("data_hora", new Date().toISOString())
        .order("data_hora", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Consulta | null;
    },
  });
}

export function useProximaConsultaPaciente() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["proxima-consulta", "paciente", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(CONSULTAS_SELECT)
        .eq("paciente_id", user!.id)
        .in("status", ["Confirmado", "Aguardando"])
        .gte("data_hora", new Date().toISOString())
        .order("data_hora", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Consulta | null;
    },
  });
}

interface NovaConsultaData {
  paciente_id: string;
  data_hora: string;
  tipo: string;
  observacoes?: string;
  status?: string;
}

export function useCreateConsulta() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: NovaConsultaData) => {
      const { data: result, error } = await supabase
        .from("consultas")
        .insert({ ...data, medico_id: user!.id, status: data.status ?? "Aguardando" })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultas"] });
      qc.invalidateQueries({ queryKey: ["proxima-consulta"] });
    },
  });
}

export function useUpdateConsultaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("consultas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultas"] }),
  });
}
