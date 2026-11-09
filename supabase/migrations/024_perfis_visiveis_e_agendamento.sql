-- ============================================================
-- Migration 024: quem vê quais perfis + agendamento do paciente
-- ============================================================
-- Achados dos testes E2E:
--   • Paciente não lia o perfil dos médicos (só o próprio) → telas
--     mostravam "Dr(a). —" e, pior, a checagem de "médico ativo" da
--     policy de agendamento (020) falhava → paciente não conseguia
--     marcar consulta.
--   • medicos_select_profiles deixava QUALQUER médico ler nome/e-mail
--     de TODOS os pacientes (LGPD: minimização).
-- Regras novas:
--   • Corpo clínico (perfis de médicos) visível a usuários logados.
--   • Médico lê perfil só de paciente com vínculo.
--   • Agendamento valida o médico por função SECURITY DEFINER.
-- ============================================================

CREATE OR REPLACE FUNCTION public.medico_esta_ativo(p_medico UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.medicos m
    JOIN public.profiles p ON p.id = m.id AND p.ativo
    WHERE m.id = p_medico
  );
$$;

REVOKE ALL ON FUNCTION public.medico_esta_ativo(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.medico_esta_ativo(UUID) TO authenticated;

-- Perfis
DROP POLICY IF EXISTS "medicos_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "corpo_clinico_visivel" ON public.profiles;
DROP POLICY IF EXISTS "medico_ve_pacientes_vinculados" ON public.profiles;

CREATE POLICY "corpo_clinico_visivel"
  ON public.profiles FOR SELECT TO authenticated
  USING (tipo = 'medico');

CREATE POLICY "medico_ve_pacientes_vinculados"
  ON public.profiles FOR SELECT TO authenticated
  USING (tipo = 'paciente' AND public.medico_tem_vinculo(id));

-- Agendamento pelo paciente
DROP POLICY IF EXISTS "pacientes_insert_consulta" ON public.consultas;
CREATE POLICY "pacientes_insert_consulta"
  ON public.consultas FOR INSERT TO authenticated
  WITH CHECK (
    paciente_id = auth.uid()
    AND status = 'Aguardando'
    AND data_hora > NOW()
    AND public.medico_esta_ativo(medico_id)
  );
