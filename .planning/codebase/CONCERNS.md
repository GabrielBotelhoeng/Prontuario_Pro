# Codebase Concerns

**Analysis Date:** 2026-04-20

---

## Tech Debt

**TypeScript strict mode fully disabled:**
- Issue: Both `tsconfig.json` and `tsconfig.app.json` have `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals: false`, and `noUnusedParameters: false`. This means null/undefined access errors, missing type annotations, and dead code all pass silently at compile time.
- Files: `tsconfig.json`, `tsconfig.app.json`
- Impact: Runtime crashes from null dereferences are not caught at build time. Medical data handling (CPF, prescriptions, anamneses) can silently operate on null values. Refactoring is risky without type safety.
- Fix approach: Incrementally enable `strictNullChecks: true` first, fix null coalescing throughout `src/`, then enable `noImplicitAny`. Expect 50–100 type errors to surface initially.

**Hardcoded user names in AI pages:**
- Issue: `PainelIA.tsx` (line 196) and `PainelMonitoramento.tsx` (line 113) hardcode `userName="Dr. Carlos"` and `userRole="Clínica Geral"` instead of reading from `useAuth()`. The real authenticated user data is available.
- Files: `src/pages/PainelIA.tsx:196`, `src/pages/PainelMonitoramento.tsx:113`
- Impact: Every logged-in doctor sees "Dr. Carlos" in those pages regardless of their identity. This is a functional bug in production.
- Fix approach: Pass `profile?.nome` and `medico?.especialidade` from `useAuth()` to the `DashboardLayout` `userName`/`userRole` props, consistent with how `DashboardMedico.tsx` does it.

**Duplicated `navItems` array in every page:**
- Issue: Each of the 10 page components defines its own `navItems` array literal. The medico nav (6 items) is copy-pasted across `DashboardMedico.tsx`, `PrescricaoDigital.tsx`, `Anamnese.tsx`, `Agenda.tsx`, `PainelMonitoramento.tsx`, `PainelIA.tsx`. The paciente nav (4 items) is similarly duplicated across `DashboardPaciente.tsx`, `MeuProntuario.tsx`, `AgendaPaciente.tsx`, `ReceitasPaciente.tsx`, `Especialistas.tsx`.
- Files: All files in `src/pages/`
- Impact: Adding a nav item requires editing 5–6 files. A mismatch between nav arrays in different pages would go unnoticed.
- Fix approach: Extract to `src/config/nav.ts` exporting `medicoNavItems` and `pacienteNavItems`. Import in each page.

**`supabase.ts` has no env var validation:**
- Issue: `src/lib/supabase.ts` calls `createClient(supabaseUrl, supabaseAnonKey)` where both variables come from `import.meta.env` with no null/undefined check. If `.env` is missing or misconfigured, the client is created with `undefined` values and all Supabase calls fail silently or with confusing errors.
- Files: `src/lib/supabase.ts`
- Impact: Developer-hostile failures during onboarding; also risk of accidental undefined-URL client creation.
- Fix approach: Add a guard at module load: `if (!supabaseUrl || !supabaseAnonKey) throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set")`.

**`any` type casts in production code:**
- Issue: Several `any` casts exist in non-test files: `usePacientes.ts:51` (`c: any`), `DashboardPaciente.tsx:118` (`m as any`), `ReceitasPaciente.tsx:62` (`p.medicamentos as any[]`), and error catch clauses use `err: any`.
- Files: `src/hooks/usePacientes.ts:51`, `src/pages/DashboardPaciente.tsx:118`, `src/pages/ReceitasPaciente.tsx:62`
- Impact: Defeats type checking on patient and prescription data. Runtime field access errors cannot be detected statically.
- Fix approach: Type the Supabase join result shapes explicitly. The `medicamentos` field is already typed as `MedicamentoItem[]` in `database.types.ts` — the cast in `ReceitasPaciente.tsx` is unnecessary.

---

## Known Bugs

**Anamnese update not implemented (insert-only):**
- Symptoms: `useSalvarAnamnese` in `src/hooks/useAnamneses.ts` always calls `insert()`. There is no `useUpdateAnamnese` hook. If a doctor saves an anamnesis twice for the same patient/consultation, a duplicate record is created.
- Files: `src/hooks/useAnamneses.ts:60-67`
- Trigger: Any second save in `src/pages/Anamnese.tsx`
- Workaround: None in the UI; duplicate records accumulate in the database.

