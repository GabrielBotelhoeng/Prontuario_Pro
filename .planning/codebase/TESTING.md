# Testing Patterns

**Analysis Date:** 2026-04-20

## Test Framework

**Runner:**
- Vitest 3.x
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in (`expect`, `describe`, `it`) — imported explicitly from `"vitest"`
- `@testing-library/jest-dom` 6.x — extended matchers (imported via setup file)

**DOM Environment:**
- jsdom 29.x — browser-like environment for React component testing

**Run Commands:**
```bash
npm run test          # Run all tests once (vitest run)
npm run test:watch    # Watch mode — re-runs on file change (vitest)
npx vitest run src/path/to/file.test.ts  # Run a specific test file
```

Coverage is not configured — no `--coverage` script or threshold enforcement.

## Test File Organization

**Location:** All test files live in `src/test/` as a flat directory. Tests are NOT co-located with source files.

**Naming pattern:** `{subject}.test.ts` (lowercase, kebab-case subject)

**Current test files:**
```
src/test/
├── setup.ts           # Global test setup (not a test file)
├── example.test.ts    # Placeholder smoke test
├── masks.test.ts      # Unit tests for src/lib/masks.ts
└── errors.test.ts     # Unit tests for src/lib/errors.ts
```

**File extensions:** `.test.ts` for pure utility tests. `.test.tsx` for component tests (none currently exist).

**Vitest include pattern:** `src/**/*.{test,spec}.{ts,tsx}` — catches both `.test.ts` and `.spec.ts` anywhere under `src/`.

## Global Setup

**Setup file:** `src/test/setup.ts`

```typescript
import "@testing-library/jest-dom";

// Polyfill window.matchMedia (not available in jsdom)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

This setup runs before every test file. The `matchMedia` polyfill is required because shadcn/ui and Tailwind responsive utilities reference it.

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";
import { maskCPF } from "@/lib/masks";

describe("maskCPF", () => {
  it("formata CPF completo", () => {
    expect(maskCPF("12345678900")).toBe("123.456.789-00");
  });

  it("formata parcialmente enquanto digita", () => {
    expect(maskCPF("123")).toBe("123");
    expect(maskCPF("12345")).toBe("123.45");
  });
});
```

**Key patterns:**
- `describe` wraps tests for each exported function
- `it` descriptions written in Portuguese, describing the expected behavior
- Imports use the `@/` path alias (resolved via `vitest.config.ts`)
- No `beforeEach`/`afterEach` used in existing tests (pure function tests have no setup needs)
- Vitest globals are enabled (`globals: true` in config), but tests still import explicitly — follow the explicit import pattern

## Existing Test Coverage

### `src/test/masks.test.ts` — covers `src/lib/masks.ts`

| Function | Test cases |
|----------|-----------|
| `maskCPF` | Full CPF formatting, overflow trim, non-digit stripping, partial input, empty string |
| `filterCRM` | Uppercase conversion, invalid char removal, slash/dash preservation, length limit |
| `maskPhone` | 11-digit mobile format, 10-digit landline format |
| `maskCEP` | Full CEP format, overflow trim |

### `src/test/errors.test.ts` — covers `src/lib/errors.ts`

| Function | Test cases |
|----------|-----------|
| `translateSupabaseError` | Invalid credentials, duplicate user, unconfirmed email, short password, unknown error fallback, case-insensitive matching |

### `src/test/example.test.ts` — placeholder

```typescript
describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

This is a scaffolding placeholder. It does not test any project code.

## What Is NOT Tested

The following areas have zero test coverage:

**React Components:**
- All pages in `src/pages/` — `Index.tsx`, `Cadastro.tsx`, `DashboardMedico.tsx`, `PrescricaoDigital.tsx`, etc.
- All layout components — `DashboardLayout.tsx`, `AuthLayout.tsx`
- `ProtectedRoute.tsx` — route guard logic

**Contexts:**
- `src/contexts/AuthContext.tsx` — `signIn`, `signUp`, `signOut`, `resetPassword`, session loading logic

**Hooks:**
- `src/hooks/usePacientes.ts` — `useMeusPacientes`, `usePacienteByConsultas`, `useTodosMedicos`
- `src/hooks/useConsultas.ts` — all query and mutation hooks
- `src/hooks/usePrescricoes.ts` — all query and mutation hooks
- `src/hooks/useAnamneses.ts`

**Utilities:**
- `src/lib/supabase.ts` — client configuration
- `src/lib/utils.ts` — `cn()` helper (though trivial)

## Mocking

No mocking infrastructure is currently established. The existing tests are for pure utility functions that require no mocks.

When writing component or hook tests that need Supabase, the recommended approach will be to mock `@/lib/supabase`:

```typescript
// Pattern to adopt when writing hook/component tests
import { vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));
```

React Query hooks should be tested by wrapping with a `QueryClientProvider`:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

const { result } = renderHook(() => useMeusPacientes(), { wrapper });
```

## Testing Guidelines

**Write test descriptions in Portuguese** to match the project language convention:
```typescript
it("formata CPF completo", ...)        // correct
it("should format complete CPF", ...)  // incorrect for this project
```

**Test pure utility functions first** — `src/lib/` is the highest-value, lowest-effort target for new tests.

**Place test files in `src/test/`** — do not co-locate with source files (current convention).

**Name test files after the source module:** `masks.test.ts` tests `masks.ts`, `errors.test.ts` tests `errors.ts`.

**Use the `@/` path alias** in test imports, not relative paths.

---

*Testing analysis: 2026-04-20*
