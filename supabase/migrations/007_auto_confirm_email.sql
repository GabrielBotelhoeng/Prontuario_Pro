-- ─────────────────────────────────────────────────────────────
-- Migration 007: Auto-confirmar e-mail no cadastro
--
-- Problema: Supabase exige confirmação de e-mail por padrão.
-- Como o app não usa fluxo de confirmação por e-mail (login direto
-- por CPF/CRM), novos usuários ficavam bloqueados após cadastro.
-- Migration 004 já confirmou usuários existentes; este trigger
-- garante que todos os futuros cadastros sejam confirmados
-- automaticamente.
-- ─────────────────────────────────────────────────────────────

-- 1. Atualizar trigger handle_new_user para confirmar e-mail
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome          TEXT;
  v_tipo          TEXT;
  v_documento     TEXT;
  v_especialidade TEXT;
BEGIN
  v_nome        := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''), 'Usuário');
  v_tipo        := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'tipo'), ''), 'paciente');
  v_documento   := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'documento'), ''), '');
  v_especialidade := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'especialidade'), ''), 'Clínica Geral');

  -- Auto-confirmar e-mail (o app usa login por CPF/CRM, não por e-mail)
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = NEW.id;

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

-- 2. Confirmar e-mails de usuários existentes ainda não confirmados
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