**ProtectedRoute race condition on profile load:**
- Symptoms: `ProtectedRoute` checks `profile?.tipo` to gate routes, but `loadUserData` in `AuthContext` runs after `setLoading(false)` is called during `onAuthStateChange`. The `loading` flag only gates the initial session fetch, not the secondary `loadUserData` call triggered by state changes.
- Files: `src/contexts/AuthContext.tsx:63-81`, `src/components/ProtectedRoute.tsx`
- Trigger: Page refresh while logged in; profile may momentarily be `null` while `loading` is already `false`, causing a redirect flash.
- Workaround: The effect is cosmetic in most cases (brief spinner or redirect that self-corrects), but could expose a protected page fragment before the `tipo` check resolves.

**`useTodosMedicos` is unauthenticated:**
- Symptoms: `useTodosMedicos` in `src/hooks/usePacientes.ts` has no `enabled: !!user?.id` guard and no user scoping. Any unauthenticated request that bypasses `ProtectedRoute` (or if RLS is misconfigured) would return the full doctor list.
- Files: `src/hooks/usePacientes.ts:25-37`
- Trigger: RLS policy on `medicos` table must be enforced server-side; frontend has no guard.

---

## Security Considerations

**CPF transmitted as plain text in RPC calls:**
- Risk: `signIn` calls `get_email_by_cpf` Supabase RPC passing the CPF string over the network. CPF is a sensitive personal identifier in Brazil (LGPD). There is no hashing or tokenization on the client side before the call.
- Files: `src/contexts/AuthContext.tsx:85-102`
- Current mitigation: HTTPS transport encrypts the call in transit; Supabase anon key restricts access.
- Recommendations: Ensure the `get_email_by_cpf` RPC uses `security definer` with minimal privilege and that RLS prevents direct table access via the anon key. Document LGPD compliance posture.

**No RLS enforcement visible client-side:**
- Risk: All data queries (`useMeusPacientes`, `useConsultasMedico`, etc.) rely entirely on Supabase RLS policies to restrict data. There are no client-side ownership checks beyond filtering by `user.id` in queries. If RLS policies are misconfigured, a doctor could read another doctor's patient data.
- Files: `src/hooks/usePacientes.ts`, `src/hooks/useConsultas.ts`, `src/hooks/usePrescricoes.ts`, `src/hooks/useAnamneses.ts`
- Current mitigation: Queries use `eq("medico_id", user!.id)` filters, which serve as a secondary layer.
- Recommendations: Audit all RLS policies on `pacientes`, `consultas`, `prescricoes`, `anamneses` tables. Add integration tests that verify cross-user data isolation.

**No input sanitization on free-text medical fields:**
- Risk: Fields like `queixa_principal`, `historia_doenca`, `conduta`, and medication names in `PrescricaoDigital` accept arbitrary text that goes directly into Supabase insert calls with no sanitization.
- Files: `src/pages/Anamnese.tsx`, `src/pages/PrescricaoDigital.tsx`
- Current mitigation: Supabase parameterizes queries (no SQL injection risk), but stored XSS could affect PDF exports or future rendering contexts.
- Recommendations: Sanitize HTML-special characters in free-text fields before display.

**`resetPassword` redirects to `/` without a token handler:**
- Risk: `resetPassword` sends a magic link with `redirectTo: ${window.location.origin}/`. The index page (`/`) is the login form and does not handle the `access_token` fragment or `type=recovery` parameter from Supabase. Users who click the reset link land on the login page with no feedback.
- Files: `src/contexts/AuthContext.tsx:159-164`, `src/pages/Index.tsx`
- Current mitigation: None.
- Recommendations: Implement a dedicated `/reset-senha` route that reads the session from the URL fragment and presents a new-password form.

---

## Performance Bottlenecks

