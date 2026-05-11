-- ============================================================
-- Migration 011: RPC pública para validação de receita via QR Code
-- ============================================================
-- Pré-requisitos: 001-010 já aplicadas.
-- Esta migration é idempotente.
-- ============================================================
-- Permite que qualquer pessoa (não autenticada) verifique a
-- autenticidade de uma receita escaneando o QR Code.
-- Retorna APENAS dados não-sensíveis: nunca expõe paciente_id,
-- CPF, e-mail, telefone. Do paciente, retorna só o primeiro nome
-- para conferência visual.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validar_prescricao(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', pr.id,
    'tipo_receita', pr.tipo_receita,
    'status', pr.status,
    'data_emissao', pr.data_emissao,
    'medicamentos', pr.medicamentos,
    'medico', jsonb_build_object(
      'nome', mp.nome,
      'crm', m.crm,
      'especialidade', m.especialidade,
      'clinica_nome', m.clinica_nome
    ),
    'paciente_primeiro_nome', split_part(pp.nome, ' ', 1)
  )
  INTO v_result
  FROM public.prescricoes pr
  JOIN public.medicos m ON m.id = pr.medico_id
  JOIN public.profiles mp ON mp.id = m.id
  JOIN public.profiles pp ON pp.id = pr.paciente_id
  WHERE pr.id = p_id
    AND pr.status = 'finalizada';

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_prescricao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_prescricao(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.validar_prescricao(uuid) IS
  'Validação pública de receita via QR Code. Retorna apenas dados não-sensíveis. Receitas em rascunho retornam NULL.';
