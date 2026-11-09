-- ============================================================
-- Migration 021: corrige pacientes_do_medico()
-- ============================================================
-- Desde a 009 a função falhava com 42702 ("column reference id is
-- ambiguous"): o CTE selecionava "id", que colide com a coluna de
-- saída "id" do RETURNS TABLE. Resultado: a lista de pacientes do
-- médico (anamnese, agenda, painel) sempre vinha vazia (HTTP 400).
-- ============================================================

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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico UUID := auth.uid();
BEGIN
  IF v_medico IS NULL OR NOT public.is_medico_ativo() THEN
    RETURN;
  END IF;

  RETURN QUERY
    WITH vinculados AS (
      SELECT pa.id AS paciente_id
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
             WHERE c2.medico_id = v_medico AND c2.paciente_id = pa.id)
      FROM vinculados v
      JOIN public.pacientes pa ON pa.id = v.paciente_id
      JOIN public.profiles  pr ON pr.id = pa.id AND pr.ativo
     ORDER BY pr.nome ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.pacientes_do_medico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pacientes_do_medico() TO authenticated;
