-- ============================================================
-- Migration 009: Notificações automáticas, Realtime, Vínculo
--                médico-paciente, fix RLS documentos, updated_at
-- ============================================================
-- Pré-requisitos: 001-008 já aplicadas.
-- Esta migration é idempotente: pode ser reexecutada sem dano.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Trigger genérico para manter updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_anamneses_updated_at ON public.anamneses;
CREATE TRIGGER trg_anamneses_updated_at
  BEFORE UPDATE ON public.anamneses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. Notificações automáticas
--    Toda nova consulta gera notificação para o paciente.
--    Toda mudança de status de consulta gera notificação.
--    Toda prescrição finalizada gera notificação para o paciente.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notificar_consulta()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico_nome TEXT;
BEGIN
  SELECT pr.nome INTO v_medico_nome
  FROM public.profiles pr WHERE pr.id = NEW.medico_id;
  v_medico_nome := COALESCE(v_medico_nome, 'Médico');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
    VALUES (
      NEW.paciente_id,
      'Nova consulta agendada',
      'Dr(a). ' || v_medico_nome || ' agendou uma consulta para ' ||
        to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
      'consulta'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
    VALUES (
      NEW.paciente_id,
      'Consulta ' || NEW.status,
      'Sua consulta com Dr(a). ' || v_medico_nome || ' agora está com status: ' || NEW.status,
      'consulta'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_consulta ON public.consultas;
CREATE TRIGGER trg_notificar_consulta
  AFTER INSERT OR UPDATE ON public.consultas
  FOR EACH ROW EXECUTE FUNCTION public.notificar_consulta();

CREATE OR REPLACE FUNCTION public.notificar_prescricao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico_nome TEXT;
  v_qtd INT;
BEGIN
  -- Só notifica quando a receita está finalizada (rascunho não vai para o paciente).
  IF NEW.status <> 'finalizada' THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, só notifica na transição rascunho -> finalizada.
  IF TG_OP = 'UPDATE' AND OLD.status = 'finalizada' THEN
    RETURN NEW;
  END IF;

  SELECT pr.nome INTO v_medico_nome
  FROM public.profiles pr WHERE pr.id = NEW.medico_id;
  v_medico_nome := COALESCE(v_medico_nome, 'Médico');

  v_qtd := COALESCE(jsonb_array_length(NEW.medicamentos), 0);

  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
  VALUES (
    NEW.paciente_id,
    'Nova receita disponível',
    'Dr(a). ' || v_medico_nome || ' emitiu uma receita com ' || v_qtd || ' medicamento(s).',
    'receita'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_prescricao ON public.prescricoes;
CREATE TRIGGER trg_notificar_prescricao
  AFTER INSERT OR UPDATE ON public.prescricoes
  FOR EACH ROW EXECUTE FUNCTION public.notificar_prescricao();

-- ─────────────────────────────────────────────────────────────
-- 3. Realtime: garantir que as tabelas relevantes publicam.
--    prescricoes já é usada via supabase.channel; adicionamos
--    consultas e notificacoes.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_tbl TEXT;
  v_tables TEXT[] := ARRAY['prescricoes','consultas','notificacoes','documentos','anamneses'];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- tabela já estava publicada
    WHEN undefined_object THEN
      RAISE NOTICE 'Publication supabase_realtime ainda não existe (projeto recém-criado).';
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: vincular_paciente_por_cpf
--    Permite ao médico (autenticado) marcar um paciente como
--    seu (preenchendo medico_principal_id) usando apenas o CPF.
--    Retorna a linha do paciente (json) ou levanta exception.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.vincular_paciente_por_cpf(p_cpf TEXT)
RETURNS TABLE (
  id UUID,
  cpf TEXT,
  nome TEXT,
  email TEXT,
  medico_principal_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico UUID := auth.uid();
  v_cpf_limpo TEXT;
  v_paciente_id UUID;
BEGIN
  IF v_medico IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '28000';
  END IF;

  -- Só médicos podem vincular pacientes
  IF NOT EXISTS (SELECT 1 FROM public.medicos WHERE medicos.id = v_medico) THEN
    RAISE EXCEPTION 'Apenas médicos podem vincular pacientes.' USING ERRCODE = '42501';
  END IF;

  v_cpf_limpo := regexp_replace(COALESCE(p_cpf,''), '[^0-9]', '', 'g');
  IF length(v_cpf_limpo) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT pa.id INTO v_paciente_id
  FROM public.pacientes pa
  WHERE regexp_replace(pa.cpf, '[^0-9]', '', 'g') = v_cpf_limpo;

  IF v_paciente_id IS NULL THEN
    RAISE EXCEPTION 'Paciente com CPF % não encontrado.', p_cpf USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.pacientes
     SET medico_principal_id = v_medico
   WHERE pacientes.id = v_paciente_id;

  RETURN QUERY
    SELECT pa.id, pa.cpf, pr.nome, pr.email, pa.medico_principal_id
    FROM public.pacientes pa
    JOIN public.profiles  pr ON pr.id = pa.id
    WHERE pa.id = v_paciente_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vincular_paciente_por_cpf(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. RPC: pacientes_do_medico
--    União de "pacientes com medico_principal_id = me" e
--    "pacientes que já tiveram consulta comigo".
--    Resolve o problema de paciente recém-cadastrado não
--    aparecer para o médico.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pacientes_do_medico()
RETURNS TABLE (
  id UUID,
  cpf TEXT,
  nome TEXT,
  email TEXT,
  avatar_url TEXT,
  data_nascimento DATE,
  medico_principal_id UUID,
  ultima_consulta TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico UUID := auth.uid();
BEGIN
  IF v_medico IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    WITH ids AS (
      SELECT pa.id
        FROM public.pacientes pa
       WHERE pa.medico_principal_id = v_medico
      UNION
      SELECT c.paciente_id
        FROM public.consultas c
       WHERE c.medico_id = v_medico
    )
    SELECT pa.id,
           pa.cpf,
           pr.nome,
           pr.email,
           pr.avatar_url,
           pa.data_nascimento,
           pa.medico_principal_id,
           (SELECT MAX(c2.data_hora)
              FROM public.consultas c2
             WHERE c2.medico_id = v_medico AND c2.paciente_id = pa.id) AS ultima_consulta
      FROM public.pacientes pa
      JOIN public.profiles  pr ON pr.id = pa.id
     WHERE pa.id IN (SELECT id FROM ids)
     ORDER BY pr.nome ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pacientes_do_medico() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. Fix RLS de documentos: alinhar com regra de pacientes
--    (médico vê documentos de pacientes com medico_principal_id
--     OU pacientes com quem já teve consulta).
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "medico_select_pacientes_vinculados" ON public.documentos;

CREATE POLICY "medico_select_pacientes_vinculados"
  ON public.documentos FOR SELECT
  TO authenticated
  USING (
    paciente_id IN (
      SELECT id FROM public.pacientes
        WHERE medico_principal_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.consultas
        WHERE consultas.medico_id   = auth.uid()
          AND consultas.paciente_id = public.documentos.paciente_id
    )
  );

-- Permitir que o médico apague documento que ele mesmo subiu
-- (já existe via dono_delete, sem mudança).

-- ─────────────────────────────────────────────────────────────
-- 7. RPC auxiliar: marcar todas as notificações como lidas
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.marcar_todas_notificacoes_lidas()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;
  UPDATE public.notificacoes
     SET lida = TRUE
   WHERE user_id = v_uid AND lida = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_todas_notificacoes_lidas() TO authenticated;
