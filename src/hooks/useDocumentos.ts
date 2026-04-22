import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Documento } from "@/lib/database.types";
import { useAuth } from "@/contexts/AuthContext";

const TIPOS_ACEITOS = ["pdf", "jpg", "jpeg", "png"] as const;
const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20 MB

export function validarArquivo(arquivo: File): string | null {
  const ext = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
  if (!TIPOS_ACEITOS.includes(ext as typeof TIPOS_ACEITOS[number])) {
    return "Tipo de arquivo inválido. Use PDF, JPG ou PNG.";
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return "Arquivo muito grande. O limite é 20 MB.";
  }
  return null;
}

export function useDocumentosPaciente() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["documentos", "paciente", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("paciente_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Documento[];
    },
  });
}

export function useDocumentosPacienteMedico(pacienteId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["documentos", "medico", user?.id, pacienteId],
    enabled: !!user?.id && !!pacienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Documento[];
    },
  });
}

interface UploadDocumentoParams {
  pacienteId: string;
  arquivo: File;
  nome: string;
  consultaId?: string;
}

export function useUploadDocumento() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pacienteId, arquivo, nome, consultaId }: UploadDocumentoParams) => {
      const ext = arquivo.name.split(".").pop()!.toLowerCase();
      const uuid = crypto.randomUUID();
      const storagePath = `${pacienteId}/${uuid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(storagePath, arquivo, { upsert: false });
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("documentos")
        .insert({
          paciente_id: pacienteId,
          uploaded_by: user!.id,
          consulta_id: consultaId ?? null,
          nome,
          storage_path: storagePath,
          tipo_arquivo: ext,
          tamanho_bytes: arquivo.size,
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from("documentos").remove([storagePath]);
        throw insertError;
      }

      return data as Documento;
    },
    onSuccess: (_data, { pacienteId }) => {
      qc.invalidateQueries({ queryKey: ["documentos", "paciente", pacienteId] });
      qc.invalidateQueries({ queryKey: ["documentos", "medico"] });
      qc.invalidateQueries({ queryKey: ["documentos", "paciente", user?.id] });
    },
  });
}

export function useDeleteDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Documento) => {
      const { error: storageError } = await supabase.storage
        .from("documentos")
        .remove([doc.storage_path]);
      if (storageError) throw storageError;

      const { error } = await supabase
        .from("documentos")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos"] });
    },
  });
}

export async function downloadDocumento(doc: Documento): Promise<void> {
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.storage_path, 3600);
  if (error) throw error;
  window.open(data.signedUrl, "_blank");
}
