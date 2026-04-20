# Technology Stack

**Analysis Date:** 2026-04-20

## Languages

**Primary:**
- TypeScript 5.8.3 — All application source code in `src/`
- SQL — Supabase migrations in `supabase/migrations/`

**Secondary:**
- JavaScript — Config files (`postcss.config.js`, `eslint.config.js`, `vite.config.ts` compiled from TS)

## Runtime

**Environment:**
- Browser (SPA — no server-side rendering)
- Node.js 18+ (development tooling only; no `.nvmrc` or engine constraint declared)

**Package Manager:**
- npm (primary — `package-lock.json` present)
- bun (also present — `bun.lock`, `bun.lockb`; secondary/experimental)
- Lockfiles: both `package-lock.json` and `bun.lock` committed

## Frameworks

**Core:**
- React 18.3.1 — UI rendering, SPA
- React Router DOM 6.30.1 — Client-side routing (17 routes)
- Vite 8.0.8 — Build tool and dev server (port 8080)

**Styling:**
- Tailwind CSS 3.4.17 — Utility-first CSS via `tailwind.config.ts`
- shadcn/ui — Component system built on Radix UI + Tailwind (config: `components.json`, style: default, base color: slate)
- next-themes 0.3.0 — Light/dark theme switching via CSS variables

**State & Data:**
- TanStack React Query 5.83.0 — Server state management, caching, query lifecycle
- React Hook Form 7.61.1 — Form state management
- Zod 3.25.76 — Schema validation (used with `@hookform/resolvers`)

**Testing:**
- Vitest 3.2.4 — Test runner (config: `vitest.config.ts`)
- Testing Library/React 16.0.0 — Component testing utilities
- Testing Library/jest-dom 6.6.0 — DOM matchers
- jsdom 29.0.2 — Browser environment simulation

**Build/Dev:**
- @vitejs/plugin-react-swc 3.11.0 — React fast refresh + SWC compiler (replaces Babel)
- PostCSS 8.5.6 + autoprefixer 10.4.21 — CSS processing
- lovable-tagger 1.1.13 — Dev-only component tagging (active only in `development` mode)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.103.3 — Only backend client; all data access, auth, and RPC calls go through this. Initialized at `src/lib/supabase.ts`
- `react` + `react-dom` 18.3.1 — Core UI framework
- `@tanstack/react-query` 5.83.0 — All server data fetching uses this; losing it breaks all hooks in `src/hooks/`

**UI Components (Radix UI primitives — full list):**
- `@radix-ui/react-accordion` 1.2.11
- `@radix-ui/react-alert-dialog` 1.1.14
- `@radix-ui/react-avatar` 1.1.10
- `@radix-ui/react-checkbox` 1.3.2
- `@radix-ui/react-dialog` 1.1.14
- `@radix-ui/react-dropdown-menu` 2.1.15
- `@radix-ui/react-label` 2.1.7
- `@radix-ui/react-popover` 1.1.14
- `@radix-ui/react-progress` 1.1.7
- `@radix-ui/react-select` 2.2.5
- `@radix-ui/react-tabs` 1.1.12
- `@radix-ui/react-toast` 1.2.14
- `@radix-ui/react-tooltip` 1.2.7
- (+ 10 more Radix primitives — see `package.json` for full list)

**UI Utilities:**
- `clsx` 2.1.1 + `tailwind-merge` 2.6.0 — Combined into `cn()` utility at `src/lib/utils.ts`
- `class-variance-authority` 0.7.1 — Variant-based component styles (used inside shadcn/ui components)
- `lucide-react` 0.462.0 — Icon library
- `recharts` 2.15.4 — Charts (used in monitoring/dashboard pages)
- `date-fns` 3.6.0 — Date formatting and manipulation
- `sonner` 1.7.4 — Toast notifications (alongside Radix toast)
- `embla-carousel-react` 8.6.0 — Carousel component
- `react-day-picker` 8.10.1 — Calendar/date picker UI
- `cmdk` 1.1.1 — Command palette primitive
- `vaul` 0.9.9 — Drawer/sheet primitive
- `input-otp` 1.4.2 — OTP input primitive
- `react-resizable-panels` 2.1.9 — Resizable layout panels

**Infrastructure:**
- `supabase` 2.92.1 (devDependency) — Supabase CLI for running migrations locally

## Configuration

**TypeScript:**
- Config files: `tsconfig.json` (root), `tsconfig.app.json` (app), `tsconfig.node.json` (node tooling)
- `strict: false` — TypeScript strict mode disabled
- `strictNullChecks: false` — Null checks disabled (see CONCERNS.md)
- `noImplicitAny: false` — Implicit any allowed
- Target: `ES2020`, module resolution: `bundler`
- Path alias: `@/` → `src/`

**Linting:**
- Config: `eslint.config.js` (flat config format, ESLint 9)
- Extends: `js.configs.recommended` + `tseslint.configs.recommended`
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- `@typescript-eslint/no-unused-vars`: off

**Build:**
- Config: `vite.config.ts`
- Dev server: `host: "::"`, `port: 8080`, HMR overlay disabled
- Path alias: `@` → `./src`
- React deduplication enforced for: `react`, `react-dom`, `@tanstack/react-query`, `@tanstack/query-core`
- Output directory: `dist/`

**Environment:**
- Variables loaded via Vite's `import.meta.env`
- Required prefix for browser exposure: `VITE_`
- Config: `.env` file (present, not committed)

**Tailwind:**
- Config: `tailwind.config.ts`
- Dark mode: class-based
- Colors: HSL CSS variables (primary: purple ~267° 56% 53%)
- Custom animations: accordion-down, accordion-up
- Plugin: `tailwindcss-animate`
- Typography plugin: `@tailwindcss/typography` (devDependency)

**shadcn/ui:**
- Config: `components.json`
- Style: default, base color: slate, CSS variables: true
- Components directory: `src/components/ui/` — do NOT edit manually; use `npx shadcn@latest add [name]`

## Platform Requirements

**Development:**
- Node.js 18+ (implied by Vite 8 and modern dependencies)
- npm or bun as package manager
- Supabase project with URL and anon key

**Production:**
- Static file hosting (SPA with no SSR)
- Any CDN or static host (Vercel, Netlify, S3+CloudFront, etc.)
- No server process required at runtime
- All backend logic handled by Supabase (hosted PostgreSQL + Auth + Edge Functions)

---

*Stack analysis: 2026-04-20*
