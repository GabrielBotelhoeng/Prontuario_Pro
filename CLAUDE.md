# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos de Desenvolvimento

```bash
npm run dev          # Dev server em http://localhost:8080
npm run build        # Build de produção (saída em dist/)
npm run build:dev    # Build de desenvolvimento
npm run lint         # ESLint
npm run test         # Testes uma vez
npm run test:watch   # Testes em modo watch
npm run preview      # Preview do build de produção
```

Para rodar um teste específico:

```bash
npx vitest run src/path/to/file.test.ts
```

## Arquitetura

**Prontuario-Pro** é um SPA React (frontend only) para gestão de prontuários médicos no Brasil. Sem backend configurado — dados são placeholder, React Query está pronto para integração futura.

### Fluxo principal

```
index.html → src/main.tsx → src/App.tsx (BrowserRouter + QueryClientProvider)
                                   ↓
                    15 rotas (páginas de auth + dashboards)
```

### Dois contextos de usuário

- **Médico** (`/medico/*`): Dashboard, prescrição digital, anamnese, agenda, monitoramento, painel IA
- **Paciente** (`/paciente/*`): Dashboard, prontuário, agendamento, receitas, busca de especialistas
- **Auth** (`/`, `/cadastro`, `/esqueci-senha`): Login unificado com toggle médico/paciente (CRM vs CPF)

### Layouts compartilhados

- `src/components/AuthLayout.tsx` — wrapper para páginas de autenticação com gradiente
- `src/components/DashboardLayout.tsx` — sidebar colapsível + header para páginas autenticadas
- `src/components/NavLink.tsx` — link de navegação com estado ativo

### Stack

| Camada          | Tecnologias                                                  |
| --------------- | ------------------------------------------------------------ |
| UI              | React 18 + TypeScript 5, shadcn/ui (Radix UI + Tailwind CSS) |
| Roteamento      | React Router DOM 6                                           |
| Formulários     | React Hook Form + Zod                                        |
| Estado servidor | TanStack React Query 5                                       |
| Ícones          | Lucide React                                                 |
| Gráficos        | Recharts                                                     |
| Temas           | next-themes (light/dark via CSS variables)                   |
| Build           | Vite 8 + SWC                                                 |
| Testes          | Vitest + Testing Library + jsdom                             |

### Path alias

`@/` → `src/` (configurado em `vite.config.ts` e `tsconfig.app.json`)

## Convenções importantes

- **TypeScript strict desabilitado** (`strictNullChecks: false`, `noImplicitAny: false`)
- **Idioma**: todo o código e UI em português (pt-BR)
- **Componentes UI** ficam em `src/components/ui/` (gerados via shadcn/ui CLI — não editar manualmente)
- **Utilitário de classes**: sempre usar `cn()` de `@/lib/utils` para combinar classes Tailwind
- **Cores**: sistema HSL via CSS variables em `src/index.css` — cor primária é roxa (267° 56% 53%)
- **Comentários `/* TODO: Implementar lógica no Cursor */`** indicam onde lógica de backend precisa ser integrada

## Configuração shadcn/ui

Para adicionar novos componentes:

```bash
npx shadcn@latest add [component-name]
```

Componentes vão para `src/components/ui/`. Configuração em `components.json` (estilo: default, base color: slate).
