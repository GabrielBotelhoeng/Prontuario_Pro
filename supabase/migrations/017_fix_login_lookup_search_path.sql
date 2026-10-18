-- ============================================================
-- Migration 017: Conserta login_lookup — pgcrypto fora do search_path
-- ============================================================
-- Problema: a função criada em 012 declarava
--   SET search_path TO 'public','auth','pg_temp'
-- mas o pgcrypto (que provê crypt() / gen_salt()) está no schema
-- 'extensions'. Resultado: chamadas a crypt() falhavam com
-- "function crypt(text, text) does not exist", e qualquer login
-- (CRM ou CPF) retornava NULL — front exibia "Credenciais inválidas"
-- mesmo com senha correta.
--
-- Correção: incluir 'extensions' no search_path da função.
-- Idempotente: pode ser reexecutada sem dano.
-- ============================================================

CREATE OR REPLACE FUNCTION public.login_lookup(
  p_identifier text,
  p_tipo       text,
  p_password   text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $$
DECLARE
  v_user_id       uuid;
  v_email         text;
  v_password_hash text;
BEGIN
  IF p_tipo = 'medico' THEN
    SELECT m.id INTO v_user_id
    FROM public.medicos m
    WHERE upper(regexp_replace(m.crm, '[^0-9A-Za-z]', '', 'g'))
        = upper(regexp_replace(p_identifier, '[^0-9A-Za-z]', '', 'g'));
  ELSIF p_tipo = 'paciente' THEN
    SELECT pa.id INTO v_user_id
    FROM public.pacientes pa
    WHERE regexp_replace(pa.cpf, '[^0-9]', '', 'g')
        = regexp_replace(p_identifier, '[^0-9]', '', 'g');
  ELSE
    RETURN NULL;
  END IF;

  IF v_user_id IS NULL THEN
    -- Mantém custo de CPU comparável ao caso "senha errada" (anti-enumeration).
    PERFORM crypt(p_password, gen_salt('bf', 10));
    RETURN NULL;
  END IF;

  SELECT u.email, u.encrypted_password
  INTO v_email, v_password_hash
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_password_hash IS NULL THEN
    PERFORM crypt(p_password, gen_salt('bf', 10));
    RETURN NULL;
  END IF;

  IF v_password_hash = crypt(p_password, v_password_hash) THEN
    RETURN v_email;
  END IF;

  RETURN NULL;
END;
$$;
