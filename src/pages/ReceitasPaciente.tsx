import { Home, FileText, FolderHeart, CalendarDays, Pill, ChevronRight } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { usePrescricoesPaciente } from "@/hooks/usePrescricoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

const tipoLabel: Record<string, string> = {
  simples: "Receita Simples",
  controle: "Controle Especial",
  branca: "Receituário Comum",
  azul: "Notificação B (Azul)",
  amarela: "Notificação A (Amarela)",
};

export default function ReceitasPaciente() {
  const { data: prescricoes = [], isLoading } = usePrescricoesPaciente();

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Saúde</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Minhas Receitas</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico completo de prescrições médicas</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : prescricoes.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
            <Pill className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-1">Nenhuma receita ainda</p>
            <p className="text-sm text-muted-foreground">Suas receitas médicas aparecerão aqui após as consultas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prescricoes.map((p) => (
              <div key={p.id} className="bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-5 hover:shadow-md transition-all duration-300" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-foreground font-semibold text-[15px]">{tipoLabel[p.tipo_receita] ?? p.tipo_receita}</p>
                    {p.status === "finalizada" && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 rounded-full text-[10px]">Finalizada</Badge>}
                    {p.status === "rascunho" && <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 rounded-full text-[10px]">Rascunho</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.medico?.profile?.nome ?? "Médico"} · {p.medico?.especialidade}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Emitida em {format(new Date(p.data_emissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  {Array.isArray(p.medicamentos) && p.medicamentos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(p.medicamentos as { name: string; dosage: string }[]).slice(0, 3).map((m, i) => (
                        <span key={i} className="text-[11px] bg-muted/60 border border-border/40 rounded-lg px-2 py-0.5 text-muted-foreground">{m.name} {m.dosage}</span>
                      ))}
                      {p.medicamentos.length > 3 && <span className="text-[11px] text-primary font-medium">+{p.medicamentos.length - 3} mais</span>}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
