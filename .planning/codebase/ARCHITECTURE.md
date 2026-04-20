# Architecture

**Analysis Date:** 2026-04-20

## Pattern Overview

**Overall:** Single-Page Application (SPA) with BaaS backend

**Key Characteristics:**
- Pure frontend React SPA — no server-side rendering, no API layer owned by this codebase
- All data persistence, auth, and RLS handled by Supabase (hosted Postgres + Auth)
- Role-based dual portal: separate UX trees for `medico` and `paciente` user types
- React Query as the server-state cache layer; no client-side global state store (Redux, Zustand, etc.)

## Layers

**Presentation Layer:**
- Purpose: Render UI, handle user interactions, format data for display
- Location: `src/pages/`, `src/components/`
- Contains: Page components, layout wrappers, shadcn/ui primitives
- Depends on: Hooks layer, AuthContext
- Used by: React Router route tree

**Hooks / Data Access Layer:**
- Purpose: Encapsulate all Supabase queries; expose typed, cached server state to pages
- Location: `src/hooks/`
- Contains: `useQuery` and `useMutation` wrappers around Supabase table calls
- Depends on: `src/lib/supabase.ts`, `src/lib/database.types.ts`, AuthContext
- Used by: Page components

**Auth / Context Layer:**
- Purpose: Session management, user identity resolution, cross-cutting auth state
- Location: `src/contexts/AuthContext.tsx`
- Contains: `AuthProvider`, `useAuth` hook
- Depends on: `src/lib/supabase.ts`, `src/lib/database.types.ts`
- Used by: All protected pages and hooks (via `useAuth()`)

**Infrastructure / Lib Layer:**
- Purpose: Supabase client singleton, TypeScript domain types, utility functions, UI helpers
- Location: `src/lib/`
- Contains: `supabase.ts`, `database.types.ts`, `utils.ts`, `errors.ts`, `masks.ts`
- Depends on: Environment variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Used by: All layers above

**Backend Layer (Supabase — external):**
- Purpose: Auth (email/password), Postgres storage, Row Level Security policies, RPCs
- Location: `supabase/migrations/` (schema DDL tracked in 5 migration files)
- Key RPCs: `get_email_by_crm`, `get_email_by_cpf`, `upsert_user_profile`
- Does not contain application code

## Data Flow

**Authenticated Page Load:**

1. `src/main.tsx` mounts `App` → `QueryClientProvider` + `BrowserRouter`
2. `AuthProvider` calls `supabase.auth.getSession()` on mount; sets `user`, `profile`, `medico`/`paciente`
3. React Router matches route; `ProtectedRoute` reads `loading` + `profile.tipo` from `useAuth()`
4. Page component calls domain hook (e.g., `useConsultasMedico()`)
5. Hook calls Supabase JS client with Postgres query (filtered by `user.id`)
6. React Query caches response under typed query key (e.g., `["consultas", "medico", userId]`)
7. Page renders with cached data; mutations call `qc.invalidateQueries()` to refresh

**Write Path (mutation):**

1. Page calls mutation hook (e.g., `useCreateConsulta()`)
2. `mutationFn` inserts to Supabase table, Supabase RLS enforces row ownership
3. `onSuccess` calls `qc.invalidateQueries()` with relevant query keys
4. React Query refetches affected queries automatically

**State Management:**
- Server state: TanStack React Query v5 (caching, background refetch, invalidation)
- Auth state: React Context (`AuthContext`) — `user`, `profile`, `medico`, `paciente`, `loading`
- UI state: Local `useState` within each page component
- No global client-side state store

## Authentication Flow

**Login (CRM / CPF):**

1. User enters CRM (médico) or CPF (paciente) + senha on `src/pages/Index.tsx`
2. `signIn(tipo, documento, senha)` in `AuthContext` selects RPC: `get_email_by_crm` or `get_email_by_cpf`
3. RPC called with original document value; if not found, retried with punctuation stripped (e.g., `123.456.789-00` → `12345678900`)
4. Email resolved from Supabase RPC → `supabase.auth.signInWithPassword({ email, password })`
5. `onAuthStateChange` fires → `loadUserData(userId)` fetches `profiles` row, then `medicos` or `pacientes` row depending on `profile.tipo`
6. Auth state populated: `user`, `profile`, and either `medico` or `paciente`

**Registration:**

