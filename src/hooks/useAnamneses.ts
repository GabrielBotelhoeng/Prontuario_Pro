import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Anamnese } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";

export function useAnamnesesMedico() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["anamneses", "medico", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamneses")
        .select("*, paciente:pacientes(profile:profiles(nome))")
        .eq("medico_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Anamnese[];
    },
  });
}

export function useAnamnesesPaciente() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["anamneses", "paciente", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamneses")
        .select("*, medico:medicos(crm, especialidade, profile:profiles(nome))")
        .eq("paciente_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Anamnese[];
    },
  });
}

interface SalvarAnamneseData {
  paciente_id: string;
  queixa_principal?: string;
  historia_doenca?: string;
  antecedentes_pessoais?: string;
  antecedentes_familiares?: string;
  medicamentos_uso?: string;
  alergias?: string;
  exame_fisico?: string;
  hipotese_diagnostica?: string;
  conduta?: string;
  sinais_vitais?: Record<string, string>;
  patologias?: string[];
  consulta_id?: string;
}

export function useSalvarAnamnese() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SalvarAnamneseData) => {
      const { data: result, error } = await supabase
        .from("anamneses")
        .insert({ ...data, medico_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result as Anamnese;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["anamneses"] }),
  });
}
