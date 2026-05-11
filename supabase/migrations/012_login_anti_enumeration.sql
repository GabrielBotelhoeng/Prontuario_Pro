-- ============================================================
-- Migration 012: Anti-enumeration no login (CRM/CPF)
-- ============================================================
-- Pré-requisitos: 001-011 já aplicadas.
-- Esta migration é idempotente.
-- ============================================================
-- Problema: as RPCs get_email_by_crm/get_email_by_cpf retornavam
-- o e-mail sempre que o identificador existia. Um atacante
-- conseguia enumerar quais CRMs/CPFs estão cadastrados (vazamento
-- LGPD).
--
-- Solução: nova RPC `login_lookup` que recebe (identificador, tipo,
-- senha) e SÓ retorna o e-mail quando a senha confere com o hash
-- bcrypt em `auth.users.encrypted_password`. Em qualquer outro
-- caso (identificador inexistente OU senha errada) retorna NULL.
-- Atacante não consegue mais distinguir os dois cenários.
--
-- Também emula trabalho criptográfico (PERFORM crypt(...)) quando
-- o identificador não existe, para mitigar timing side-channel.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.login_lookup(
  p_identifier text,
  p_tipo text,
  p_password text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
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
    -- Mantém custo de CPU comparável ao caso "senha errada"
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

REVOKE ALL ON FUNCTION public.login_lookup(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_lookup(text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.login_lookup(text, text, text) IS
  'Resolução segura de e-mail para login por CRM/CPF. Só retorna e-mail quando a senha confere. Anti-enumeration.';

-- Remove RPCs antigas que vazavam existência do identificador.
DROP FUNCTION IF EXISTS public.get_email_by_cpf(text);
DROP FUNCTION IF EXISTS public.get_email_by_crm(text);
