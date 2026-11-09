-- ============================================================
-- Migration 022: provisionamento confiável do papel do usuário
-- ============================================================
-- Achado dos testes E2E (agentes médico/paciente): o Auth do Supabase
-- insere o usuário e SÓ DEPOIS grava raw_app_meta_data. O trigger de
-- INSERT (019) não via o papel → toda conta criada pelo painel admin
-- virava "paciente" (médico sem linha em medicos, com ficha de
-- paciente cujo CPF era o número do CRM).
--
-- Correção: o provisionamento roda no INSERT e também quando o Auth
-- atualiza o papel/flag em raw_app_meta_data. Backfill no final.
-- ============================================================

CREATE OR REPLACE FUNCTION public.provisionar_usuario(p_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  u auth.users%ROWTYPE;
  v_tipo   TEXT;
  v_nome   TEXT;
  v_doc    TEXT;
  v_esp    TEXT;
  v_trocar BOOLEAN;
BEGIN
  SELECT * INTO u FROM auth.users WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_tipo   := NULLIF(TRIM(u.raw_app_meta_data->>'tipo'), '');
  v_nome   := COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'nome'), ''), 'Usuário');
  v_doc    := COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'documento'), ''), '');
  v_esp    := COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'especialidade'), ''), 'Clínica Geral');
  v_trocar := COALESCE((u.raw_app_meta_data->>'precisa_trocar_senha')::boolean, FALSE);

  -- Papel ainda desconhecido: só o perfil básico, sem ficha especializada.
  IF v_tipo IS NULL OR v_tipo NOT IN ('medico', 'paciente', 'admin') THEN
    INSERT INTO public.profiles (id, nome, email, tipo)
    VALUES (u.id, v_nome, u.email, 'paciente')
    ON CONFLICT (id) DO NOTHING;
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, nome, email, tipo, precisa_trocar_senha)
  VALUES (u.id, v_nome, u.email, v_tipo, v_trocar)
  ON CONFLICT (id) DO UPDATE
    SET tipo = EXCLUDED.tipo,
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        precisa_trocar_senha = EXCLUDED.precisa_trocar_senha;

  -- Ficha de paciente vazia criada por engano antes do papel ser conhecido.
  IF v_tipo <> 'paciente' THEN
    DELETE FROM public.pacientes pa
    WHERE pa.id = u.id
      AND NOT EXISTS (SELECT 1 FROM public.consultas   c WHERE c.paciente_id = pa.id)
      AND NOT EXISTS (SELECT 1 FROM public.anamneses   a WHERE a.paciente_id = pa.id)
      AND NOT EXISTS (SELECT 1 FROM public.prescricoes r WHERE r.paciente_id = pa.id)
      AND NOT EXISTS (SELECT 1 FROM public.documentos  d WHERE d.paciente_id = pa.id);
  END IF;

  IF v_tipo = 'medico' THEN
    INSERT INTO public.medicos (id, crm, especialidade)
    VALUES (u.id, UPPER(regexp_replace(v_doc, '[^0-9A-Za-z]', '', 'g')), v_esp)
    ON CONFLICT (id) DO UPDATE
      SET crm = EXCLUDED.crm, especialidade = EXCLUDED.especialidade;
  ELSIF v_tipo = 'paciente' AND v_doc <> '' THEN
    INSERT INTO public.pacientes (id, cpf)
    VALUES (u.id, regexp_replace(v_doc, '[^0-9]', '', 'g'))
    ON CONFLICT (id) DO UPDATE SET cpf = EXCLUDED.cpf;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_usuario(UUID) FROM PUBLIC, anon, authenticated;

-- INSERT em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public.provisionar_usuario(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: provisionamento falhou para %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- UPDATE do papel em auth.users (é aqui que o Auth grava o app_metadata)
CREATE OR REPLACE FUNCTION public.handle_user_papel_atualizado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public.provisionar_usuario(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_user_papel_atualizado: falhou para %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_papel_atualizado ON auth.users;
CREATE TRIGGER on_auth_user_papel_atualizado
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    NEW.raw_app_meta_data->>'tipo' IS DISTINCT FROM OLD.raw_app_meta_data->>'tipo'
    OR NEW.raw_app_meta_data->>'precisa_trocar_senha' IS DISTINCT FROM OLD.raw_app_meta_data->>'precisa_trocar_senha'
  )
  EXECUTE FUNCTION public.handle_user_papel_atualizado();

-- Backfill: contas criadas pelo painel com papel divergente do perfil.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT u.id
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.raw_app_meta_data->>'tipo' IN ('medico', 'paciente', 'admin')
      AND (
        p.id IS NULL
        OR p.tipo IS DISTINCT FROM u.raw_app_meta_data->>'tipo'
        OR (u.raw_app_meta_data->>'tipo' = 'medico'
            AND NOT EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = u.id))
      )
  LOOP
    PERFORM public.provisionar_usuario(r.id);
  END LOOP;
END $$;
