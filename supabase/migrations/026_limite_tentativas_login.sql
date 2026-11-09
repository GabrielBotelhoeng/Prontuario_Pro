-- ============================================================
-- Migration 026: limite de tentativas no login por CRM/CPF
-- ============================================================
-- login_lookup é chamada direto pela API (anon) e não passa pelo
-- limite do Supabase Auth: dava para testar senhas sem parar contra
-- um CPF. Agora: 5 falhas em 15 min → bloqueio de 15 min, com erro
-- HTTP 429 (SQLSTATE PT429). O contador é por identificador
-- normalizado (hash), exista ou não a conta — não revela cadastro.
-- Falhas e bloqueios de contas reais vão para a auditoria (a pessoa
-- vê em "Meus acessos").
-- ============================================================

CREATE TABLE IF NOT EXISTS public.login_tentativas (
  chave          TEXT PRIMARY KEY,          -- sha256("tipo:identificador normalizado")
  falhas         INT NOT NULL DEFAULT 0,
  primeira_falha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bloqueado_ate  TIMESTAMPTZ
);

ALTER TABLE public.login_tentativas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_tentativas FROM anon, authenticated;
-- Sem policies: só login_lookup (SECURITY DEFINER) lê e escreve.

CREATE OR REPLACE FUNCTION public.login_lookup(
  p_identifier text,
  p_tipo text,
  p_password text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  c_max_falhas CONSTANT INT := 5;
  c_janela     CONSTANT INTERVAL := '15 minutes';
  c_bloqueio   CONSTANT INTERVAL := '15 minutes';
  v_norm  TEXT;
  v_chave TEXT;
  v_reg   public.login_tentativas%ROWTYPE;
  v_user_id UUID;
  v_email TEXT;
  v_hash  TEXT;
  v_ok    BOOLEAN := FALSE;
BEGIN
  IF p_tipo NOT IN ('medico', 'paciente') THEN
    RETURN NULL;
  END IF;

  v_norm := CASE
              WHEN p_tipo = 'medico' THEN upper(regexp_replace(COALESCE(p_identifier, ''), '[^0-9A-Za-z]', '', 'g'))
              ELSE regexp_replace(COALESCE(p_identifier, ''), '[^0-9]', '', 'g')
            END;
  v_chave := encode(digest(p_tipo || ':' || v_norm, 'sha256'), 'hex');

  SELECT * INTO v_reg FROM public.login_tentativas WHERE chave = v_chave FOR UPDATE;
  IF FOUND AND v_reg.bloqueado_ate IS NOT NULL AND v_reg.bloqueado_ate > NOW() THEN
    RAISE EXCEPTION 'Muitas tentativas de acesso. Tente novamente em % minuto(s).',
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reg.bloqueado_ate - NOW())) / 60)::int)
      USING ERRCODE = 'PT429';
  END IF;

  IF p_tipo = 'medico' THEN
    SELECT m.id INTO v_user_id
    FROM public.medicos m
    JOIN public.profiles p ON p.id = m.id AND p.ativo
    WHERE upper(regexp_replace(m.crm, '[^0-9A-Za-z]', '', 'g')) = v_norm;
  ELSE
    SELECT pa.id INTO v_user_id
    FROM public.pacientes pa
    JOIN public.profiles p ON p.id = pa.id AND p.ativo
    WHERE regexp_replace(pa.cpf, '[^0-9]', '', 'g') = v_norm;
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT u.email, u.encrypted_password INTO v_email, v_hash
    FROM auth.users u WHERE u.id = v_user_id;
  END IF;

  IF v_hash IS NULL THEN
    PERFORM crypt(p_password, gen_salt('bf', 10));  -- custo comparável (anti-timing)
  ELSE
    v_ok := v_hash = crypt(p_password, v_hash);
  END IF;

  IF v_ok THEN
    DELETE FROM public.login_tentativas WHERE chave = v_chave;
    RETURN v_email;
  END IF;

  -- Falha: conta na janela (recomeça após a janela ou após um bloqueio vencido).
  INSERT INTO public.login_tentativas AS t (chave, falhas, primeira_falha)
  VALUES (v_chave, 1, NOW())
  ON CONFLICT (chave) DO UPDATE SET
    falhas = CASE WHEN t.primeira_falha < NOW() - c_janela OR t.bloqueado_ate IS NOT NULL
                  THEN 1 ELSE t.falhas + 1 END,
    primeira_falha = CASE WHEN t.primeira_falha < NOW() - c_janela OR t.bloqueado_ate IS NOT NULL
                          THEN NOW() ELSE t.primeira_falha END,
    bloqueado_ate = NULL
  RETURNING * INTO v_reg;

  IF v_reg.falhas >= c_max_falhas THEN
    UPDATE public.login_tentativas SET bloqueado_ate = NOW() + c_bloqueio WHERE chave = v_chave;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (actor_id, actor_tipo, action, resource_type, target_user_id, metadata)
    VALUES (
      NULL, 'system',
      CASE WHEN v_reg.falhas >= c_max_falhas THEN 'login_bloqueado' ELSE 'login_falha' END,
      'login', v_user_id,
      jsonb_build_object('tipo', p_tipo, 'falhas', v_reg.falhas)
    );
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.login_lookup(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_lookup(text, text, text) TO anon, authenticated;
