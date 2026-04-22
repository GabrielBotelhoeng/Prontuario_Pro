-- ============================================================
-- Migration 008: Tabela documentos + bucket Storage + RLS
-- Phase 03: Upload de Exames/Documentos
-- ============================================================

-- 1. Tabela de metadados dos documentos
CREATE TABLE IF NOT EXISTS public.documentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
  uploaded_by   UUID REFERENCES auth.users(id) NOT NULL,
  consulta_id   UUID REFERENCES public.consultas(id) ON DELETE SET NULL,
  nome          TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  tipo_arquivo  TEXT NOT NULL CHECK (tipo_arquivo IN ('pdf', 'jpg', 'jpeg', 'png')),
  tamanho_bytes BIGINT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- 2. RLS na tabela documentos (Postgres)

-- D-02: Paciente vê apenas seus próprios documentos
CREATE POLICY "paciente_select_proprios"
  ON public.documentos FOR SELECT
  TO authenticated
  USING (paciente_id = auth.uid());

-- D-03: Médico vê documentos de pacientes vinculados via medico_principal_id
CREATE POLICY "medico_select_pacientes_vinculados"
  ON public.documentos FOR SELECT
  TO authenticated
  USING (
    paciente_id IN (
      SELECT id FROM public.pacientes WHERE medico_principal_id = auth.uid()
    )
  );

-- D-01: Qualquer autenticado pode inserir (restrição real está no Storage RLS)
-- D-11: uploaded_by deve ser o usuário corrente
CREATE POLICY "autenticado_insert"
  ON public.documentos FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- D-04: Exclusão permitida apenas ao dono do upload
CREATE POLICY "dono_delete"
  ON public.documentos FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- 3. Índices de performance
-- D-13: queries ordenam por paciente_id + created_at DESC
CREATE INDEX IF NOT EXISTS idx_documentos_paciente_id
  ON public.documentos (paciente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documentos_uploaded_by
  ON public.documentos (uploaded_by);

-- 4. Bucket privado no Supabase Storage
-- D-09: limite de 20 MB (20971520 bytes)
-- D-08: tipos aceitos: PDF, JPEG, PNG
-- D-14: bucket chamado 'documentos'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS em storage.objects — camada SEPARADA e obrigatória
-- ATENÇÃO: sem essas policies, uploads retornam 403 mesmo com RLS da tabela correta

-- SELECT: usuário autenticado pode ler objetos do bucket (necessário para createSignedUrl — D-10)
CREATE POLICY "storage_select_autenticado"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos');

-- INSERT: usuário autenticado pode fazer upload (D-01)
CREATE POLICY "storage_insert_autenticado"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos');

-- DELETE: apenas o owner do objeto pode deletar (D-04)
CREATE POLICY "storage_delete_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documentos' AND owner = auth.uid());
