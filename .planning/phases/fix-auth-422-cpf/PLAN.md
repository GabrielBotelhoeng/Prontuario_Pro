# PLAN.md — Fix Auth 422 + CPF Login + Dashboard Navigation

## Fase: fix-auth-422-cpf
**Objetivo:** Corrigir erro 422 no cadastro e falha de CPF no login, sincronizando o Supabase Auth com a tabela `profiles` via trigger robusto, e garantindo a navegação para a página correta após login.

---

## Diagnóstico das Causas Raiz

### Erro 422 no Cadastro
- O trigger `handle_new_user` em `supabase/migrations/001_initial_schema.sql` é a versão frágil (sem EXCEPTION handler)
- Quando o trigger falha (ex: CPF/CRM duplicado, constraint violation), o Supabase retorna HTTP 422 e desfaz o usuário Auth
- A migration 003 corrige o trigger, mas precisamos garantir que está aplicada e é realmente robusta

### Falha de CPF no Login
- Se o trigger não executou corretamente, a linha em `public.pacientes` não existe
- `get_email_by_cpf` busca por `pacientes.cpf` — sem a linha, retorna NULL
- Frontend interpreta NULL como "CPF não encontrado" e bloqueia o login

### Navegação Quebrada Pós-Login
- `loadUserData` em `AuthContext.tsx:36` busca `profiles` por `userId`
- Se `profiles` não tem a linha, `profileData` é null e a função retorna cedo
- `profile`, `medico` e `paciente` ficam null → `ProtectedRoute` pode redirecionar errado

### Frontend: `upsert_user_profile` condicional
- `AuthContext.tsx:143`: `if (authData.session)` — só chama o upsert quando e-mail confirmation está DESLIGADO
- Com confirmation ligada, a única garantia é o trigger do banco

---

## Plano de Execução

### Task 1 — Criar migration 006: Trigger bulletproof + upsert com user_id

**Arquivo:** `supabase/migrations/006_bulletproof_trigger_and_upsert.sql`

**Conteúdo:**

