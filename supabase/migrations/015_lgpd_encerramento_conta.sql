-- ============================================================
-- Migration 015: LGPD — Solicitação de encerramento de conta
-- ============================================================
-- Pré-requisitos: 013 (audit_logs + log_audit_event) aplicada.
-- Esta migration é idempotente.
-- ============================================================
-- Objetivo (LGPD art. 18 VI — eliminação dos dados pessoais
-- tratados com o consentimento do titular):
--   Permitir que o titular solicite formalmente o encerramento
--   da conta. A solicitação fica em fila ('pendente') para
--   processamento operacional (anonimização/exclusão) — não
--   apaga dados clínicos automaticamente, pois há retenção
--   exigida por outras bases legais (CFM 1.821/2007 — 20 anos
--   para prontuários).
--
-- Modelo:
--   • solicitacoes_encerramento(user_id, motivo, status, ...)
--   • Status: pendente → processando → concluido | cancelado
--   • Único pedido pendente por usuário (unique index parcial)
--
-- RLS:
--   • Titular: SELECT no próprio pedido.
--   • INSERT só via RPC solicitar_encerramento_conta.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.solicitacoes_encerramento (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo         TEXT,
  status         TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente','processando','concluido','cancelado')),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em  TIMESTAMPTZ
);

COMMENT ON TABLE public.solicitacoes_encerramento IS
  'LGPD art. 18 VI: fila de pedidos de eliminação/encerramento de conta.';

CREATE INDEX IF NOT EXISTS idx_solicitacoes_user
  ON public.solicitacoes_encerramento (user_id, criado_em DESC);

-- Garante no máximo um pedido pendente por usuário.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_solicitacao_pendente
  ON public.solicitacoes_encerramento (user_id)
  WHERE status = 'pendente';

ALTER TABLE public.solicitacoes_encerramento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solicitacao_select_own" ON public.solicitacoes_encerramento;
CREATE POLICY "solicitacao_select_own"
  ON public.solicitacoes_encerramento FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Nenhuma policy de INSERT/UPDATE/DELETE → só via SECURITY DEFINER.

-- ─────────────────────────────────────────────────────────────
-- RPC: solicitar_encerramento_conta
--   Cria um pedido de encerramento e registra audit log.
--   Falha se já existe pendente.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.solicitar_encerramento_conta(
  p_motivo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id   UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.solicitacoes_encerramento
     WHERE user_id = v_user AND status = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Já existe uma solicitação pendente para esta conta';
  END IF;

  INSERT INTO public.solicitacoes_encerramento (user_id, motivo)
  VALUES (v_user, NULLIF(trim(p_motivo), ''))
  RETURNING id INTO v_id;

  PERFORM public.log_audit_event(
    p_action         := 'conta_encerrada',
    p_resource_type  := 'solicitacao_encerramento',
    p_resource_id    := v_id,
    p_target_user_id := v_user,
    p_metadata       := jsonb_build_object('motivo', NULLIF(trim(p_motivo), ''))
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_encerramento_conta(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_encerramento_conta(text) TO authenticated;

COMMENT ON FUNCTION public.solicitar_encerramento_conta(text) IS
  'LGPD art. 18 VI: titular solicita encerramento da conta. Audit-logado.';

-- ─────────────────────────────────────────────────────────────
-- RPC: minha_solicitacao_encerramento
--   Retorna a solicitação mais recente do titular (ou NULL).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.minha_solicitacao_encerramento()
RETURNS TABLE (
  id             UUID,
  motivo         TEXT,
  status         TEXT,
  criado_em      TIMESTAMPTZ,
  processado_em  TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT s.id, s.motivo, s.status, s.criado_em, s.processado_em
    FROM public.solicitacoes_encerramento s
   WHERE s.user_id = auth.uid()
   ORDER BY s.criado_em DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.minha_solicitacao_encerramento() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.minha_solicitacao_encerramento() TO authenticated;

COMMENT ON FUNCTION public.minha_solicitacao_encerramento() IS
  'Retorna a solicitação de encerramento mais recente do titular autenticado.';
