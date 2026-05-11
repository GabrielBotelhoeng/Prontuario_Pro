-- ============================================================
-- Migration 010: Paciente pode solicitar/agendar consulta
-- ============================================================
-- Pré-requisitos: 001-009 já aplicadas.
-- Esta migration é idempotente.
-- ============================================================

-- Permite que o paciente autenticado crie uma consulta para si próprio.
-- O paciente NÃO pode criar consultas para outros usuários (paciente_id = auth.uid()).
DROP POLICY IF EXISTS "pacientes_insert_consulta" ON public.consultas;
CREATE POLICY "pacientes_insert_consulta"
  ON public.consultas FOR INSERT
  TO authenticated
  WITH CHECK (paciente_id = auth.uid());
