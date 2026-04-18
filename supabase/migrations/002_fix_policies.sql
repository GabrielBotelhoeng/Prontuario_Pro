-- Drop policies existentes para recriar sem conflito
DROP POLICY IF EXISTS "users_select_own_profile"       ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile"       ON public.profiles;
DROP POLICY IF EXISTS "medicos_select_profiles"        ON public.profiles;
DROP POLICY IF EXISTS "authenticated_select_medicos"   ON public.medicos;
DROP POLICY IF EXISTS "medicos_update_own"             ON public.medicos;
DROP POLICY IF EXISTS "pacientes_select_own"           ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_update_own"           ON public.pacientes;
DROP POLICY IF EXISTS "medicos_select_seus_pacientes"  ON public.pacientes;
DROP POLICY IF EXISTS "medicos_all_suas_consultas"     ON public.consultas;
DROP POLICY IF EXISTS "pacientes_select_suas_consultas" ON public.consultas;
DROP POLICY IF EXISTS "medicos_all_suas_prescricoes"   ON public.prescricoes;
DROP POLICY IF EXISTS "pacientes_select_suas_prescricoes" ON public.prescricoes;
DROP POLICY IF EXISTS "medicos_all_suas_anamneses"     ON public.anamneses;
DROP POLICY IF EXISTS "pacientes_select_suas_anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "users_all_suas_notificacoes"    ON public.notificacoes;

-- Recriar policies
CREATE POLICY "users_select_own_profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "medicos_select_profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.medicos WHERE id = auth.uid()));

CREATE POLICY "authenticated_select_medicos"
  ON public.medicos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "medicos_update_own"
  ON public.medicos FOR UPDATE USING (id = auth.uid());

CREATE POLICY "pacientes_select_own"
  ON public.pacientes FOR SELECT USING (id = auth.uid());
CREATE POLICY "pacientes_update_own"
  ON public.pacientes FOR UPDATE USING (id = auth.uid());
CREATE POLICY "medicos_select_seus_pacientes"
  ON public.pacientes FOR SELECT
  USING (
    medico_principal_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.consultas WHERE medico_id = auth.uid() AND paciente_id = public.pacientes.id)
  );

CREATE POLICY "medicos_all_suas_consultas"
  ON public.consultas FOR ALL USING (medico_id = auth.uid());
CREATE POLICY "pacientes_select_suas_consultas"
  ON public.consultas FOR SELECT USING (paciente_id = auth.uid());

CREATE POLICY "medicos_all_suas_prescricoes"
  ON public.prescricoes FOR ALL USING (medico_id = auth.uid());
CREATE POLICY "pacientes_select_suas_prescricoes"
  ON public.prescricoes FOR SELECT USING (paciente_id = auth.uid());

CREATE POLICY "medicos_all_suas_anamneses"
  ON public.anamneses FOR ALL USING (medico_id = auth.uid());
CREATE POLICY "pacientes_select_suas_anamneses"
  ON public.anamneses FOR SELECT USING (paciente_id = auth.uid());

CREATE POLICY "users_all_suas_notificacoes"
  ON public.notificacoes FOR ALL USING (user_id = auth.uid());

-- Recriar trigger e funções (OR REPLACE garante idempotência)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'tipo', 'paciente')
  );
  IF NEW.raw_user_meta_data->>'tipo' = 'medico' THEN
    INSERT INTO public.medicos (id, crm, especialidade)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'documento','000000'), COALESCE(NEW.raw_user_meta_data->>'especialidade','Clínica Geral'));
  ELSE
    INSERT INTO public.pacientes (id, cpf)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'documento','00000000000'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_email_by_crm(p_crm TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT p.email INTO v_email FROM public.profiles p JOIN public.medicos m ON m.id = p.id WHERE m.crm = p_crm;
  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_email_by_cpf(p_cpf TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT p.email INTO v_email FROM public.profiles p JOIN public.pacientes pa ON pa.id = p.id WHERE pa.cpf = p_cpf;
  RETURN v_email;
END;
$$;
