import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderHeart,
  FolderOpen,
  History,
  Home,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import type { NavItem } from "@/components/DashboardLayout";

export const medicoNavItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Documentos", url: "/medico/documentos", icon: FolderOpen },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: ScanSearch },
];

export const pacienteNavItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Privacidade", url: "/paciente/privacidade", icon: ShieldCheck },
  { title: "Acessos", url: "/paciente/acessos", icon: History },
];
