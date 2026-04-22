---
title: Prontuário Pro — Backlog
tags:
  - projeto
  - prontuario-pro
  - desenvolvimento
date: 2026-04-21
status: em-andamento
---

# Prontuário Pro — Backlog

## Fase 2 — Em andamento

### ✅ Concluído
- [x] Bug login email confirmation
- [x] Usuário médico consegue logar
- [x] Usuário paciente consegue logar

### 🔄 Em progresso
- [ ] F2.1 — Máscara CPF (limitador 14 chars)
- [ ] F2.2 — Máscara CRM (limitador 9 chars)
- [ ] F2.3 — Substituir dados mockados por dados reais
- [ ] F2.4 — Interligação médico ↔ paciente (agendamentos)
- [ ] F2.5 — Prescrição em tempo real (Supabase Realtime)

### 📋 Próximas fases
- [ ] Fase 3 — Upload de exames/documentos
- [ ] Fase 4 — Dashboard com métricas reais
- [ ] Fase 5 — Features de IA (sugestão de CID, resumo)

---

## Plano de execução Fase 2 (GSD)

> [!info] Auditoria do codebase
> A maioria das frentes do PRD já estava implementada no projeto. O plano abaixo reflete apenas o que de fato faltava após a auditoria.

### Wave 1 — Máscaras e Validações

- Adicionar `maskCRM` em `src/lib/masks.ts`
- Aplicar máscaras no login `src/pages/Index.tsx`
- Criar `src/lib/validations.ts` com schemas Zod (`patientSchema` + `doctorSchema`)

### Wave 2 — Prescrição Realtime

- Adicionar Supabase Realtime em `usePrescricoesPaciente` (`src/hooks/usePrescricoes.ts`)
- Subscription: `postgres_changes INSERT` em `prescricoes` filtrado por `paciente_id`
- Cleanup via `supabase.removeChannel()` no unmount

### O que já estava pronto (não precisou ser feito)

| Item do PRD | Status real |
|---|---|
| Criar `masks.ts` | ✅ Já existia com `maskCPF`, `filterCRM`, `maskPhone` |
| Substituir dados mock | ✅ Dashboards já usavam React Query |
| Tabela `appointments` | ✅ Tabela `consultas` equivalente já existia |
| Tabela `medical_records` | ✅ Tabela `prescricoes` equivalente já existia |
| `useAppointments` | ✅ `useConsultasMedico` / `useConsultasPaciente` já existiam |
| `useCreateMedicalRecord` | ✅ `useCreatePrescricao` já existia |
| Tela de receitas do paciente | ✅ `ReceitasPaciente.tsx` já exibia dados reais |

---

## Arquivos-chave do projeto

- [[src/lib/masks.ts]] — `maskCPF`, `maskCRM`, `filterCRM`, `maskPhone`
- [[src/lib/validations.ts]] — schemas Zod `patientSchema`, `doctorSchema`
- [[src/pages/Index.tsx]] — login com máscara dinâmica CPF/CRM
- [[src/hooks/usePrescricoes.ts]] — Realtime subscription para paciente
- [[src/contexts/AuthContext.tsx]] — auth central: `user`, `profile`, `medico`, `paciente`