**No pagination on any list query:**
- Problem: `useConsultasMedico` fetches all consultations, `usePrescricoesMedico` fetches all prescriptions, `useAnamnesesMedico` fetches all anamneses for the logged-in doctor with no `limit()` or cursor-based pagination.
- Files: `src/hooks/useConsultas.ts:16-27`, `src/hooks/usePrescricoes.ts:12-27`, `src/hooks/useAnamneses.ts:6-21`
- Cause: Supabase queries use `.select()` with `.order()` but no `.range()` or `.limit()`. As medical records accumulate over months, query payloads will grow unboundedly.
- Improvement path: Add `.range(0, 49)` with infinite scroll or page controls, or use TanStack Query's `useInfiniteQuery`.

**`PainelIA.tsx` is 693 lines in a single component:**
- Problem: The entire AI panel — chat, epidemic alerts, no-show prediction chart, protocol library, and footer status — is in one file with no sub-component extraction.
- Files: `src/pages/PainelIA.tsx`
- Cause: No decomposition into reusable components.
- Improvement path: Extract `ClinicalChat`, `EpidemicAlerts`, `NoShowChart`, `ProtocolLibrary` into `src/components/painel-ia/` sub-components.

**React Query client has no stale time configured:**
- Problem: `new QueryClient()` in `src/App.tsx:24` uses default settings: `staleTime: 0`. Every component mount refetches all queries immediately. Medical data (patient lists, prescriptions) does not change in real time and should be cached longer.
- Files: `src/App.tsx:24`
- Cause: Default `QueryClient` instantiation.
- Improvement path: Configure `defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } }` for a 5-minute stale window appropriate for medical records.

---

## Fragile Areas

**AuthContext `loadUserData` silently swallows errors:**
- Files: `src/contexts/AuthContext.tsx:36-61`
- Why fragile: If the `profiles` table query returns an error, `loadUserData` returns early and `profile` stays `null`. No error is surfaced to the user. The doctor/patient-specific query (lines 46–60) also silently casts to the target type with no error handling.
- Safe modification: Add error logging and surface a toast or error state when profile load fails. Replace the silent `if (!profileData) return` with an explicit error path.
- Test coverage: No tests exist for the auth flow.

**`ProtectedRoute` depends on `profile` being set before routing:**
- Files: `src/components/ProtectedRoute.tsx:22-24`
- Why fragile: `profile?.tipo` check at line 22 will pass as `undefined !== requiredTipo` when profile is still loading after initial auth, potentially redirecting authenticated users to the wrong dashboard on race conditions (see Known Bugs above).
- Safe modification: Add a second loading gate for `profile !== null` after `user !== null` before evaluating `profile.tipo`.

**`useUpdateConsultaStatus` does not validate allowed status transitions:**
- Files: `src/hooks/useConsultas.ts:117-125`
- Why fragile: Any string can be passed as `status`; the mutation does `update({ status }).eq("id", id)` with no client-side guard. The `Consulta` interface constrains status to 5 values but `NovaConsultaData.status` is typed as `string`.
- Safe modification: Type the `status` parameter in `useUpdateConsultaStatus` as `Consulta["status"]` and enforce the union type.

---

## Missing Critical Features

**AI chat has no backend integration:**
- Problem: `PainelIA.tsx` `handleSend` function (line 171) has a `// TODO` comment and returns a hardcoded stub response. The chat UI is fully rendered but non-functional.
- Blocks: The entire AI assistant feature, which is prominently featured in the product.
- Files: `src/pages/PainelIA.tsx:171-185`

**Epidemic alerts, no-show prediction, and protocol library are static mock data:**
- Problem: `epidemicAlerts`, `noShowData`, `protocols`, and chart data in `PainelIA.tsx` and `PainelMonitoramento.tsx` are hardcoded arrays. The "IA Insight" message is a static string. No real data is fetched.
- Files: `src/pages/PainelIA.tsx:63-135`, `src/pages/PainelMonitoramento.tsx:41-103`
- Blocks: Any production use of the monitoring and AI panels.

**Report generation is a stub:**
- Problem: "Gerar Relatório", "Visualizar", "Download PDF", and "Enviar por E-mail" buttons in `PainelMonitoramento.tsx` all have empty `onClick` handlers with `TODO` comments.
- Files: `src/pages/PainelMonitoramento.tsx:293-315`
- Blocks: Financial and clinical reporting features.

