-- ============================================================
-- Migration 020: Vínculo médico-paciente, prontuário e agenda
-- ============================================================
-- Pré-requisitos: 001-019 aplicadas. Idempotente.
--
-- Prontuário (CFM 1.638/2002, Lei 13.787/2018):
--   • Médico só registra anamnese de paciente com quem tem vínculo
--     (médico responsável ou consulta agendada).
--   • Anamnese não pode ser apagada; o autor pode corrigir por 24h.
--   • Continuidade do cuidado: médico vinculado lê as anamneses do
--     paciente feitas por outros médicos do hospital.
-- Agenda:
--   • Paciente só solicita consulta futura, sempre como 'Aguardando'.
--   • Paciente cancela a própria consulta via RPC (sem UPDATE livre).
--   • horarios_ocupados() expõe só horários (sem dados pessoais).
-- Vínculo:
--   • vincular_paciente_por_cpf não sobrescreve outro médico.
--   • Paciente não altera o próprio CPF; escolhe o médico
--     responsável só quando ainda não há um.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Helpers
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_medico_ativo()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.medicos m
    JOIN public.profiles p ON p.id = m.id AND p.ativo
    WHERE m.id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.medico_tem_vinculo(p_paciente UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_medico_ativo() AND (
    EXISTS (SELECT 1 FROM public.pacientes pa
            WHERE pa.id = p_paciente AND pa.medico_principal_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.consultas c
               WHERE c.paciente_id = p_paciente AND c.medico_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_medico_ativo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.medico_tem_vinculo(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_medico_ativo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.medico_tem_vinculo(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Anamneses
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "medicos_all_suas_anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "medico_select_anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "medico_insert_anamnese" ON public.anamneses;
DROP POLICY IF EXISTS "medico_update_anamnese_recente" ON public.anamneses;

CREATE POLICY "medico_select_anamneses"
  ON public.anamneses FOR SELECT TO authenticated
  USING (medico_id = auth.uid() OR public.medico_tem_vinculo(paciente_id));

CREATE POLICY "medico_insert_anamnese"
  ON public.anamneses FOR INSERT TO authenticated
  WITH CHECK (medico_id = auth.uid() AND public.medico_tem_vinculo(paciente_id));

CREATE POLICY "medico_update_anamnese_recente"
  ON public.anamneses FOR UPDATE TO authenticated
  USING (medico_id = auth.uid() AND created_at > NOW() - INTERVAL '24 hours')
  WITH CHECK (medico_id = auth.uid());
-- Sem policy de DELETE: prontuário não é apagado.

CREATE OR REPLACE FUNCTION public.guard_anamnese_imutavel()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.paciente_id IS DISTINCT FROM OLD.paciente_id
     OR NEW.medico_id IS DISTINCT FROM OLD.medico_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Autor, paciente e data da anamnese não podem ser alterados.' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_anamnese_imutavel ON public.anamneses;
CREATE TRIGGER trg_guard_anamnese_imutavel
  BEFORE UPDATE ON public.anamneses
  FOR EACH ROW EXECUTE FUNCTION public.guard_anamnese_imutavel();

-- ─────────────────────────────────────────────────────────────
-- 3. Consultas
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pacientes_insert_consulta" ON public.consultas;
CREATE POLICY "pacientes_insert_consulta"
  ON public.consultas FOR INSERT TO authenticated
  WITH CHECK (
    paciente_id = auth.uid()
    AND status = 'Aguardando'
    AND data_hora > NOW()
    AND EXISTS (
      SELECT 1 FROM public.medicos m
      JOIN public.profiles p ON p.id = m.id AND p.ativo
      WHERE m.id = medico_id
    )
  );

-- Paciente cancela a própria consulta futura (ainda não iniciada).
CREATE OR REPLACE FUNCTION public.cancelar_consulta_paciente(p_consulta UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_data TIMESTAMPTZ;
BEGIN
  SELECT status, data_hora INTO v_status, v_data
  FROM public.consultas
  WHERE id = p_consulta AND paciente_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consulta não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  IF v_status NOT IN ('Aguardando', 'Confirmado') THEN
    RAISE EXCEPTION 'Esta consulta não pode mais ser cancelada.' USING ERRCODE = 'P0001';
  END IF;
  IF v_data <= NOW() THEN
    RAISE EXCEPTION 'Consultas passadas não podem ser canceladas.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.consultas SET status = 'Cancelado' WHERE id = p_consulta;
END;
$$;

REVOKE ALL ON FUNCTION public.cancelar_consulta_paciente(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_consulta_paciente(UUID) TO authenticated;

-- Horários já ocupados de um médico num dia (sem dados do paciente).
CREATE OR REPLACE FUNCTION public.horarios_ocupados(p_medico UUID, p_dia DATE)
RETURNS SETOF TIMESTAMPTZ
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.data_hora
  FROM public.consultas c
  WHERE c.medico_id = p_medico
    AND c.status <> 'Cancelado'
    AND c.data_hora >= (p_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
    AND c.data_hora <  ((p_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY c.data_hora;
$$;

REVOKE ALL ON FUNCTION public.horarios_ocupados(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_ocupados(UUID, DATE) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Vínculo por CPF: não sobrescreve outro médico
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
  v_atual UUID;
BEGIN
  IF v_medico IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_medico_ativo() THEN
    RAISE EXCEPTION 'Apenas médicos ativos podem vincular pacientes.' USING ERRCODE = '42501';
  END IF;

  v_cpf_limpo := regexp_replace(COALESCE(p_cpf,''), '[^0-9]', '', 'g');
  IF length(v_cpf_limpo) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT pa.id, pa.medico_principal_id INTO v_paciente_id, v_atual
  FROM public.pacientes pa
  JOIN public.profiles pr ON pr.id = pa.id AND pr.ativo
  WHERE regexp_replace(pa.cpf, '[^0-9]', '', 'g') = v_cpf_limpo;

  IF v_paciente_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum paciente ativo com este CPF.' USING ERRCODE = 'P0002';
  END IF;

  IF v_atual IS NOT NULL AND v_atual <> v_medico THEN
    RAISE EXCEPTION 'Paciente já acompanhado por outro médico. Agende uma consulta para atendê-lo.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_atual IS NULL THEN
    UPDATE public.pacientes SET medico_principal_id = v_medico WHERE pacientes.id = v_paciente_id;
    PERFORM public.log_audit_event('paciente_vinculado', 'paciente', v_paciente_id, v_paciente_id, '{}'::jsonb);
  END IF;

  RETURN QUERY
    SELECT pa.id, pa.cpf, pr.nome, pr.email, pa.medico_principal_id
    FROM public.pacientes pa
    JOIN public.profiles pr ON pr.id = pa.id
    WHERE pa.id = v_paciente_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vincular_paciente_por_cpf(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Paciente: CPF fixo; médico responsável só se ainda não houver
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_paciente_campos()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    IF NEW.cpf IS DISTINCT FROM OLD.cpf THEN
      RAISE EXCEPTION 'O CPF só pode ser alterado pela administração.' USING ERRCODE = '42501';
    END IF;
    IF NEW.medico_principal_id IS DISTINCT FROM OLD.medico_principal_id
       AND OLD.medico_principal_id IS NOT NULL THEN
      RAISE EXCEPTION 'Para trocar de médico responsável, procure a administração.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_paciente_campos ON public.pacientes;
CREATE TRIGGER trg_guard_paciente_campos
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.guard_paciente_campos();

-- ─────────────────────────────────────────────────────────────
-- 6. Notificação: cancelamento pelo paciente avisa o médico
--    (antes o aviso ia para o próprio paciente).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notificar_consulta()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico_nome   TEXT;
  v_paciente_nome TEXT;
  v_quando        TEXT;
  v_pelo_paciente BOOLEAN := auth.uid() IS NOT NULL AND auth.uid() = NEW.paciente_id;
BEGIN
  SELECT pr.nome INTO v_medico_nome FROM public.profiles pr WHERE pr.id = NEW.medico_id;
  v_medico_nome := COALESCE(v_medico_nome, 'Médico');
  SELECT pr.nome INTO v_paciente_nome FROM public.profiles pr WHERE pr.id = NEW.paciente_id;
  v_paciente_nome := COALESCE(v_paciente_nome, 'Um paciente');

  v_quando := to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');

  IF TG_OP = 'INSERT' THEN
    IF v_pelo_paciente THEN
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
      VALUES (NEW.medico_id, 'Nova solicitação de consulta',
              v_paciente_nome || ' solicitou consulta para ' || v_quando, 'consulta');
    ELSE
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
      VALUES (NEW.paciente_id, 'Nova consulta agendada',
              'Dr(a). ' || v_medico_nome || ' agendou uma consulta para ' || v_quando, 'consulta');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_pelo_paciente THEN
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
      VALUES (NEW.medico_id, 'Consulta ' || NEW.status,
              v_paciente_nome || ' — consulta de ' || v_quando || ': ' || NEW.status, 'consulta');
    ELSE
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
      VALUES (NEW.paciente_id, 'Consulta ' || NEW.status,
              'Sua consulta de ' || v_quando || ' com Dr(a). ' || v_medico_nome || ' agora está: ' || NEW.status,
              'consulta');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
