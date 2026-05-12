-- ============================================================
-- Migration 013: LGPD — Log de auditoria de acessos
-- ============================================================
-- Pré-requisitos: 001-012 já aplicadas.
-- Esta migration é idempotente.
-- ============================================================
-- Objetivo (LGPD art. 37 — registro de operações de tratamento):
--   Manter trilha de auditoria de quem acessou/modificou dados
--   pessoais sensíveis (prontuários, prescrições, anamneses,
--   documentos), por quanto tempo, e a partir de qual contexto.
--
-- Modelo:
--   • audit_logs(actor_id, action, resource_type, resource_id,
--                target_user_id, metadata, created_at)
--   • actor_id  = quem executou (auth.uid()).
--   • target_user_id = titular dos dados (paciente cujo prontuário
--     foi acessado). Permite paciente ler seu próprio histórico
--     de acessos.
--
-- RLS:
--   • Paciente: SELECT onde target_user_id = auth.uid().
--   • Médico:   SELECT onde actor_id      = auth.uid().
--   • INSERT só via RPC log_audit_event (SECURITY DEFINER).
--
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_tipo      TEXT CHECK (actor_tipo IN ('medico','paciente','system')),
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     UUID,
  target_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS
  'LGPD art. 37: trilha de auditoria de acesso a dados pessoais sensíveis.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_target_created
  ON public.audit_logs (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
  ON public.audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON public.audit_logs (resource_type, resource_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_target_or_actor" ON public.audit_logs;
CREATE POLICY "audit_select_target_or_actor"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid()
    OR actor_id    = auth.uid()
  );

-- Nenhuma policy de INSERT/UPDATE/DELETE → só SECURITY DEFINER.
-- Garante imutabilidade da trilha pelo cliente.

-- ─────────────────────────────────────────────────────────────
-- RPC: log_audit_event
--   Insere um registro de auditoria em nome do auth.uid() atual.
--   Resolve actor_tipo automaticamente via profiles.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action          TEXT,
  p_resource_type   TEXT DEFAULT NULL,
  p_resource_id     UUID DEFAULT NULL,
  p_target_user_id  UUID DEFAULT NULL,
  p_metadata        JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor    UUID := auth.uid();
  v_tipo     TEXT;
  v_log_id   UUID;
BEGIN
  IF v_actor IS NULL THEN
    -- Eventos sem sessão (ex: login falho via RPC) registram como 'system'.
    v_tipo := 'system';
  ELSE
    SELECT tipo INTO v_tipo FROM public.profiles WHERE id = v_actor;
    v_tipo := COALESCE(v_tipo, 'system');
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_tipo, action, resource_type,
    resource_id, target_user_id, metadata
  ) VALUES (
    v_actor, v_tipo, p_action, p_resource_type,
    p_resource_id, p_target_user_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(text, text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, uuid, jsonb)
  TO authenticated, anon;

COMMENT ON FUNCTION public.log_audit_event(text, text, uuid, uuid, jsonb) IS
  'Registra um evento de auditoria LGPD. Resolve actor_id e actor_tipo via auth.uid().';

-- ─────────────────────────────────────────────────────────────
-- RPC: meus_acessos
--   Retorna trilha de auditoria do titular dos dados (paciente)
--   ou do próprio ator (médico vê o que fez).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meus_acessos(
  p_limit  INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  actor_id      UUID,
  actor_nome    TEXT,
  actor_tipo    TEXT,
  action        TEXT,
  resource_type TEXT,
  resource_id   UUID,
  metadata      JSONB,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_tipo TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT p.tipo INTO v_tipo FROM public.profiles p WHERE p.id = v_uid;

  IF v_tipo = 'paciente' THEN
    RETURN QUERY
      SELECT a.id,
             a.actor_id,
             COALESCE(pr.nome, '(removido)') AS actor_nome,
             a.actor_tipo,
             a.action,
             a.resource_type,
             a.resource_id,
             a.metadata,
             a.created_at
        FROM public.audit_logs a
        LEFT JOIN public.profiles pr ON pr.id = a.actor_id
       WHERE a.target_user_id = v_uid
       ORDER BY a.created_at DESC
       LIMIT p_limit OFFSET p_offset;
  ELSE
    -- Médico ou system: vê o que ele mesmo fez.
    RETURN QUERY
      SELECT a.id,
             a.actor_id,
             COALESCE(pr.nome, '(removido)') AS actor_nome,
             a.actor_tipo,
             a.action,
             a.resource_type,
             a.resource_id,
             a.metadata,
             a.created_at
        FROM public.audit_logs a
        LEFT JOIN public.profiles pr ON pr.id = a.actor_id
       WHERE a.actor_id = v_uid
       ORDER BY a.created_at DESC
       LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.meus_acessos(int, int) TO authenticated;

COMMENT ON FUNCTION public.meus_acessos(int, int) IS
  'LGPD art. 18 II: paciente acessa registro de operações sobre seus dados; médico revisa suas próprias ações.';
