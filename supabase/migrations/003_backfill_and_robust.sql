-- ─────────────────────────────────────────────────────────────
-- 1. Backfill: criar profiles para usuários auth que não têm
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
        COALESCE(u.raw_user_meta_data->>'nome', 'Usuário'),
        u.email,
        COALESCE(u.raw_user_meta_data->>'tipo', 'paciente')
      ) ON CONFLICT (id) DO NOTHING;

      IF u.raw_user_meta_data->>'tipo' = 'medico' THEN
        INSERT INTO public.medicos (id, crm, especialidade)
        VALUES (
          u.id,
          COALESCE(u.raw_user_meta_data->>'documento', '000000'),
          COALESCE(u.raw_user_meta_data->>'especialidade', 'Clínica Geral')
        ) ON CONFLICT (id) DO NOTHING;
      ELSE
        INSERT INTO public.pacientes (id, cpf)
        VALUES (u.id, COALESCE(u.raw_user_meta_data->>'documento', '00000000000'))
        ON CONFLICT (id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Backfill falhou para user %: %', u.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Trigger robusto com ON CONFLICT e EXCEPTION
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'tipo', 'paciente')
  ) ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data->>'tipo' = 'medico' THEN
    INSERT INTO public.medicos (id, crm, especialidade)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'documento', '000000'),
      COALESCE(NEW.raw_user_meta_data->>'especialidade', 'Clínica Geral')
    ) ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.pacientes (id, cpf)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'documento', '00000000000'))
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user falhou para user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Função client-side para upsert de perfil (belt-and-suspenders)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_nome        text,
  p_tipo        text,
  p_documento   text,
  p_especialidade text DEFAULT 'Clínica Geral'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id    uuid;
  v_email text;
BEGIN
  v_id := auth.uid();
  IF v_id IS NULL THEN RETURN; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_id;

  INSERT INTO public.profiles (id, nome, email, tipo)
  VALUES (v_id, p_nome, v_email, p_tipo)
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        tipo = EXCLUDED.tipo,
        email = EXCLUDED.email;

  IF p_tipo = 'medico' THEN
    INSERT INTO public.medicos (id, crm, especialidade)
    VALUES (v_id, p_documento, p_especialidade)
    ON CONFLICT (id) DO UPDATE
      SET crm = EXCLUDED.crm,
          especialidade = EXCLUDED.especialidade;
  ELSE
    INSERT INTO public.pacientes (id, cpf)
    VALUES (v_id, p_documento)
    ON CONFLICT (id) DO UPDATE
      SET cpf = EXCLUDED.cpf;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_profile TO anon;
