import { Home, FileText, FolderHeart, CalendarDays, Stethoscope, Clock } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useConsultasPaciente } from "@/hooks/useConsultas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

type Status = "Confirmado" | "Aguardando" | "Finalizado" | "Em andamento" | "Cancelado";

const statusStyles: Record<Status, string> = {
  Confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Aguardando: "bg-amber-50 text-amber-700 border-amber-200",
  Finalizado: "bg-muted text-muted-foreground border-border",
  "Em andamento": "bg-primary/10 text-primary border-primary/30",
  Cancelado: "bg-red-50 text-red-600 border-red-200",
};

export default function AgendaPaciente() {
  const { data: consultas = [], isLoading } = useConsultasPaciente();

  const futuras = consultas
    .filter((c) => new Date(c.data_hora) >= new Date() && c.status !== "Cancelado" && c.status !== "Finalizado")
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

  const passadas = consultas
    .filter((c) => new Date(c.data_hora) < new Date() || c.status === "Finalizado" || c.status === "Cancelado")
    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
    .slice(0, 10);

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Saúde</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Agendamento</h1>
          <p className="text-sm text-muted-foreground mt-1">Consultas agendadas e histórico de atendimentos</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : (
          <>
            <section>
              <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Próximas Consultas</h2>
              {futuras.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma consulta agendada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {futuras.map((c) => (
                    <div key={c.id} className="bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-5 hover:shadow-md transition-all" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><CalendarDays className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-foreground font-semibold text-[15px]">{c.medico?.profile?.nome ?? "Médico"}</p>
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", statusStyles[c.status as Status])}>{c.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Stethoscope className="h-3.5 w-3.5" />{c.tipo}</div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5"><Clock className="h-3.5 w-3.5" />{format(new Date(c.data_hora), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {passadas.length > 0 && (
              <section>
                <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Histórico</h2>
                <div className="space-y-3">
                  {passadas.map((c) => (
                    <div key={c.id} className="bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-5 opacity-75 hover:opacity-100 transition-all" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"><CalendarDays className="h-5 w-5 text-muted-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-foreground font-semibold text-[15px]">{c.medico?.profile?.nome ?? "Médico"}</p>
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", statusStyles[c.status as Status])}>{c.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Stethoscope className="h-3.5 w-3.5" />{c.tipo}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"><Clock className="h-3.5 w-3.5" />{format(new Date(c.data_hora), "dd/MM/yyyy 'às' HH:mm")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
