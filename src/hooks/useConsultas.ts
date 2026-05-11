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

interface SolicitarConsultaData {
  medico_id: string;
  data_hora: string;
  tipo: string;
  observacoes?: string;
}

export function useSolicitarConsulta() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SolicitarConsultaData) => {
      const { data: result, error } = await supabase
        .from("consultas")
        .insert({
          medico_id: data.medico_id,
          paciente_id: user!.id,
          data_hora: data.data_hora,
          tipo: data.tipo,
          observacoes: data.observacoes,
          status: "Aguardando",
        })
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

export function useEstatisticasMedico() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["estatisticas", "medico", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const fimHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

      const { data: consultasMes, error: errMes } = await supabase
        .from("consultas")
        .select("id, paciente_id, status, data_hora")
        .eq("medico_id", user!.id)
        .gte("data_hora", inicioMes)
        .lte("data_hora", fimMes);
      if (errMes) throw errMes;

      const { data: finalizadasHoje, error: errHoje } = await supabase
        .from("consultas")
        .select("id")
        .eq("medico_id", user!.id)
        .eq("status", "Finalizado")
        .gte("data_hora", inicioHoje)
        .lte("data_hora", fimHoje);
      if (errHoje) throw errHoje;

      const { data: anamneses, error: errAnam } = await supabase
        .from("anamneses")
        .select("patologias")
        .eq("medico_id", user!.id);
      if (errAnam) throw errAnam;

      const totalConsultasMes = consultasMes?.length ?? 0;
      const pacientesUnicos = new Set((consultasMes ?? []).map((c) => c.paciente_id)).size;
      const finalizadasNoMes = (consultasMes ?? []).filter((c) => c.status === "Finalizado").length;
      const taxaConclusao = totalConsultasMes > 0 ? Math.round((finalizadasNoMes / totalConsultasMes) * 100) : 0;

      const patologiasCount = new Map<string, number>();
      let totalPatologias = 0;
      (anamneses ?? []).forEach((a: { patologias: string[] | null }) => {
        (a.patologias ?? []).forEach((p) => {
          patologiasCount.set(p, (patologiasCount.get(p) ?? 0) + 1);
          totalPatologias++;
        });
      });
      const distribuicaoPatologias = Array.from(patologiasCount.entries())
        .map(([nome, qtd]) => ({ nome, qtd, percentual: totalPatologias > 0 ? Math.round((qtd / totalPatologias) * 100) : 0 }))
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 6);

      return {
        totalConsultasMes,
        finalizadasHoje: finalizadasHoje?.length ?? 0,
        pacientesUnicos,
        taxaConclusao,
        distribuicaoPatologias,
      };
    },
  });
}