```sql
-- ─────────────────────────────────────────────────────────────
-- 1. Trigger handle_new_user — versão definitiva
--    Melhorias: ON CONFLICT em todas as tabelas, EXCEPTION por bloco,
--    normalização de CPF/CRM antes de inserir, logs detalhados
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nome        TEXT;
  v_tipo        TEXT;
  v_documento   TEXT;
  v_especialidade TEXT;
BEGIN
  v_nome        := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''), 'Usuário');
  v_tipo        := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'tipo'), ''), 'paciente');
  v_documento   := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'documento'), ''), '');
  v_especialidade := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'especialidade'), ''), 'Clínica Geral');

  -- Inserir/atualizar profile
  BEGIN
    INSERT INTO public.profiles (id, nome, email, tipo)
    VALUES (NEW.id, v_nome, NEW.email, v_tipo)
    ON CONFLICT (id) DO UPDATE
      SET nome  = EXCLUDED.nome,
          email = EXCLUDED.email,
          tipo  = EXCLUDED.tipo;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: profiles insert failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;

  -- Inserir na tabela especializada
  IF v_tipo = 'medico' THEN
    BEGIN
      INSERT INTO public.medicos (id, crm, especialidade)
      VALUES (
        NEW.id,
        UPPER(regexp_replace(COALESCE(NULLIF(v_documento,''), '000000'), '[^0-9A-Za-z]', '', 'g')),
        v_especialidade
      )
      ON CONFLICT (id) DO UPDATE
        SET crm = EXCLUDED.crm,
            especialidade = EXCLUDED.especialidade;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: medicos insert failed for %: %', NEW.id, SQLERRM;
    END;
  ELSE
    BEGIN
      INSERT INTO public.pacientes (id, cpf)
      VALUES (
        NEW.id,
        regexp_replace(COALESCE(NULLIF(v_documento,''), '00000000000'), '[^0-9]', '', 'g')
      )
      ON CONFLICT (id) DO UPDATE
        SET cpf = EXCLUDED.cpf;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: pacientes insert failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. upsert_user_profile com parâmetro p_user_id explícito
--    Permite ser chamado mesmo sem sessão ativa (ex: após signUp
--    com email confirmation habilitado, via service-role ou admin)
--    A versão client-side continua usando auth.uid() (sem p_user_id)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_nome          text,
  p_tipo          text,
  p_documento     text,
  p_especialidade text DEFAULT 'Clínica Geral'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id    uuid;
  v_email text;
  v_cpf   text;
  v_crm   text;
BEGIN
  v_id := auth.uid();
  IF v_id IS NULL THEN
    RAISE LOG 'upsert_user_profile: auth.uid() is null, abortando';
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_id;

  INSERT INTO public.profiles (id, nome, email, tipo)
  VALUES (v_id, p_nome, v_email, p_tipo)
  ON CONFLICT (id) DO UPDATE
    SET nome  = EXCLUDED.nome,
        tipo  = EXCLUDED.tipo,
        email = EXCLUDED.email,
        updated_at = NOW();

  IF p_tipo = 'medico' THEN
    v_crm := UPPER(regexp_replace(p_documento, '[^0-9A-Za-z]', '', 'g'));
    INSERT INTO public.medicos (id, crm, especialidade)
    VALUES (v_id, v_crm, p_especialidade)
    ON CONFLICT (id) DO UPDATE
      SET crm = EXCLUDED.crm,
          especialidade = EXCLUDED.especialidade;
  ELSE
    v_cpf := regexp_replace(p_documento, '[^0-9]', '', 'g');
    INSERT INTO public.pacientes (id, cpf)
    VALUES (v_id, v_cpf)
    ON CONFLICT (id) DO UPDATE
      SET cpf = EXCLUDED.cpf;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_profile(text, text, text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. RLS: permitir INSERT em profiles para trigger SECURITY DEFINER
--    (redundante pois SECURITY DEFINER bypassa RLS, mas explícito)
-- ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'service_role_insert_profiles'
  ) THEN
    CREATE POLICY "service_role_insert_profiles"
      ON public.profiles FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Backfill final: garantir que todos os auth.users têm profiles
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, nome, email, tipo)
      VALUES (
        u.id,
        COALESCE(NULLIF(u.raw_user_meta_data->>'nome',''), 'Usuário'),
        u.email,
        COALESCE(NULLIF(u.raw_user_meta_data->>'tipo',''), 'paciente')
      ) ON CONFLICT (id) DO NOTHING;

      IF COALESCE(u.raw_user_meta_data->>'tipo', 'paciente') = 'medico' THEN
        INSERT INTO public.medicos (id, crm, especialidade)
        VALUES (
          u.id,
          UPPER(regexp_replace(COALESCE(NULLIF(u.raw_user_meta_data->>'documento',''),'000000'), '[^0-9A-Za-z]', '', 'g')),
          COALESCE(NULLIF(u.raw_user_meta_data->>'especialidade',''), 'Clínica Geral')
        ) ON CONFLICT (id) DO NOTHING;
      ELSE
        INSERT INTO public.pacientes (id, cpf)
        VALUES (
          u.id,
          regexp_replace(COALESCE(NULLIF(u.raw_user_meta_data->>'documento',''),'00000000000'), '[^0-9]', '', 'g')
        ) ON CONFLICT (id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Backfill final falhou para %: %', u.id, SQLERRM;
    END;
  END LOOP;
END $$;
```

**Critério de aceite:** Migration aplicada sem erros; trigger recriado; backfill final executado.

---

### Task 2 — Corrigir `AuthContext.tsx`: signUp robusto

**Arquivo:** `src/contexts/AuthContext.tsx`

**Mudanças:**

