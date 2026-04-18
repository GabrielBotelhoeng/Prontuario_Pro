import { Home, FileText, FolderHeart, CalendarDays, ClipboardList, Activity, Stethoscope } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useAnamnesesPaciente } from "@/hooks/useAnamneses";
import { usePrescricoesPaciente } from "@/hooks/usePrescricoes";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

export default function MeuProntuario() {
  const { profile, paciente } = useAuth();
  const { data: anamneses = [], isLoading: loadingA } = useAnamnesesPaciente();
  const { data: prescricoes = [], isLoading: loadingP } = usePrescricoesPaciente();

  const isLoading = loadingA || loadingP;

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Saúde</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Prontuário</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico completo de saúde e atendimentos</p>
        </div>

        {/* Dados básicos */}
        <div className="bg-card border border-border/40 rounded-2xl p-6" style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Activity className="h-4 w-4 text-primary" /></div>
            <h2 className="text-base font-semibold text-foreground">Dados do Paciente</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Nome", value: profile?.nome ?? "—" },
              { label: "CPF", value: paciente?.cpf ?? "—" },
              { label: "Tipo Sanguíneo", value: paciente?.tipo_sanguineo ?? "Não informado" },
              { label: "Alergias", value: paciente?.alergias?.join(", ") || "Nenhuma informada" },
            ].map((item) => (
              <div key={item.label} className="px-3 py-2 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">{item.label}</p>
                <p className="text-sm font-semibold text-foreground truncate leading-tight mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : (
          <>
            {/* Anamneses */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><ClipboardList className="h-4 w-4 text-primary" /></div>
                <h2 className="text-lg font-semibold text-foreground">Histórico de Consultas</h2>
              </div>
              {anamneses.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum histórico de consulta disponível</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {anamneses.map((a) => (
                    <div key={a.id} className="bg-card border border-border/40 rounded-2xl p-5" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          <p className="text-[15px] font-semibold text-foreground">Consulta em {format(new Date(a.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        </div>
                      </div>
                      {a.queixa_principal && (
                        <div className="mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Queixa Principal</p>
                          <p className="text-sm text-foreground">{a.queixa_principal}</p>
                        </div>
                      )}
                      {a.hipotese_diagnostica && (
                        <div className="mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Diagnóstico</p>
                          <p className="text-sm text-foreground">{a.hipotese_diagnostica}</p>
                        </div>
                      )}
                      {a.conduta && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Conduta</p>
                          <p className="text-sm text-foreground">{a.conduta}</p>
                        </div>
                      )}
                      {a.sinais_vitais && Object.keys(a.sinais_vitais).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Object.entries(a.sinais_vitais).filter(([, v]) => v).map(([k, v]) => (
                            <div key={k} className="text-center px-2 py-1.5 rounded-lg bg-muted/40">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</p>
                              <p className="text-sm font-semibold text-foreground">{v as string}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
