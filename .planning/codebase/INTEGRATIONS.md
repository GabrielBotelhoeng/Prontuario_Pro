# External Integrations

**Analysis Date:** 2026-04-20

## APIs & External Services

**Backend-as-a-Service:**
- Supabase — The sole external service. Provides PostgreSQL database, Auth, Row Level Security, and RPC functions.
  - SDK/Client: `@supabase/supabase-js` ^2.103.3
  - Client initialized: `src/lib/supabase.ts`
  - Auth: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  - CLI (dev): `supabase` ^2.92.1 (devDependency) — used for running local migrations

No other third-party APIs or external HTTP services are integrated.

## Data Storage

**Databases:**
- PostgreSQL (hosted on Supabase)
  - Connection: `VITE_SUPABASE_URL` (anon/public access via RLS)
  - Client: `@supabase/supabase-js` `createClient()` — direct table queries and RPC calls
  - Schema defined via SQL migrations in `supabase/migrations/`
  - Tables: `profiles`, `medicos`, `pacientes`, `consultas`, `prescricoes`, `anamneses`, `notificacoes`
  - All queries go through the singleton exported from `src/lib/supabase.ts`

**File Storage:**
- Not implemented. No `supabase.storage` calls detected anywhere in `src/`.

**Caching:**
- TanStack React Query in-memory cache (client-side only)
- No server-side or persistent cache layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email/password)
  - Implementation: `src/contexts/AuthContext.tsx`
  - Login flow: resolve email via RPC (`get_email_by_crm` for doctors, `get_email_by_cpf` for patients) → `supabase.auth.signInWithPassword()`
  - Registration: `supabase.auth.signUp()` + fallback RPC `upsert_user_profile` if DB trigger doesn't fire
  - Password reset: `supabase.auth.resetPasswordForEmail()` with redirect to `window.location.origin + "/"`
  - Session: managed via `supabase.auth.getSession()` + `supabase.auth.onAuthStateChange()` listener
  - No OAuth providers (Google, GitHub, etc.) detected

**RPCs called from client:**

| RPC Name | Called From | Purpose |
|---|---|---|
| `get_email_by_crm` | `src/contexts/AuthContext.tsx` | Resolve doctor email from CRM number |
| `get_email_by_cpf` | `src/contexts/AuthContext.tsx` | Resolve patient email from CPF number |
| `upsert_user_profile` | `src/contexts/AuthContext.tsx` | Fallback profile creation on signup |

**Route Protection:**
- `src/components/ProtectedRoute.tsx` — redirects unauthenticated users to `/`, and wrong user type (`medico`/`paciente`) to their correct dashboard

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, LogRocket, Datadog, or equivalent integration detected.

**Logs:**
- `console.error()` calls only, scattered in `src/contexts/AuthContext.tsx`. No structured logging framework.

**Analytics:**
- None detected.

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in the repository. Project produces a static bundle in `dist/` (`vite build`). Compatible with any static host (Vercel, Netlify, etc.).

**CI Pipeline:**
- No CI configuration files detected (no `.github/workflows/`, `.gitlab-ci.yml`, etc.).

## Environment Configuration

**Required environment variables:**

| Variable | Description | Where Used |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | `src/lib/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key | `src/lib/supabase.ts` |

These are the **only** two env vars consumed by the application. Both are prefixed with `VITE_` and exposed to the browser bundle via Vite's `import.meta.env`.

**Secrets location:**
- `.env` file at project root (present, git-ignored). No `.env.example` committed.
- Both variables are public-facing (anon key + URL) — not server secrets. Access is controlled by Supabase RLS policies.

## Webhooks & Callbacks

**Incoming:**
- None. No webhook endpoint handlers in the codebase (frontend-only SPA).

**Outgoing:**
- None explicitly configured.
- Supabase Auth password reset uses `redirectTo: window.location.origin + "/"` as a callback URL — this is handled by Supabase's email link, not an outgoing webhook.

## Realtime

- Not implemented. No `supabase.channel()`, `supabase.realtime`, or `.on('postgres_changes', ...)` calls detected. All data is fetched via React Query polling/manual refetch.

---

*Integration audit: 2026-04-20*
