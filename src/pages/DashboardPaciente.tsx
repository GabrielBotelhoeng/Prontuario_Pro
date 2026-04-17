import {
  Home,
  FileText,
  FolderHeart,
  CalendarDays,
  CalendarClock,
  Pill,
  UserCheck,
  Clock,
  Heart,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import clinicImg from "@/assets/clinic-reception.jpg";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

const doctors = [
  { name: "Dr. Carlos", specialty: "Clínica Geral", initials: "DC", color: "bg-primary/15 text-primary" },
  { name: "Dra. Ana", specialty: "Ginecologia", initials: "DA", color: "bg-emerald-500/15 text-emerald-600" },
];

const recentActivity = [
  { text: "Consulta realizada com Dr. Carlos", time: "10 Abr", icon: Heart },
  { text: "Receita médica emitida", time: "10 Abr", icon: FileText },
  { text: "Agendamento confirmado", time: "08 Abr", icon: Clock },
];

export default function DashboardPaciente() {
  return (
    <DashboardLayout navItems={navItems} userName="Maria Silva" userRole="Paciente">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Card */}
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-8 lg:p-10 flex flex-col justify-center">
              <p className="text-primary text-sm font-semibold tracking-wide uppercase mb-2">
                Olá, Maria
              </p>
              <h1 className="text-foreground text-2xl lg:text-3xl font-bold tracking-tight mb-4">
                Consultório Nossa Senhora do Rosário
              </h1>
              <p className="text-muted-foreground text-[15px] leading-relaxed max-w-lg">
                Acompanhe suas consultas, receitas e prontuário médico em um só lugar.
                Seu bem-estar é a nossa prioridade.
              </p>
            </div>
            <div className="lg:w-[380px] xl:w-[440px] h-56 lg:h-auto flex-shrink-0">
              <img
                src={clinicImg}
                alt="Recepção do consultório"
                className="w-full h-full object-cover"
                loading="lazy"
                width={1280}
                height={720}
              />
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Próxima Consulta */}
          <div
            className="bg-card border border-border/40 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <CalendarClock className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Próxima Consulta</p>
            <p className="text-foreground text-xl font-bold tracking-tight mb-0.5">18 Abr, 14:30</p>
            <p className="text-muted-foreground text-sm">Dr. Carlos — Clínica Geral</p>
          </div>

          {/* Última Receita */}
          <div
            className="bg-card border border-border/40 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Pill className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Última Receita</p>
            <p className="text-foreground text-xl font-bold tracking-tight mb-0.5">Disponível</p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Emitida em 10/04/2026</span>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Nova</span>
            </div>
          </div>
        </div>

        {/* Médicos Especialistas */}
        <div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Médicos Especialistas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc.name}
                className="bg-card border border-border/40 rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}
              >
                <div className={`w-12 h-12 rounded-full ${doc.color} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                  {doc.initials}
                </div>
                <div>
                  <p className="text-foreground font-semibold text-[15px]">{doc.name}</p>
                  <p className="text-muted-foreground text-sm">{doc.specialty}</p>
                </div>
                <UserCheck className="ml-auto h-4 w-4 text-primary/40" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Atividade Recente</h2>
          <div className="bg-card border border-border/40 rounded-2xl divide-y divide-border" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
            {recentActivity.map((item, i) => (
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
