import {
  Home,
  FileText,
  ClipboardList,
  CalendarDays,
  BarChart3,
  CalendarCheck,
  Stethoscope,
  AlertCircle,
  Clock,
  Users,
  UserRound,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useConsultasMedico, useProximaConsultaMedico } from "@/hooks/useConsultas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import clinicImg from "@/assets/clinic-reception.jpg";

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

const quickActions = [
  { title: "Ver Agenda de Hoje", description: "Consultas agendadas", icon: CalendarCheck, color: "bg-primary/10 text-primary", url: "/medico/agenda" },
  { title: "Nova Consulta", description: "Iniciar atendimento", icon: Stethoscope, color: "bg-emerald-500/10 text-emerald-600", url: "/medico/anamnese" },
  { title: "Alertas Clínicos", description: "Painel de IA", icon: AlertCircle, color: "bg-amber-500/10 text-amber-600", url: "/medico/painel-ia" },
];

export default function DashboardMedico() {
  const { profile, medico } = useAuth();
  const { data: consultas = [] } = useConsultasMedico();
  const { data: proxima } = useProximaConsultaMedico();
  const navigate = useNavigate();

  const hoje = new Date().toDateString();
  const consultasHoje = consultas.filter((c) => new Date(c.data_hora).toDateString() === hoje);
  const finalizadas = consultasHoje.filter((c) => c.status === "Finalizado").length;
  const aguardando = consultasHoje.filter((c) => c.status === "Aguardando" || c.status === "Em andamento").length;

  const stats = [
    { label: "Pacientes hoje", value: String(consultasHoje.length), icon: Users, trend: `+${consultasHoje.length}` },
    { label: "Consultas realizadas", value: String(finalizadas), icon: Clock, trend: `+${finalizadas}` },
    { label: "Pacientes aguardando", value: String(aguardando), icon: UserRound, trend: "agora" },
  ];

  const nomeDisplay = profile?.nome ?? "Doutor(a)";
  const clinicaNome = medico?.clinica_nome ?? "Consultório";

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Card */}
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-8 lg:p-10 flex flex-col justify-center">
              <p className="text-primary text-sm font-semibold tracking-wide uppercase mb-2">Bem-vindo de volta</p>
              <h1 className="text-foreground text-2xl lg:text-3xl font-bold tracking-tight mb-4">{clinicaNome}</h1>
              <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg">
                Olá, {nomeDisplay}. Você tem {consultasHoje.length} {consultasHoje.length === 1 ? "consulta" : "consultas"} agendadas para hoje.
              </p>
            </div>
            <div className="lg:w-[380px] xl:w-[440px] h-56 lg:h-auto flex-shrink-0">
              <img src={clinicImg} alt="Consultório" className="w-full h-full object-cover" width={1280} height={720} />
            </div>
          </div>
        </div>

        {/* AI Smart Summary Card */}
        <div
          className="relative rounded-2xl overflow-hidden border border-primary/20 p-6 lg:p-7"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(270 70% 96%) 50%, hsl(var(--primary) / 0.06) 100%)",
            boxShadow: "0 8px 32px -12px hsl(var(--primary) / 0.25), inset 0 1px 0 0 hsl(0 0% 100% / 0.6)",
          }}
        >
          <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 70%)" }} />
          <div className="relative flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-primary/15 backdrop-blur-sm flex items-center justify-center border border-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-foreground text-lg font-bold tracking-tight">Resumo Inteligente do Dia</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">IA Ativa</span>
                </div>
                <p className="text-xs text-muted-foreground">Análise preditiva atualizada em tempo real</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-card/70 backdrop-blur-sm border border-border/40 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Padrão Detectado</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      Você tem <strong>{consultasHoje.length}</strong> consultas hoje. {finalizadas > 0 && `${finalizadas} já finalizadas.`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card/70 backdrop-blur-sm border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Alerta Clínico</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {proxima
                        ? `Próxima consulta: ${proxima.paciente?.profile?.nome ?? "Paciente"} às ${format(new Date(proxima.data_hora), "HH:mm", { locale: ptBR })}.`
                        : "Sem consultas pendentes no momento."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/medico/painel-ia")}
              className="self-start inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all duration-200 hover:opacity-90 shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)] group"
            >
              Ver análise completa da IA
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-md" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {stat.trend}
              </span>
            </div>
          ))}
        </div>

        {/* Next Appointment */}
        {proxima && (
          <div className="bg-card border border-border/40 rounded-2xl p-6 flex items-center gap-5" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Próxima Consulta</p>
              <p className="text-foreground font-bold text-lg tracking-tight">
                {proxima.paciente?.profile?.nome ?? "Paciente"} — {format(new Date(proxima.data_hora), "HH:mm", { locale: ptBR })}
              </p>
              <p className="text-muted-foreground text-sm">{proxima.tipo}</p>
            </div>
            <button
              onClick={() => navigate("/medico/anamnese")}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all duration-200 hover:opacity-90"
            >
              Iniciar Atendimento
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.url)}
                className="bg-card border border-border/40 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
                style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}
              >
                <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-semibold text-[15px] mb-1">{action.title}</h3>
                <p className="text-muted-foreground text-sm">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
