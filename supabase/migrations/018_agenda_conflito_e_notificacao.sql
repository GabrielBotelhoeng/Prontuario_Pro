-- ============================================================
-- Migration 018: Agenda — conflito de horário (RN-009) e
--                notificação ao médico em solicitações do paciente
-- ============================================================
-- Pré-requisitos: 001-017 já aplicadas.
-- Idempotente: pode ser reexecutada sem dano.
-- ============================================================
-- Regra (RN-009 / RF-006 / RF-011):
--   O sistema não deve permitir duas consultas ativas para o mesmo
--   médico no mesmo horário. A agenda trabalha com slots de
--   30 minutos, então qualquer consulta não cancelada cujo início
--   esteja a menos de 30 minutos de outra do mesmo médico é
--   considerada conflitante.
-- Por que trigger SECURITY DEFINER:
--   O paciente, ao solicitar consulta, só enxerga as próprias
--   consultas (RLS). A verificação precisa considerar a agenda
--   inteira do médico, então roda com privilégios do dono da
--   função — sem expor nenhum dado ao cliente, apenas a mensagem
--   de erro.
-- ============================================================

CREATE OR REPLACE FUNCTION public.verificar_conflito_consulta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Consultas canceladas não ocupam horário.
  IF NEW.status = 'Cancelado' THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, só revalida quando o horário/médico muda ou quando uma
  -- consulta cancelada volta a ocupar a agenda. Mudanças de status comuns
  -- (Confirmado → Em andamento → Finalizado) não são bloqueadas.
  IF TG_OP = 'UPDATE'
     AND NEW.medico_id = OLD.medico_id
     AND NEW.data_hora = OLD.data_hora
     AND OLD.status <> 'Cancelado' THEN
    RETURN NEW;
  END IF;

  -- Serializa agendamentos concorrentes do mesmo médico.
  PERFORM pg_advisory_xact_lock(hashtext('consultas:' || NEW.medico_id::text));

  IF EXISTS (
    SELECT 1
      FROM public.consultas c
     WHERE c.medico_id = NEW.medico_id
       AND c.id <> NEW.id
       AND c.status <> 'Cancelado'
       AND c.data_hora > NEW.data_hora - INTERVAL '30 minutes'
       AND c.data_hora < NEW.data_hora + INTERVAL '30 minutes'
  ) THEN
    RAISE EXCEPTION 'Horário indisponível: o médico já possui consulta agendada neste horário.'
      USING ERRCODE = 'P0001', HINT = 'RN-009';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verificar_conflito_consulta ON public.consultas;
CREATE TRIGGER trg_verificar_conflito_consulta
  BEFORE INSERT OR UPDATE OF medico_id, data_hora, status
  ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.verificar_conflito_consulta();

-- Índice para a verificação acima e para a listagem da agenda.
CREATE INDEX IF NOT EXISTS idx_consultas_medico_data_hora
  ON public.consultas (medico_id, data_hora);

-- ─────────────────────────────────────────────────────────────
-- Notificação de consulta conforme quem originou a ação
--   • Paciente solicitou (INSERT feito pelo próprio paciente):
--     notifica o MÉDICO para confirmar a solicitação.
--   • Médico agendou (INSERT feito pelo médico): notifica o paciente.
--   • Mudança de status: notifica o paciente (comportamento da 009).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notificar_consulta()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico_nome   TEXT;
  v_paciente_nome TEXT;
  v_quando        TEXT;
BEGIN
  SELECT pr.nome INTO v_medico_nome
  FROM public.profiles pr WHERE pr.id = NEW.medico_id;
  v_medico_nome := COALESCE(v_medico_nome, 'Médico');

  v_quando := to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.paciente_id THEN
      SELECT pr.nome INTO v_paciente_nome
      FROM public.profiles pr WHERE pr.id = NEW.paciente_id;

      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
      VALUES (
        NEW.medico_id,
        'Nova solicitação de consulta',
        COALESCE(v_paciente_nome, 'Um paciente') || ' solicitou consulta para ' || v_quando,
        'consulta'
      );
    ELSE
      INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
      VALUES (
        NEW.paciente_id,
        'Nova consulta agendada',
        'Dr(a). ' || v_medico_nome || ' agendou uma consulta para ' || v_quando,
        'consulta'
      );
    END IF;
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
