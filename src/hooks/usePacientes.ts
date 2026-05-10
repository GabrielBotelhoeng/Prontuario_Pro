import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Paciente, Medico } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";

export interface PacienteDoMedico {
  id: string;
  cpf: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  data_nascimento: string | null;
  medico_principal_id: string | null;
  ultima_consulta: string | null;
}

const PACIENTE_SELECT = "*, profile:profiles(nome, email, avatar_url)";
const MEDICO_SELECT = "*, profile:profiles(nome, email, avatar_url)";

export function useMeusPacientes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pacientes", "do-medico", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select(PACIENTE_SELECT)
        .or(`medico_principal_id.eq.${user!.id}`);
      if (error) throw error;
      return data as (Paciente & { profile: { nome: string; email: string; avatar_url: string | null } })[];
    },
  });
}

export function useTodosMedicos() {
  return useQuery({
    queryKey: ["medicos", "lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicos")
        .select(MEDICO_SELECT)
        .order("especialidade");
      if (error) throw error;
      return data as (Medico & { profile: { nome: string; email: string; avatar_url: string | null } })[];
    },
  });
}

/**
 * Lista unificada de pacientes do médico autenticado:
 * união de pacientes com medico_principal_id = me + pacientes com consulta comigo.
 * Resolve o problema de paciente recém-cadastrado não aparecer antes da 1ª consulta.
 */
export function usePacientesDoMedico() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pacientes", "do-medico-rpc", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pacientes_do_medico");
      if (error) throw error;
      return (data ?? []) as PacienteDoMedico[];
    },
  });
}

export function useVincularPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cpf: string) => {
      const { data, error } = await supabase.rpc("vincular_paciente_por_cpf", {
        p_cpf: cpf,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { id: string; cpf: string; nome: string; email: string; medico_principal_id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pacientes"] }),
  });
}

export function usePacienteByConsultas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pacientes", "via-consultas", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(`paciente:pacientes(${PACIENTE_SELECT})`)
        .eq("medico_id", user!.id);
      if (error) throw error;
      const unique = new Map<string, Paciente>();
      data?.forEach((c: { paciente?: Paciente & { profile: { nome: string; email: string; avatar_url: string | null } } }) => {
        if (c.paciente) unique.set(c.paciente.id, c.paciente);
      });
      return Array.from(unique.values()) as (Paciente & { profile: { nome: string; email: string; avatar_url: string | null } })[];
    },
  });
}
