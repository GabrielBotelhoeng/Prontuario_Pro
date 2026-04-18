-- ============================================================
-- Prontuario-Pro — Schema Inicial
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABELAS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('medico', 'paciente')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.medicos (
  id               UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  crm              TEXT UNIQUE NOT NULL,
  especialidade    TEXT NOT NULL DEFAULT 'Clínica Geral',
  clinica_nome     TEXT,
  clinica_endereco TEXT,
  clinica_cnpj     TEXT,
  bio              TEXT
);

CREATE TABLE IF NOT EXISTS public.pacientes (
  id                   UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  cpf                  TEXT UNIQUE NOT NULL,
  data_nascimento      DATE,
  peso                 NUMERIC(5,2),
  altura               NUMERIC(5,2),
  tipo_sanguineo       TEXT,
  alergias             TEXT[],
  medico_principal_id  UUID REFERENCES public.medicos(id)
);

CREATE TABLE IF NOT EXISTS public.consultas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id   UUID REFERENCES public.medicos(id)   ON DELETE CASCADE NOT NULL,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
  data_hora   TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Aguardando'
                CHECK (status IN ('Confirmado','Aguardando','Finalizado','Em andamento','Cancelado')),
  tipo        TEXT NOT NULL DEFAULT 'Consulta de Rotina',
  observacoes TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prescricoes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id    UUID REFERENCES public.medicos(id)   ON DELETE CASCADE NOT NULL,
  paciente_id  UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
  consulta_id  UUID REFERENCES public.consultas(id),
  tipo_receita TEXT NOT NULL DEFAULT 'simples'
                CHECK (tipo_receita IN ('simples','controle','branca','azul','amarela')),
  medicamentos JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho','finalizada')),
  data_emissao TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.anamneses (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id              UUID REFERENCES public.medicos(id)   ON DELETE CASCADE NOT NULL,
  paciente_id            UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
  consulta_id            UUID REFERENCES public.consultas(id),
  queixa_principal       TEXT,
  historia_doenca        TEXT,
  antecedentes_pessoais  TEXT,
  antecedentes_familiares TEXT,
  medicamentos_uso       TEXT,
  alergias               TEXT,
  exame_fisico           TEXT,
  hipotese_diagnostica   TEXT,
  conduta                TEXT,
  sinais_vitais          JSONB,
  patologias             TEXT[],
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  titulo     TEXT NOT NULL,
  mensagem   TEXT NOT NULL,
  lida       BOOLEAN DEFAULT FALSE,
  tipo       TEXT DEFAULT 'sistema'
              CHECK (tipo IN ('consulta','receita','alerta','sistema')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "users_select_own_profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "medicos_select_profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.medicos WHERE id = auth.uid()));

-- medicos (qualquer autenticado pode listar médicos)
CREATE POLICY "authenticated_select_medicos"
  ON public.medicos FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "medicos_update_own"
  ON public.medicos FOR UPDATE USING (id = auth.uid());

-- pacientes
CREATE POLICY "pacientes_select_own"
  ON public.pacientes FOR SELECT USING (id = auth.uid());

CREATE POLICY "pacientes_update_own"
  ON public.pacientes FOR UPDATE USING (id = auth.uid());

CREATE POLICY "medicos_select_seus_pacientes"
  ON public.pacientes FOR SELECT
  USING (
    medico_principal_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.consultas
      WHERE medico_id = auth.uid() AND paciente_id = public.pacientes.id
    )
  );

-- consultas
CREATE POLICY "medicos_all_suas_consultas"
  ON public.consultas FOR ALL USING (medico_id = auth.uid());

CREATE POLICY "pacientes_select_suas_consultas"
  ON public.consultas FOR SELECT USING (paciente_id = auth.uid());

-- prescricoes
CREATE POLICY "medicos_all_suas_prescricoes"
  ON public.prescricoes FOR ALL USING (medico_id = auth.uid());

CREATE POLICY "pacientes_select_suas_prescricoes"
  ON public.prescricoes FOR SELECT USING (paciente_id = auth.uid());

-- anamneses
CREATE POLICY "medicos_all_suas_anamneses"
  ON public.anamneses FOR ALL USING (medico_id = auth.uid());

CREATE POLICY "pacientes_select_suas_anamneses"
  ON public.anamneses FOR SELECT USING (paciente_id = auth.uid());

-- notificacoes
CREATE POLICY "users_all_suas_notificacoes"
  ON public.notificacoes FOR ALL USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. TRIGGER: criar profile após signup
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'documento', '000000'),
      COALESCE(NEW.raw_user_meta_data->>'especialidade', 'Clínica Geral')
    );
  ELSE
    INSERT INTO public.pacientes (id, cpf)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'documento', '00000000000')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 4. FUNÇÕES AUXILIARES para login por CRM / CPF
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_email_by_crm(p_crm TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT p.email INTO v_email
  FROM public.profiles p
  JOIN public.medicos m ON m.id = p.id
  WHERE m.crm = p_crm;
  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_email_by_cpf(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT p.email INTO v_email
  FROM public.profiles p
  JOIN public.pacientes pa ON pa.id = p.id
  WHERE pa.cpf = p_cpf;
  RETURN v_email;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. ÍNDICES
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_consultas_medico   ON public.consultas(medico_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON public.consultas(paciente_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_prescricoes_medico   ON public.prescricoes(medico_id);
CREATE INDEX IF NOT EXISTS idx_prescricoes_paciente ON public.prescricoes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_anamneses_medico   ON public.anamneses(medico_id);
CREATE INDEX IF NOT EXISTS idx_anamneses_paciente ON public.anamneses(paciente_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user  ON public.notificacoes(user_id, lida);
