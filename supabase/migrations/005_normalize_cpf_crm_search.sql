-- ─────────────────────────────────────────────────────────────
-- Busca normalizada: CPF e CRM ignoram formatação (máscaras)
-- Isso garante que "123.456.789-00" e "12345678900" encontram
-- o mesmo registro no banco.
-- ─────────────────────────────────────────────────────────────

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
  WHERE regexp_replace(pa.cpf, '[^0-9]', '', 'g') =
        regexp_replace(p_cpf,  '[^0-9]', '', 'g');
  RETURN v_email;
END;
$$;

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
  WHERE upper(regexp_replace(m.crm,  '[^0-9A-Za-z]', '', 'g')) =
        upper(regexp_replace(p_crm,  '[^0-9A-Za-z]', '', 'g'));
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_cpf(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_crm(text) TO anon, authenticated;

-- Normaliza CPFs já armazenados: remove pontos e traços
-- (mantém consistência para futuras buscas diretas)
UPDATE public.pacientes
SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
WHERE cpf ~ '[^0-9]';

-- Normaliza CRMs já armazenados: remove separadores, uppercase
UPDATE public.medicos
SET crm = upper(regexp_replace(crm, '[^0-9A-Za-z]', '', 'g'))
WHERE crm ~ '[^0-9A-Z]';
