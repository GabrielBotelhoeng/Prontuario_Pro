# Coding Conventions

**Analysis Date:** 2026-04-20

## TypeScript Settings

**Configuration file:** `tsconfig.app.json`

**Key settings (permissive mode):**
- `strict: false` — strict mode is disabled
- `noImplicitAny: false` — implicit `any` is allowed
- `noUnusedLocals: false` — unused variables are not flagged
- `noUnusedParameters: false` — unused parameters are not flagged
- `skipLibCheck: true` — library type checking skipped
- `noFallthroughCasesInSwitch: false` — switch fallthrough allowed
- `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`
- `isolatedModules: true` — required for SWC build

**Implication for new code:** TypeScript is used primarily for documentation and IDE support, not strict type safety. Type assertions (`as SomeType`) are common and acceptable. Avoid introducing strict-mode violations that would break the existing permissive baseline.

## Language

**All UI text, variable names, comments, and labels must be in Portuguese (pt-BR).** This is a hard requirement for the entire project.

Examples from the codebase:
- State variables: `loading`, `erro`, `salvando`, `aceito`
- Error messages: `"Email ou senha incorretos"`, `"As senhas não coincidem."`
- UI labels: `"Criar nova conta"`, `"Selecione seu perfil para começar"`
- Comments: `"// Versão só com dígitos/letras (sem pontuação de máscara)"`

**Exception:** English is used for technical identifiers that map to database column names or external API fields (e.g., `medico_id`, `created_at`, `tipo_receita`).

## Naming Conventions

**Files:**
- Pages: PascalCase matching the route name — `DashboardMedico.tsx`, `PrescricaoDigital.tsx`, `EsqueciSenha.tsx`
- Hooks: camelCase with `use` prefix — `usePacientes.ts`, `useConsultas.ts`, `usePrescricoes.ts`
- Contexts: PascalCase with `Context` suffix — `AuthContext.tsx`
- Layouts: PascalCase with `Layout` suffix — `DashboardLayout.tsx`, `AuthLayout.tsx`
- Utilities: camelCase — `utils.ts`, `masks.ts`, `errors.ts`
- Types: camelCase — `database.types.ts`

**Components:**
- Exported as PascalCase named function or `const`: `export default function DashboardLayout(...)` or `const Cadastro = () => ...`
- Inline helper components declared at file bottom: `const FormField = (...) => ...`

**Hooks:**
- Always prefixed with `use`: `useAuth`, `useMeusPacientes`, `useCreatePrescricao`
- Query hooks named after the resource + role context: `useConsultasMedico`, `useConsultasPaciente`
- Mutation hooks prefixed with verb: `useCreatePrescricao`, `useUpdateConsultaStatus`

**Variables/State:**
- camelCase throughout: `userType`, `cpfCrm`, `emailConfirmRequired`
- Boolean loading states: `loading`, `salvando`
- Error state: `erro` (Portuguese)
- Form data consolidated in a single `form` object with `useState`

**TypeScript interfaces:**
- PascalCase: `AuthContextType`, `SignUpData`, `FormFieldProps`, `NavItem`
- Database entity interfaces in `src/lib/database.types.ts`: `Profile`, `Medico`, `Paciente`, `Consulta`, `Prescricao`, `Anamnese`

## Import Organization

**Order used in the codebase:**
1. React and React ecosystem (`react`, `react-router-dom`, `@tanstack/react-query`)
2. Third-party libraries (`lucide-react`, `@supabase/supabase-js`)
3. Internal path-aliased imports (`@/components/...`, `@/contexts/...`, `@/hooks/...`, `@/lib/...`)
4. Asset imports (`@/assets/logo-icon.png`)

**Path Alias:**
- `@/` maps to `src/` — configured in both `vite.config.ts` and `tsconfig.app.json`
- Use `@/` for all cross-directory imports; relative paths (`../`) are not used

```typescript
// Correct
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { maskCPF } from "@/lib/masks";

// Never use relative paths like this
import { useAuth } from "../../contexts/AuthContext";
```

## Styling Conventions

**Framework:** Tailwind CSS 3 with shadcn/ui component library (Radix UI primitives)

**Class merging utility — always use `cn()`:**
```typescript
import { cn } from "@/lib/utils";

// Combine static + conditional classes
<div className={cn(
  "flex items-center rounded-xl",
  collapsed ? "px-0 justify-center" : "px-4",
  isActive && "bg-primary/15 font-semibold"
)} />
```

**Color system:**
- All colors reference CSS variables via HSL: `hsl(var(--primary))`, `hsl(var(--border))`
- Primary brand color: purple at `267° 56% 53%` — defined in `src/index.css`
- Semantic tokens: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `bg-muted`
- Opacity modifiers common: `bg-primary/10`, `text-white/65`, `border-white/10`

**Border radius:** Rounded corners using `rounded-xl` (most common), `rounded-2xl`, `rounded-lg`

