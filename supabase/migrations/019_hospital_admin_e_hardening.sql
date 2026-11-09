-- ============================================================
-- Migration 019: Modelo hospitalar (papel admin) + hardening
-- ============================================================
-- Pré-requisitos: 001-018 já aplicadas. Idempotente.
--
-- Contexto: o Prontuário-Pro passa a operar como sistema de um
-- hospital. Contas de profissionais e pacientes são provisionadas
-- pela administração (Edge Function 'admin-usuarios'), não mais por
-- autocadastro público.
--
-- Correções de segurança:
--   1. upsert_user_profile aceitava p_tipo do cliente → qualquer
--      paciente autenticado podia se promover a médico. REMOVIDA.
--   2. handle_new_user confiava em raw_user_meta_data->>'tipo'
--      (controlado pelo cliente no signUp). Agora o papel vem de
--      raw_app_meta_data, que só o service_role consegue definir.
--   3. users_update_own_profile permitia alterar a própria coluna
--      'tipo'. Trigger guard bloqueia mudanças de papel/ativo.
--   4. Auto-confirmação de e-mail removida do trigger: contas
--      provisionadas já nascem confirmadas pela Admin API.
--
-- Novidades:
--   • profiles.tipo aceita 'admin'
--   • profiles.ativo / profiles.precisa_trocar_senha
--   • is_admin() + policies de leitura administrativa
--   • marcar_senha_trocada() para o fluxo de primeiro acesso
--   • promover_admin(email) — bootstrap via SQL Editor (postgres)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Papel admin e novas colunas
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.audit_logs'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%actor_tipo%'
  LOOP
    EXECUTE format('ALTER TABLE public.audit_logs DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tipo_check CHECK (tipo IN ('medico', 'paciente', 'admin'));

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_actor_tipo_check
  CHECK (actor_tipo IN ('medico', 'paciente', 'admin', 'system'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS precisa_trocar_senha BOOLEAN NOT NULL DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────
-- 2. is_admin()
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND tipo = 'admin' AND ativo
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Guard: usuário comum não altera papel nem status da conta
--    (service_role / postgres passam, pois current_user difere)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_profile_privilegios()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
      RAISE EXCEPTION 'Alteração de papel não permitida.' USING ERRCODE = '42501';
    END IF;
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
      RAISE EXCEPTION 'Alteração de status da conta não permitida.' USING ERRCODE = '42501';
    END IF;
    IF NEW.precisa_trocar_senha IS DISTINCT FROM OLD.precisa_trocar_senha THEN
      RAISE EXCEPTION 'Use marcar_senha_trocada().' USING ERRCODE = '42501';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Alteração de e-mail não permitida.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privilegios ON public.profiles;
CREATE TRIGGER trg_guard_profile_privilegios
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilegios();

-- ─────────────────────────────────────────────────────────────
-- 4. Remove RPC vulnerável de autopromoção
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.upsert_user_profile(text, text, text, text);
DROP FUNCTION IF EXISTS public.upsert_user_profile(text, text, text);

-- ─────────────────────────────────────────────────────────────
-- 5. handle_new_user — papel vem de app_metadata (service_role)
--    Contas sem provisionamento caem como 'paciente' sem privilégio.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome          TEXT;
  v_tipo          TEXT;
  v_documento     TEXT;
  v_especialidade TEXT;
  v_trocar_senha  BOOLEAN;
BEGIN
  v_nome          := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''), 'Usuário');
  v_tipo          := COALESCE(NULLIF(TRIM(NEW.raw_app_meta_data->>'tipo'), ''), 'paciente');
  v_documento     := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'documento'), ''), '');
  v_especialidade := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'especialidade'), ''), 'Clínica Geral');
  v_trocar_senha  := COALESCE((NEW.raw_app_meta_data->>'precisa_trocar_senha')::boolean, FALSE);

  IF v_tipo NOT IN ('medico', 'paciente', 'admin') THEN
    v_tipo := 'paciente';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, nome, email, tipo, precisa_trocar_senha)
    VALUES (NEW.id, v_nome, NEW.email, v_tipo, v_trocar_senha)
    ON CONFLICT (id) DO UPDATE
      SET nome  = EXCLUDED.nome,
          email = EXCLUDED.email,
          tipo  = EXCLUDED.tipo,
          precisa_trocar_senha = EXCLUDED.precisa_trocar_senha;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: profiles insert failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;

  IF v_tipo = 'medico' THEN
    BEGIN
      INSERT INTO public.medicos (id, crm, especialidade)
      VALUES (
        NEW.id,
        UPPER(regexp_replace(v_documento, '[^0-9A-Za-z]', '', 'g')),
        v_especialidade
      )
      ON CONFLICT (id) DO UPDATE
        SET crm = EXCLUDED.crm,
            especialidade = EXCLUDED.especialidade;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: medicos insert failed for %: %', NEW.id, SQLERRM;
    END;
  ELSIF v_tipo = 'paciente' AND v_documento <> '' THEN
    BEGIN
      INSERT INTO public.pacientes (id, cpf)
      VALUES (NEW.id, regexp_replace(v_documento, '[^0-9]', '', 'g'))
      ON CONFLICT (id) DO UPDATE
        SET cpf = EXCLUDED.cpf;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: pacientes insert failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Login: contas desativadas não resolvem e-mail
