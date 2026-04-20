-- ─────────────────────────────────────────────────────────────
-- 1. Trigger handle_new_user — versão definitiva
--    Melhorias: ON CONFLICT em todas as tabelas, EXCEPTION por bloco,
--    normalização de CPF/CRM antes de inserir, logs detalhados
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome        TEXT;
  v_tipo        TEXT;
  v_documento   TEXT;
  v_especialidade TEXT;
BEGIN
  v_nome        := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''), 'Usuário');
  v_tipo        := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'tipo'), ''), 'paciente');
  v_documento   := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'documento'), ''), '');
  v_especialidade := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'especialidade'), ''), 'Clínica Geral');

  -- Inserir/atualizar profile
  BEGIN
    INSERT INTO public.profiles (id, nome, email, tipo)
    VALUES (NEW.id, v_nome, NEW.email, v_tipo)
    ON CONFLICT (id) DO UPDATE
      SET nome  = EXCLUDED.nome,
          email = EXCLUDED.email,
          tipo  = EXCLUDED.tipo;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: profiles insert failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;

  -- Inserir na tabela especializada
  IF v_tipo = 'medico' THEN
    BEGIN
      INSERT INTO public.medicos (id, crm, especialidade)
      VALUES (
        NEW.id,
        UPPER(regexp_replace(COALESCE(NULLIF(v_documento,''), '000000'), '[^0-9A-Za-z]', '', 'g')),
        v_especialidade
      )
      ON CONFLICT (id) DO UPDATE
        SET crm = EXCLUDED.crm,
            especialidade = EXCLUDED.especialidade;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: medicos insert failed for %: %', NEW.id, SQLERRM;
    END;
  ELSE
    BEGIN
      INSERT INTO public.pacientes (id, cpf)
      VALUES (
        NEW.id,
        regexp_replace(COALESCE(NULLIF(v_documento,''), '00000000000'), '[^0-9]', '', 'g')
      )
      ON CONFLICT (id) DO UPDATE
        SET cpf = EXCLUDED.cpf;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: pacientes insert failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. upsert_user_profile atualizado: normaliza documento
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_nome          text,
  p_tipo          text,
  p_documento     text,
  p_especialidade text DEFAULT 'Clínica Geral'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id    uuid;
  v_email text;
  v_cpf   text;
  v_crm   text;
BEGIN
  v_id := auth.uid();
  IF v_id IS NULL THEN
    RAISE LOG 'upsert_user_profile: auth.uid() is null, abortando';
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_id;

  INSERT INTO public.profiles (id, nome, email, tipo)
  VALUES (v_id, p_nome, v_email, p_tipo)
  ON CONFLICT (id) DO UPDATE
    SET nome  = EXCLUDED.nome,
        tipo  = EXCLUDED.tipo,
        email = EXCLUDED.email,
        updated_at = NOW();

  IF p_tipo = 'medico' THEN
    v_crm := UPPER(regexp_replace(p_documento, '[^0-9A-Za-z]', '', 'g'));
    INSERT INTO public.medicos (id, crm, especialidade)
    VALUES (v_id, v_crm, p_especialidade)
    ON CONFLICT (id) DO UPDATE
      SET crm = EXCLUDED.crm,
          especialidade = EXCLUDED.especialidade;
  ELSE
    v_cpf := regexp_replace(p_documento, '[^0-9]', '', 'g');
    INSERT INTO public.pacientes (id, cpf)
    VALUES (v_id, v_cpf)
    ON CONFLICT (id) DO UPDATE
      SET cpf = EXCLUDED.cpf;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_profile(text, text, text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Garantir policy de INSERT em profiles (trigger SECURITY DEFINER
--    bypassa RLS, mas policy explícita melhora auditabilidade)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'service_role_insert_profiles'
  ) THEN
    CREATE POLICY "service_role_insert_profiles"
      ON public.profiles FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Backfill final: garantir que todos os auth.users têm profiles
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, nome, email, tipo)
      VALUES (
        u.id,
        COALESCE(NULLIF(u.raw_user_meta_data->>'nome',''), 'Usuário'),
        u.email,
        COALESCE(NULLIF(u.raw_user_meta_data->>'tipo',''), 'paciente')
      ) ON CONFLICT (id) DO NOTHING;

      IF COALESCE(u.raw_user_meta_data->>'tipo', 'paciente') = 'medico' THEN
        INSERT INTO public.medicos (id, crm, especialidade)
        VALUES (
          u.id,
          UPPER(regexp_replace(COALESCE(NULLIF(u.raw_user_meta_data->>'documento',''),'000000'), '[^0-9A-Za-z]', '', 'g')),
          COALESCE(NULLIF(u.raw_user_meta_data->>'especialidade',''), 'Clínica Geral')
        ) ON CONFLICT (id) DO NOTHING;
      ELSE
        INSERT INTO public.pacientes (id, cpf)
        VALUES (
          u.id,
          regexp_replace(COALESCE(NULLIF(u.raw_user_meta_data->>'documento',''),'00000000000'), '[^0-9]', '', 'g')
        ) ON CONFLICT (id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Backfill final falhou para %: %', u.id, SQLERRM;
    END;
  END LOOP;
END $$;
