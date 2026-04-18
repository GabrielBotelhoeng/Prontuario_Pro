import { Home, FileText, FolderHeart, CalendarDays, Stethoscope, Phone } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useTodosMedicos } from "@/hooks/usePacientes";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

const colors = [
  "bg-primary/15 text-primary",
  "bg-emerald-500/15 text-emerald-600",
  "bg-violet-500/15 text-violet-600",
  "bg-amber-500/15 text-amber-600",
  "bg-rose-500/15 text-rose-600",
  "bg-cyan-500/15 text-cyan-600",
];

export default function Especialistas() {
  const { data: medicos = [], isLoading } = useTodosMedicos();

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Saúde</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Especialistas</h1>
          <p className="text-sm text-muted-foreground mt-1">Médicos disponíveis na plataforma</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : medicos.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
            <Stethoscope className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-1">Nenhum especialista cadastrado ainda</p>
            <p className="text-sm text-muted-foreground">Os médicos da plataforma aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {medicos.map((m, i) => {
              const iniciais = m.profile?.nome?.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "M";
              return (
                <div key={m.id} className="bg-card border border-border/40 rounded-2xl p-6 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                  <div className={`w-14 h-14 rounded-full ${colors[i % colors.length]} flex items-center justify-center font-bold text-base flex-shrink-0`}>
                    {iniciais}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-[15px] leading-tight">{m.profile?.nome ?? "Médico"}</p>
                    <p className="text-muted-foreground text-sm mt-0.5">{m.especialidade}</p>
                    {m.crm && <p className="text-xs text-muted-foreground/70 mt-0.5">CRM {m.crm}</p>}
                    {m.clinica_nome && <p className="text-xs text-primary/70 mt-1">{m.clinica_nome}</p>}
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="h-4 w-4 text-primary" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
