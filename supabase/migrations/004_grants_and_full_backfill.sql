-- ─────────────────────────────────────────────────────────────
-- 1. GRANT EXECUTE explícito nas funções de lookup (anon pode chamar)
-- ─────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_email_by_crm(text)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_cpf(text)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(text, text, text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Backfill completo: profiles faltando
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
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'profiles backfill falhou para %: %', u.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Backfill: medicos com perfil mas sem registro em medicos
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN
    SELECT p.id, au.raw_user_meta_data
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    LEFT JOIN public.medicos m ON m.id = p.id
    WHERE p.tipo = 'medico' AND m.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.medicos (id, crm, especialidade)
      VALUES (
        u.id,
        COALESCE(u.raw_user_meta_data->>'documento', '000000'),
        COALESCE(u.raw_user_meta_data->>'especialidade', 'Clínica Geral')
      ) ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'medicos backfill falhou para %: %', u.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Backfill: pacientes com perfil mas sem registro em pacientes
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN
    SELECT p.id, au.raw_user_meta_data
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    LEFT JOIN public.pacientes pa ON pa.id = p.id
    WHERE p.tipo = 'paciente' AND pa.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.pacientes (id, cpf)
      VALUES (
        u.id,
        COALESCE(u.raw_user_meta_data->>'documento', '00000000000')
      ) ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pacientes backfill falhou para %: %', u.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. Auto-confirmar e-mails de usuários existentes não confirmados
--    (evita bloqueio de login em projetos com email confirm ON)
-- ─────────────────────────────────────────────────────────────
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
