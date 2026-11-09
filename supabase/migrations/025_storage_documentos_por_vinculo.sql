-- ============================================================
-- Migration 025: arquivos de exames só para quem tem vínculo
-- ============================================================
-- Achado dos testes E2E: as policies da 008 liberavam o bucket
-- "documentos" inteiro para QUALQUER usuário logado — outro paciente
-- listava a pasta, baixava exames e até enviava arquivos para a pasta
-- de terceiros. Os caminhos são "<paciente_id>/<uuid>.<ext>".
-- Agora a pasta só é acessível pelo próprio paciente, por médicos com
-- vínculo e pela administração.
-- ============================================================

CREATE OR REPLACE FUNCTION public.pode_acessar_pasta_paciente(p_pasta TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_pasta IS NULL THEN
    RETURN FALSE;
  END IF;
  IF p_pasta = auth.uid()::text OR public.is_admin() THEN
    RETURN TRUE;
  END IF;
  IF p_pasta !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN FALSE;
  END IF;
  RETURN public.medico_tem_vinculo(p_pasta::uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.pode_acessar_pasta_paciente(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_acessar_pasta_paciente(TEXT) TO authenticated;

DROP POLICY IF EXISTS "storage_select_autenticado" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_autenticado" ON storage.objects;
DROP POLICY IF EXISTS "documentos_ler_com_vinculo" ON storage.objects;
DROP POLICY IF EXISTS "documentos_enviar_com_vinculo" ON storage.objects;

CREATE POLICY "documentos_ler_com_vinculo"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND public.pode_acessar_pasta_paciente((storage.foldername(name))[1]));

CREATE POLICY "documentos_enviar_com_vinculo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND public.pode_acessar_pasta_paciente((storage.foldername(name))[1]));
