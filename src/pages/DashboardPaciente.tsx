import {
  Home, FileText, FolderHeart, CalendarDays, CalendarClock, Pill, UserCheck, Clock, Heart,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useConsultasPaciente, useProximaConsultaPaciente } from "@/hooks/useConsultas";
import { usePrescricoesPaciente } from "@/hooks/usePrescricoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import clinicImg from "@/assets/clinic-reception.jpg";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

export default function DashboardPaciente() {
  const { profile } = useAuth();
  const { data: consultas = [] } = useConsultasPaciente();
  const { data: proxima } = useProximaConsultaPaciente();
  const { data: prescricoes = [] } = usePrescricoesPaciente();

  const primeiroNome = profile?.nome?.split(" ")[0] ?? "Paciente";

  const ultimaReceita = prescricoes[0];
  const atividadeRecente = [
    ...consultas.filter((c) => c.status === "Finalizado").slice(0, 2).map((c) => ({
      text: `Consulta realizada com ${c.medico?.profile?.nome ?? "Médico"}`,
      time: format(new Date(c.data_hora), "dd MMM", { locale: ptBR }),
      icon: Heart,
    })),
    ...prescricoes.slice(0, 1).map((p) => ({
      text: "Receita médica emitida",
      time: format(new Date(p.data_emissao), "dd MMM", { locale: ptBR }),
      icon: FileText,
    })),
    ...consultas.filter((c) => c.status === "Confirmado").slice(0, 1).map((c) => ({
      text: "Agendamento confirmado",
      time: format(new Date(c.data_hora), "dd MMM", { locale: ptBR }),
      icon: Clock,
    })),
  ].slice(0, 3);

  // Médicos distintos que o paciente já teve consulta
  const medicos = [...new Map(
    consultas
      .filter((c) => c.medico)
      .map((c) => [c.medico_id, c.medico])
  ).values()].slice(0, 4);

  const colors = ["bg-primary/15 text-primary", "bg-emerald-500/15 text-emerald-600", "bg-violet-500/15 text-violet-600", "bg-amber-500/15 text-amber-600"];

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero */}
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-8 lg:p-10 flex flex-col justify-center">
              <p className="text-primary text-sm font-semibold tracking-wide uppercase mb-2">Olá, {primeiroNome}</p>
              <h1 className="text-foreground text-2xl lg:text-3xl font-bold tracking-tight mb-4">Seu painel de saúde</h1>
              <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg">
                Acompanhe suas consultas, receitas e prontuário médico em um só lugar. Seu bem-estar é a nossa prioridade.
              </p>
            </div>
            <div className="lg:w-[380px] xl:w-[440px] h-56 lg:h-auto flex-shrink-0">
              <img src={clinicImg} alt="Consultório" className="w-full h-full object-cover" loading="lazy" width={1280} height={720} />
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border/40 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4"><CalendarClock className="h-5 w-5" /></div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Próxima Consulta</p>
            {proxima ? (
              <>
                <p className="text-foreground text-xl font-bold tracking-tight mb-0.5">{format(new Date(proxima.data_hora), "dd MMM, HH:mm", { locale: ptBR })}</p>
                <p className="text-muted-foreground text-sm">{proxima.medico?.profile?.nome ?? "Médico"} — {proxima.medico?.especialidade}</p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma consulta agendada</p>
            )}
          </div>

          <div className="bg-card border border-border/40 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4"><Pill className="h-5 w-5" /></div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Última Receita</p>
            {ultimaReceita ? (
              <>
                <p className="text-foreground text-xl font-bold tracking-tight mb-0.5">Disponível</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">Emitida em {format(new Date(ultimaReceita.data_emissao), "dd/MM/yyyy")}</span>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Nova</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma receita emitida ainda</p>
            )}
          </div>
        </div>

        {/* Médicos */}
        {medicos.length > 0 && (
          <div>
            <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Meus Médicos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {medicos.map((m, i) => (
                <div key={i} className="bg-card border border-border/40 rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                  <div className={`w-12 h-12 rounded-full ${colors[i % colors.length]} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                    {m?.profile?.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") ?? "M"}
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-[15px]">{m?.profile?.nome ?? "Médico"}</p>
                    <p className="text-muted-foreground text-sm">{(m as { especialidade?: string })?.especialidade}</p>
                  </div>
                  <UserCheck className="ml-auto h-4 w-4 text-primary/40" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atividade Recente */}
        <div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Atividade Recente</h2>
          <div className="bg-card border border-border/40 rounded-2xl divide-y divide-border" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
            {atividadeRecente.length === 0 ? (
              <div className="flex items-center gap-4 px-6 py-8 text-center justify-center">
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
              </div>
            ) : atividadeRecente.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground flex-1">{item.text}</p>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
