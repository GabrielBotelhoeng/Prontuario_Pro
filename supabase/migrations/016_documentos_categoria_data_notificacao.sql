-- ============================================================
-- Migration 016: Categoria, data do exame e notificação automática
--                em uploads de documentos por pacientes
-- ============================================================
-- Pré-requisitos: 001-015 já aplicadas.
-- Idempotente: pode ser reexecutada sem dano.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Colunas novas em documentos
--    - categoria: ajuda o médico a filtrar/encontrar rápido
--    - data_exame: distingue data do upload (created_at) da
--      data clínica real (quando o exame foi feito)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS categoria TEXT
    CHECK (categoria IN ('exame_laboratorial','exame_imagem','receita','atestado','laudo','outro'));

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS data_exame DATE;

-- Índice para acelerar filtros do médico por categoria.
CREATE INDEX IF NOT EXISTS idx_documentos_paciente_categoria
  ON public.documentos (paciente_id, categoria, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 2. Notificação automática ao médico responsável
--    Quando o próprio paciente faz upload (uploaded_by = paciente_id),
--    notifica o medico_principal_id — se houver.
--    Uploads feitos pelo médico NÃO notificam (evita ruído).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notificar_documento_paciente()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico_id UUID;
  v_paciente_nome TEXT;
  v_categoria_label TEXT;
BEGIN
  -- Só interessa quando quem subiu é o próprio paciente.
  IF NEW.uploaded_by <> NEW.paciente_id THEN
    RETURN NEW;
  END IF;

  SELECT pa.medico_principal_id INTO v_medico_id
  FROM public.pacientes pa
  WHERE pa.id = NEW.paciente_id;

  -- Sem médico responsável vinculado → nada a notificar.
  IF v_medico_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pr.nome INTO v_paciente_nome
  FROM public.profiles pr WHERE pr.id = NEW.paciente_id;
  v_paciente_nome := COALESCE(v_paciente_nome, 'Paciente');

  v_categoria_label := CASE NEW.categoria
    WHEN 'exame_laboratorial' THEN 'um exame laboratorial'
    WHEN 'exame_imagem'       THEN 'um exame de imagem'
    WHEN 'receita'            THEN 'uma receita'
    WHEN 'atestado'           THEN 'um atestado'
    WHEN 'laudo'              THEN 'um laudo'
    ELSE 'um documento'
  END;

  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo)
  VALUES (
    v_medico_id,
    'Novo documento de paciente',
    v_paciente_nome || ' enviou ' || v_categoria_label || ': "' || NEW.nome || '".',
    'alerta'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_documento_paciente ON public.documentos;
CREATE TRIGGER trg_notificar_documento_paciente
  AFTER INSERT ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.notificar_documento_paciente();