**CID selection and atestado generation are stubs:**
- Problem: "Selecionar CID" button (line 366) and "Gerar Atestado" button (line 404) in `Anamnese.tsx` have empty `onClick` handlers with `TODO` comments.
- Files: `src/pages/Anamnese.tsx:366`, `src/pages/Anamnese.tsx:404`
- Blocks: ICD-10 code selection workflow and medical certificate generation.

**Epidemiological map is a stub:**
- Problem: "Ver mapa interativo da região" button in `PainelIA.tsx` has an empty `onClick` with a `TODO` comment.
- Files: `src/pages/PainelIA.tsx:461-467`
- Blocks: Geographic disease monitoring feature.

**Password reset flow is incomplete:**
- Problem: The `resetPassword` function redirects to `/`, which has no handler for the Supabase recovery token. See Security Considerations.
- Files: `src/pages/EsqueciSenha.tsx`, `src/contexts/AuthContext.tsx:159-164`
- Blocks: Self-service password recovery for patients and doctors.

**Patient self-scheduling is read-only:**
- Problem: `AgendaPaciente.tsx` only reads and displays consultations from `useConsultasPaciente`. There is no form or mutation to create a new appointment from the patient side.
- Files: `src/pages/AgendaPaciente.tsx`
- Blocks: Patient-initiated appointment booking.

---

## Test Coverage Gaps

**No tests for authentication flows:**
- What's not tested: `signIn` (CRM/CPF lookup → email resolution → password auth), `signUp` with profile upsert fallback, `signOut`, session persistence across page reloads.
- Files: `src/contexts/AuthContext.tsx`
- Risk: Auth regressions go undetected. This is the critical path for all users.
- Priority: High

**No tests for React Query hooks:**
- What's not tested: `useMeusPacientes`, `useConsultasMedico`, `useCreateConsulta`, `useCreatePrescricao`, `useSalvarAnamnese`, and all other data hooks.
- Files: `src/hooks/useConsultas.ts`, `src/hooks/usePrescricoes.ts`, `src/hooks/useAnamneses.ts`, `src/hooks/usePacientes.ts`
- Risk: Supabase query regressions (wrong filters, missing joins, broken mutations) are invisible.
- Priority: High

**No component or integration tests:**
- What's not tested: None of the 13 page components or 4 layout/routing components have any rendering or interaction tests.
- Files: All files in `src/pages/` and `src/components/`
- Risk: Route protection logic, form validation, error state rendering all untested.
- Priority: Medium

**Existing tests are minimal:**
- `src/test/example.test.ts` is a placeholder (`expect(true).toBe(true)`). Only `masks.test.ts` and `errors.test.ts` test real logic, covering `src/lib/masks.ts` and `src/lib/errors.ts` only.
- Files: `src/test/example.test.ts`, `src/test/masks.test.ts`, `src/test/errors.test.ts`
- Risk: False sense of test coverage; CI passes even with 0% coverage of business logic.
- Priority: Medium

---

## Dependencies at Risk

**`react-day-picker` version mismatch:**
- Risk: `react-day-picker` is pinned to `^8.10.1` but the project uses `date-fns` v3. `react-day-picker` v8 requires `date-fns` v2. This combination can cause subtle date formatting bugs or peer dependency warnings.
- Impact: Calendar components may behave incorrectly for locale-specific date formatting.
- Migration plan: Upgrade to `react-day-picker@^9.x` which officially supports `date-fns` v3.

**`lucide-react` at `^0.462.0` (older major):**
- Risk: Lucide React has released v0.5+ with breaking icon renames. The caret range means a patch bump could not introduce breaking changes, but any future major upgrade will require icon name audits across all 13 page files.
- Impact: Low immediate risk; medium effort for future major upgrades.
- Migration plan: Pin exact version and plan a dedicated icon audit when upgrading.

**`next-themes` in a non-Next.js project:**
- Risk: `next-themes@^0.3.0` is designed for Next.js but used in a Vite/React SPA. The library works in SPAs but its primary maintainers target Next.js; SSR-related edge cases and future breaking changes may not be SPA-compatible.
- Impact: Low currently; theme persistence works via `localStorage`.
- Migration plan: Consider `@radix-ui/react-use-preference` or a lightweight custom theme provider if `next-themes` diverges.

---

*Concerns audit: 2026-04-20*
