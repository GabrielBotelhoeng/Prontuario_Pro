-- ============================================================
-- Migration 014: LGPD — Termos e consentimentos
-- ============================================================
-- Pré-requisitos: 001-013 já aplicadas.
-- Esta migration é idempotente.
-- ============================================================
-- Objetivo (LGPD arts. 7º I, 8º e 18 IX):
--   Registrar o consentimento livre, informado e inequívoco do
--   titular, com versionamento do termo aceito. Permite revogar.
--
-- Tipos previstos (não exaustivos — slug livre):
--   • 'termos_uso'             — Termos de Uso da plataforma
--   • 'politica_privacidade'   — Política de Privacidade
--   • 'tratamento_saude'       — Tratamento de dados sensíveis (saúde)
--   • 'compartilhamento_medicos' — Médicos vinculados acessarem prontuário
--   • 'comunicacoes_marketing' — Comunicação não essencial (opcional)
--
-- Cada novo consentimento (mesmo tipo, nova versão) entra como
-- novo registro. Revogação atualiza o registro vigente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consentimentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,
  versao_termo  TEXT NOT NULL,
  aceito        BOOLEAN NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revogado_em   TIMESTAMPTZ,
  CONSTRAINT consentimentos_unico_por_versao UNIQUE (user_id, tipo, versao_termo)
);

COMMENT ON TABLE public.consentimentos IS
  'LGPD: registro versionado de consentimento por titular e tipo de tratamento.';

CREATE INDEX IF NOT EXISTS idx_consentimentos_user_tipo
  ON public.consentimentos (user_id, tipo, criado_em DESC);

ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_select_own" ON public.consentimentos;
CREATE POLICY "consent_select_own"
  ON public.consentimentos FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE somente via RPC (SECURITY DEFINER).

-- ─────────────────────────────────────────────────────────────
-- RPC: registrar_consentimento
--   Upsert: se já existe (user_id, tipo, versao) atualiza aceito;
--   senão cria novo. Aceita aceito=false para revogação explícita
--   da versão informada.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.registrar_consentimento(
  p_tipo         TEXT,
  p_versao_termo TEXT,
  p_aceito       BOOLEAN,
  p_ip_address   TEXT DEFAULT NULL,
  p_user_agent   TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_id     UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '28000';
  END IF;

  IF p_tipo IS NULL OR p_versao_termo IS NULL THEN
    RAISE EXCEPTION 'Tipo e versao_termo são obrigatórios.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.consentimentos
    (user_id, tipo, versao_termo, aceito, ip_address, user_agent, revogado_em)
  VALUES
    (v_uid, p_tipo, p_versao_termo, p_aceito, p_ip_address, p_user_agent,
     CASE WHEN p_aceito THEN NULL ELSE now() END)
  ON CONFLICT (user_id, tipo, versao_termo) DO UPDATE
    SET aceito       = EXCLUDED.aceito,
        ip_address   = COALESCE(EXCLUDED.ip_address, public.consentimentos.ip_address),
        user_agent   = COALESCE(EXCLUDED.user_agent, public.consentimentos.user_agent),
        revogado_em  = CASE WHEN EXCLUDED.aceito THEN NULL ELSE now() END
  RETURNING id INTO v_id;

  -- Audita evento de consentimento (LGPD art. 37).
  PERFORM public.log_audit_event(
    CASE WHEN p_aceito THEN 'consentimento_aceito' ELSE 'consentimento_revogado' END,
    'consentimento',
    v_id,
    v_uid,
    jsonb_build_object('tipo', p_tipo, 'versao', p_versao_termo)
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_consentimento(text, text, boolean, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.registrar_consentimento(text, text, boolean, text, text) IS
  'Registra/atualiza consentimento do auth.uid() corrente. Aceita revogação (aceito=false).';

-- ─────────────────────────────────────────────────────────────
-- RPC: meus_consentimentos
--   Retorna o registro mais recente por tipo (vigente ou revogado).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meus_consentimentos()
RETURNS TABLE (
  id            UUID,
  tipo          TEXT,
  versao_termo  TEXT,
  aceito        BOOLEAN,
  criado_em     TIMESTAMPTZ,
  revogado_em   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT DISTINCT ON (c.tipo)
           c.id, c.tipo, c.versao_termo, c.aceito, c.criado_em, c.revogado_em
      FROM public.consentimentos c
     WHERE c.user_id = v_uid
     ORDER BY c.tipo, c.criado_em DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.meus_consentimentos() TO authenticated;