1. `src/pages/Cadastro.tsx` collects nome, email, documento (CRM or CPF), senha, tipo, especialidade
2. `signUp()` calls `supabase.auth.signUp()` with metadata payload
3. If session exists (email confirmation disabled): `upsert_user_profile` RPC called as fallback for profile creation
4. Returns `{ needsConfirmation: boolean }` to page for conditional UI messaging

**Route Protection:**

- `ProtectedRoute` wraps all `/medico/*` and `/paciente/*` routes
- Shows spinner while `loading === true`
- Redirects to `/` if `!user`
- Redirects to correct dashboard if authenticated user accesses wrong portal (`requiredTipo` mismatch)

## Routing Structure

**Public Routes:**
```
/                   → Index.tsx (unified login: medico / paciente toggle)
/cadastro           → Cadastro.tsx
/esqueci-senha      → EsqueciSenha.tsx
```

**Protected: Médico (`requiredTipo="medico"`):**
```
/medico             → DashboardMedico.tsx
/medico/prescricao  → PrescricaoDigital.tsx
/medico/anamnese    → Anamnese.tsx
/medico/agenda      → Agenda.tsx
/medico/monitoramento → PainelMonitoramento.tsx
/medico/painel-ia   → PainelIA.tsx
```

**Protected: Paciente (`requiredTipo="paciente"`):**
```
/paciente           → DashboardPaciente.tsx
/paciente/prontuario → MeuProntuario.tsx
/paciente/agendamento → AgendaPaciente.tsx
/paciente/receitas  → ReceitasPaciente.tsx
/paciente/especialistas → Especialistas.tsx
```

**Catch-all:** `*` → `NotFound.tsx`

## Context Providers Hierarchy

```
<QueryClientProvider client={queryClient}>       ← React Query cache
  <TooltipProvider>                              ← shadcn/ui tooltip context
    <Toaster />                                  ← shadcn/ui toast (radix)
    <Sonner />                                   ← Sonner toast
    <BrowserRouter>
      <AuthProvider>                             ← Auth state: user/profile/medico/paciente
        <Routes>
          <ProtectedRoute>                       ← Auth guard per route
            <PageComponent>
              <DashboardLayout>                  ← Sidebar + header shell
```

`QueryClientProvider` wraps everything (including `AuthProvider`) so hooks can call React Query inside auth-dependent pages.

## Key Abstractions

**Domain Data Types (`src/lib/database.types.ts`):**
- `Profile` — base user (maps to `profiles` table, shared by both user types)
- `Medico` — extends profile via same `id`; has `crm`, `especialidade`, clinic fields
- `Paciente` — extends profile via same `id`; has `cpf`, health metadata, `medico_principal_id`
- `Consulta`, `Prescricao`, `Anamnese`, `Notificacao` — clinical entities with FK joins

**Supabase Query Pattern (all hooks follow this contract):**
```typescript
export function useConsultasMedico() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["consultas", "medico", user?.id],   // scoped by entity + role + userId
    enabled: !!user?.id,                           // never fires without auth
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(CONSULTAS_SELECT)                  // const at module top
        .eq("medico_id", user!.id)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data as Consulta[];
    },
  });
}
```

**Mutation Invalidation Pattern:**
```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ["consultas"] });   // broad prefix invalidation
  qc.invalidateQueries({ queryKey: ["proxima-consulta"] });
}
```

## Error Handling

**Strategy:** Throw-and-catch with user-facing Portuguese error messages

**Patterns:**
- Hooks `throw error` from Supabase on query/mutation failure; pages handle via React Query error state
- `AuthContext` methods throw `new Error(message)` with specific Portuguese messages for common Supabase errors (CRM not found, email not confirmed, invalid credentials)
- No global error boundary detected; errors surface per-component

## Cross-Cutting Concerns

**Notifications:** Dual toast system — shadcn/ui `Toaster` + Sonner `Sonner`, both mounted at app root
**Validation:** React Hook Form + Zod on form pages
**Theming:** CSS variables (HSL) in `src/index.css`; primary purple at `267° 56% 53%`; dark/light via `next-themes`
**Internationalization:** All UI text in pt-BR; `date-fns/locale/ptBR` for date formatting
**Masks/Formatting:** `src/lib/masks.ts` for CPF/CRM input masking; `src/lib/errors.ts` for error normalization

---

*Architecture analysis: 2026-04-20*