-- ─────────────────────────────────────────────────────────────
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
    JOIN public.profiles p ON p.id = m.id AND p.ativo
    WHERE upper(regexp_replace(m.crm, '[^0-9A-Za-z]', '', 'g'))
        = upper(regexp_replace(p_identifier, '[^0-9A-Za-z]', '', 'g'));
  ELSIF p_tipo = 'paciente' THEN
    SELECT pa.id INTO v_user_id
    FROM public.pacientes pa
    JOIN public.profiles p ON p.id = pa.id AND p.ativo
    WHERE regexp_replace(pa.cpf, '[^0-9]', '', 'g')
        = regexp_replace(p_identifier, '[^0-9]', '', 'g');
  ELSE
    RETURN NULL;
  END IF;

  IF v_user_id IS NULL THEN
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

-- ─────────────────────────────────────────────────────────────
-- 7. Primeiro acesso: usuário marca que já trocou a senha
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.marcar_senha_trocada()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles
  SET precisa_trocar_senha = FALSE, updated_at = NOW()
  WHERE id = auth.uid();
  PERFORM public.log_audit_event('senha_alterada', 'profile', auth.uid(), auth.uid(), '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_senha_trocada() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_senha_trocada() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8. Policies administrativas (somente leitura + update de perfil)
--    Escrita sensível (criar/desativar conta) fica na Edge Function.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_select_profiles" ON public.profiles;
CREATE POLICY "admin_select_profiles"
  ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
CREATE POLICY "admin_update_profiles"
  ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_medicos" ON public.medicos;
CREATE POLICY "admin_select_medicos"
  ON public.medicos FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_medicos" ON public.medicos;
CREATE POLICY "admin_update_medicos"
  ON public.medicos FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_pacientes" ON public.pacientes;
CREATE POLICY "admin_select_pacientes"
  ON public.pacientes FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_pacientes" ON public.pacientes;
CREATE POLICY "admin_update_pacientes"
  ON public.pacientes FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_select_audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 9. Bootstrap do primeiro admin (executar no SQL Editor):
--      SELECT public.promover_admin('ti@hospital.com.br');
--    Sem GRANT para anon/authenticated → só postgres/service_role.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.promover_admin(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower(trim(p_email));
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Usuário % não encontrado em auth.users.', p_email;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"tipo":"admin"}'::jsonb,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = v_id;

  INSERT INTO public.profiles (id, nome, email, tipo)
  SELECT v_id, COALESCE(u.raw_user_meta_data->>'nome', 'Administrador'), u.email, 'admin'
  FROM auth.users u WHERE u.id = v_id
  ON CONFLICT (id) DO UPDATE SET tipo = 'admin', ativo = TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.promover_admin(text) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.promover_admin(text) IS
  'Bootstrap: promove um usuário existente a administrador. Executar apenas no SQL Editor.';