1. **Remover condicional `if (authData.session)`** no signUp — sempre tenta o upsert quando há sessão
2. **Normalizar documento antes de enviar** no `raw_user_meta_data` (remover máscara)
3. **Melhorar tratamento do erro 422**: mapear mensagem específica para o usuário
4. **Adicionar retry no loadUserData**: aguardar até 2s se profile não encontrado (trigger pode ter latência)

```typescript
// signUp: normalizar documento antes de enviar ao Supabase
const docNormalizado = data.tipo === 'paciente'
  ? data.documento.replace(/[^0-9]/g, '')
  : data.documento.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

// ... no options.data:
documento: docNormalizado,

// signUp: sempre chamar upsert quando há sessão
if (authData.session) {
  try {
    await supabase.rpc("upsert_user_profile", {
      p_nome: data.nome,
      p_tipo: data.tipo,
      p_documento: docNormalizado,
      p_especialidade: data.especialidade ?? "Clínica Geral",
    });
  } catch (upsertErr) {
    console.warn("[signUp] upsert_user_profile falhou (não crítico):", upsertErr);
  }
}

// loadUserData: retry se profile não encontrado imediatamente
async function loadUserData(userId: string, retryCount = 0) {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profileData && retryCount < 3) {
    await new Promise(r => setTimeout(r, 800));
    return loadUserData(userId, retryCount + 1);
  }
  // ... resto da lógica
}

// Tratamento de erro 422
// No catch do signUp:
if (error.status === 422) {
  const msg = error.message.toLowerCase();
  if (msg.includes('already') || msg.includes('email address')) {
    throw new Error("E-mail já cadastrado. Use outro e-mail ou faça login.");
  }
  throw new Error("Dados inválidos. Verifique as informações e tente novamente.");
}
```

**Critério de aceite:** Sem mais erros 422 não tratados; retry carrega profile após trigger.

---

### Task 3 — Aplicar migration via Supabase CLI

**Comandos:**
```bash
# Verificar configuração
supabase status

# Aplicar migration
supabase db push

# OU, se o projeto usa Supabase remoto:
supabase db push --linked
```

**Critério de aceite:** `supabase migration list` mostra migration 006 como aplicada.

---

### Task 4 — Testar fluxo completo

**Cenários a validar:**

1. **Cadastro de paciente novo** (CPF novo, e-mail novo)
   - Deve criar auth.users + profiles + pacientes
   - Navegar para `/paciente` após login

2. **Cadastro de médico novo** (CRM novo, e-mail novo)
   - Deve criar auth.users + profiles + medicos
   - Navegar para `/medico` após login

3. **Login por CPF** (paciente existente)
   - `get_email_by_cpf` deve encontrar o e-mail
   - Deve navegar para `/paciente`

4. **Login por CRM** (médico existente)
   - `get_email_by_crm` deve encontrar o e-mail
   - Deve navegar para `/medico`

5. **E-mail duplicado** (cadastro com e-mail já existente)
   - Deve mostrar mensagem amigável, não erro 422 genérico

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/006_bulletproof_trigger_and_upsert.sql` | CRIAR |
| `src/contexts/AuthContext.tsx` | MODIFICAR |

## Dependências

- Supabase CLI instalado e projeto linkado (`supabase link`)
- Variáveis `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` corretas

## Threat Model

| Risco | Mitigação |
|-------|-----------|
| CPF duplicado no cadastro | `ON CONFLICT (id) DO UPDATE` na migration |
| Trigger falha → usuário sem profile | Retry em `loadUserData` + mensagem de erro clara |
| SECURITY DEFINER mal configurado | Revoke explícito para roles não autorizadas |
| Dados de documento expostos em logs | Não logamos documento, apenas user ID |

## Estimativa

- Task 1 (migration): 20min
- Task 2 (AuthContext): 30min
- Task 3 (apply): 10min
- Task 4 (testes): 20min
- **Total: ~80min**