**Inline styles:** Used for complex gradients and mask effects that cannot be expressed in Tailwind:
```typescript
style={{
  background: "linear-gradient(180deg, hsl(267 45% 24%) 0%, ...)",
  maskImage: "radial-gradient(...)",
}}
```

**Dark mode:** Supported via `next-themes` + `darkMode: ["class"]` in Tailwind config. CSS variables switch values based on `.dark` class on `<html>`.

**shadcn/ui components:**
- Live in `src/components/ui/` — do NOT edit manually
- Add new components via: `npx shadcn@latest add [component-name]`
- Config: `components.json` (style: default, base color: slate)
- Import from `@/components/ui/[component]`

## Form Patterns

**Note:** React Hook Form + Zod are installed but currently **not used** for page-level forms. Existing forms use manual `useState` + imperative validation.

**Current pattern (used in `Index.tsx`, `Cadastro.tsx`):**
```typescript
const [form, setForm] = useState({
  nome: "",
  email: "",
  documento: "",
  senha: "",
});

// Generic field updater
const update =
  (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

// Validation inline in handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (form.senha !== form.confirmar) {
    setErro("As senhas não coincidem.");
    return;
  }
  // ...
};
```

**Input masking:** Apply masks on `onChange` using utilities from `@/lib/masks`:
```typescript
import { maskCPF, filterCRM, maskPhone, maskCEP } from "@/lib/masks";

const updateDocumento = (e: React.ChangeEvent<HTMLInputElement>) => {
  const masked = profile === "paciente"
    ? maskCPF(e.target.value)
    : filterCRM(e.target.value);
  setForm((f) => ({ ...f, documento: masked }));
};
```

**Error display:**
```tsx
{erro && (
  <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2.5">
    {erro}
  </p>
)}
```

## Component Design Patterns

**Functional components only** — no class components used anywhere.

**Context pattern:**
```typescript
// Create context with undefined default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider wraps children
export function AuthProvider({ children }: { children: ReactNode }) { ... }

// Hook throws if used outside provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
```

**Page component export pattern:**
```typescript
// Named arrow function const, default export at end
const Cadastro = () => {
  // ...
};

export default Cadastro;
```

**Layout component export pattern:**
```typescript
// Named function, default export inline
export default function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  // ...
}
```

**Inline sub-components:** Small reusable pieces defined at the bottom of the same file rather than in separate files:
```typescript
// Defined after main component in Cadastro.tsx
const FormField = ({ label, icon: Icon, ... }: FormFieldProps) => (
  <div className="space-y-1.5">...</div>
);
```

## Data Fetching Patterns

**All server data fetching uses TanStack React Query v5.** Direct Supabase calls outside of query hooks are not used.

**Query hook pattern:**
```typescript
export function useConsultasMedico() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["consultas", "medico", user?.id],  // array with resource + scope + userId
    enabled: !!user?.id,                           // always guard with user presence
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(CONSULTAS_SELECT)
        .eq("medico_id", user!.id)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data as Consulta[];
    },
  });
}
```

**Mutation hook pattern:**
```typescript
export function useCreatePrescricao() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: NovaPrescricaoData) => {
      const { data: result, error } = await supabase
        .from("prescricoes")
        .insert({ ...data, medico_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return result as Prescricao;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prescricoes"] }),
  });
}
```

**SELECT constants:** Reusable select strings defined as module-level `const` at top of hook file:
```typescript
const CONSULTAS_SELECT = `
  *,
  paciente:pacientes(cpf, profile:profiles(nome, email)),
  medico:medicos(crm, especialidade, clinica_nome, profile:profiles(nome, email))
`;
```

## Error Handling

**Strategy:** Errors are thrown from async functions and caught at the call site with `try/catch`.

```typescript
// In hooks — throw on Supabase error
if (error) throw error;

// In pages — catch and set erro state
try {
  await signIn(userType, cpfCrm.trim(), senha);
} catch (err: any) {
  setErro(err.message ?? "Erro ao fazer login.");
} finally {
  setLoading(false);
}
```

**Error translation:** Supabase English error messages are translated to Portuguese via `translateSupabaseError()` from `@/lib/errors`.

**Logging:** `console.error()` used for debug logging in `AuthContext.tsx` for RPC errors. Prefixed with `[signIn]` context tag.

## Module Exports

**Hooks:** Named exports only — no default exports from hook files:
```typescript
export function useMeusPacientes() { ... }
export function usePacienteByConsultas() { ... }
```

**Contexts:** Named exports for Provider and hook:
```typescript
export function AuthProvider(...) { ... }
export function useAuth() { ... }
```

**Pages:** Default export only:
```typescript
export default Cadastro;
```

**Utilities:** Named exports:
```typescript
export function maskCPF(...) { ... }
export function cn(...) { ... }
export function translateSupabaseError(...) { ... }
```

---

*Convention analysis: 2026-04-20*
