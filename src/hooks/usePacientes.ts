import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Paciente, Medico } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";

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
      data?.forEach((c: any) => {
        if (c.paciente) unique.set(c.paciente.id, c.paciente);
      });
      return Array.from(unique.values()) as (Paciente & { profile: { nome: string; email: string; avatar_url: string | null } })[];
    },
  });
}
