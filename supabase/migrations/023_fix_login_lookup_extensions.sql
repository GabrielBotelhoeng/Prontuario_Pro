-- ============================================================
-- Migration 023: login_lookup volta a enxergar pgcrypto
-- ============================================================
-- Regressão da 019: ao recriar login_lookup, o search_path ficou
-- (public, auth, pg_temp) e perdeu o schema "extensions" que a 017
-- tinha incluído. crypt()/gen_salt() deixaram de existir para a
-- função → todo login por CRM/CPF falhava (o front mostrava apenas
-- "Credenciais inválidas"). Encontrado pelos testes E2E.
-- ============================================================

ALTER FUNCTION public.login_lookup(text, text, text)
  SET search_path = public, auth, extensions, pg_temp;
