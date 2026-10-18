import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, FileText, ClipboardList, CalendarDays, BarChart3,
  ChevronLeft, ChevronRight, Sparkles, Clock, Stethoscope,
  X, PlayCircle, Plus, FolderOpen,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { useConsultasMedico, useUpdateConsultaStatus, useCreateConsulta } from "@/hooks/useConsultas";
import { usePacientesDoMedico } from "@/hooks/usePacientes";
import { format } from "date-fns";
import type { Consulta } from "@/lib/database.types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Documentos", url: "/medico/documentos", icon: FolderOpen },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

type ViewMode = "Dia" | "Semana" | "Mês";
type Status = "Confirmado" | "Aguardando" | "Finalizado" | "Em andamento" | "Cancelado";

const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const weekDays = ["D","S","T","Q","Q","S","S"];

const statusStyles: Record<Status, string> = {
  Confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Aguardando: "bg-amber-50 text-amber-700 border-amber-200",
  Finalizado: "bg-muted text-muted-foreground border-border",
  "Em andamento": "bg-primary/10 text-primary border-primary/30",
  Cancelado: "bg-red-50 text-red-600 border-red-200",
};

const TIPOS_CONSULTA = ["Consulta de Rotina", "Retorno", "Urgência", "Telemedicina"] as const;

function defaultDataHoraLocal(dia: number, year: number, month: number) {
  const d = new Date(year, month, dia, 9, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Agenda() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [viewMode, setViewMode] = useState<ViewMode>("Dia");
  const { data: consultas = [], isLoading } = useConsultasMedico();
  const { data: pacientes = [] } = usePacientesDoMedico();
  const updateStatus = useUpdateConsultaStatus();
  const createConsulta = useCreateConsulta();
  const { toast } = useToast();
  const navigate = useNavigate();

  async function handleIniciarAtendimento(apt: Consulta) {
    try {
      await updateStatus.mutateAsync({ id: apt.id, status: "Em andamento" });
      navigate(
        `/medico/anamnese?consultaId=${apt.id}&pacienteId=${apt.paciente_id}`,
      );
    } catch (err: unknown) {
      toast({
        title: "Erro ao iniciar atendimento",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  async function handleContinuarAtendimento(apt: Consulta) {
    navigate(
      `/medico/anamnese?consultaId=${apt.id}&pacienteId=${apt.paciente_id}`,
    );
  }

  const [novaOpen, setNovaOpen] = useState(false);
  const [novaPacienteId, setNovaPacienteId] = useState("");
  const [novaDataHora, setNovaDataHora] = useState("");
  const [novaTipo, setNovaTipo] = useState<string>(TIPOS_CONSULTA[0]);
  const [novaObs, setNovaObs] = useState("");

  function abrirNovaConsulta() {
    setNovaPacienteId("");
    setNovaDataHora(defaultDataHoraLocal(selectedDay, viewDate.getFullYear(), viewDate.getMonth()));
    setNovaTipo(TIPOS_CONSULTA[0]);
    setNovaObs("");
    setNovaOpen(true);
  }

  async function handleCriarConsulta() {
    if (!novaPacienteId) {
      toast({ title: "Selecione um paciente", variant: "destructive" });
      return;
    }
    if (!novaDataHora) {
      toast({ title: "Informe data e hora", variant: "destructive" });
      return;
    }
    try {
      const iso = new Date(novaDataHora).toISOString();
      await createConsulta.mutateAsync({
        paciente_id: novaPacienteId,
        data_hora: iso,
        tipo: novaTipo,
        observacoes: novaObs.trim() || undefined,
        status: "Confirmado",
      });
      toast({ title: "Consulta agendada com sucesso" });
      const d = new Date(novaDataHora);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      setSelectedDay(d.getDate());
      setNovaOpen(false);
    } catch (err: unknown) {
      toast({ title: "Erro ao agendar", description: (err as Error).message, variant: "destructive" });
    }
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const consultasByDay = useMemo(() => {
    const map = new Map<number, Consulta[]>();
    consultas.forEach((c) => {
      const d = new Date(c.data_hora);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(c);
      }
    });
    return map;
  }, [consultas, year, month]);

  const dayConsultas = (consultasByDay.get(selectedDay) ?? []).sort(
    (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
  );

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-[28px] font-bold text-foreground tracking-tight">Agenda de Atendimentos</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie suas consultas com inteligência e fluidez</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center bg-card border border-border/60 rounded-xl p-1 shadow-sm">
              {(["Dia","Semana","Mês"] as ViewMode[]).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)} className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200", viewMode === mode ? "bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)]" : "text-muted-foreground hover:text-foreground")}>
                  {mode}
                </button>
              ))}
            </div>
            <Button onClick={abrirNovaConsulta} className="rounded-xl gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Nova Consulta
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0"><Sparkles className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Resumo do Dia pela IA</p>
              <p className="text-sm text-foreground leading-relaxed">
                Você tem <span className="font-semibold">{dayConsultas.length} consultas</span> em {selectedDay} de {monthNames[month]}.
                {dayConsultas.filter((c) => c.status === "Em andamento").length > 0 && " Há atendimento em andamento."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
          <div className="bg-card border border-border/50 rounded-2xl p-6 h-fit shadow-[0_2px_20px_-8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">{monthNames[month]} <span className="text-muted-foreground font-normal">{year}</span></h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((d, i) => <div key={i} className="text-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (day === null) return <div key={idx} className="aspect-square" />;
                const hasApts = consultasByDay.has(day);
                const isSelected = day === selectedDay;
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                return (
                  <button key={idx} onClick={() => setSelectedDay(day)} className={cn("aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium relative transition-all duration-200", isSelected ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]" : isToday ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted")}>
                    {day}
                    {hasApts && <span className={cn("absolute bottom-1.5 w-1 h-1 rounded-full", isSelected ? "bg-primary-foreground" : "bg-primary")} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground px-1">
              Dia {selectedDay}
              <span className="text-sm text-muted-foreground font-normal ml-2">· {dayConsultas.length} {dayConsultas.length === 1 ? "consulta" : "consultas"}</span>
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : dayConsultas.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma consulta agendada para este dia</p>
              </div>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-3 animate-in fade-in duration-300">
                  {dayConsultas.map((apt) => {
                    const isCurrent = apt.status === "Em andamento";
                    return (
                      <div key={apt.id} className="relative">
                        <span className={cn("absolute -left-[22px] top-5 w-3.5 h-3.5 rounded-full border-2 border-card", isCurrent ? "bg-primary ring-4 ring-primary/20" : apt.status === "Finalizado" ? "bg-muted-foreground/40" : "bg-primary/40")} />
                        <div className={cn("rounded-2xl border p-4 transition-all duration-200 hover:shadow-md", isCurrent ? "bg-primary/5 border-primary/30" : "bg-card border-border/50 shadow-[0_1px_8px_-4px_rgba(0,0,0,0.05)]")}>
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center min-w-[56px]">
                              <span className={cn("text-[15px] font-bold tabular-nums", isCurrent ? "text-primary" : "text-foreground")}>{format(new Date(apt.data_hora), "HH:mm")}</span>
                              <Clock className="h-3 w-3 text-muted-foreground/60 mt-1" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <p className="text-[15px] font-semibold text-foreground truncate">{apt.paciente?.profile?.nome ?? "Paciente"}</p>
                                <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap", statusStyles[apt.status as Status])}>{apt.status}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Stethoscope className="h-3 w-3" />{apt.tipo}</div>
                              {(apt.status === "Aguardando" || apt.status === "Confirmado") && (
                                <div className="mt-3 flex items-center gap-2">
                                  <button onClick={() => handleIniciarAtendimento(apt)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all" title="Inicia o atendimento e abre o prontuário do paciente">
                                    <PlayCircle className="h-3.5 w-3.5" />Iniciar Atendimento
                                  </button>
                                  <button onClick={() => updateStatus.mutateAsync({ id: apt.id, status: "Cancelado" })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all">
                                    <X className="h-3 w-3" />Cancelar
                                  </button>
                                </div>
                              )}
                              {isCurrent && (
                                <div className="mt-3 flex items-center gap-2">
                                  <button onClick={() => handleContinuarAtendimento(apt)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all">
                                    <Stethoscope className="h-3.5 w-3.5" />Abrir Prontuário
                                  </button>
                                  <button onClick={() => updateStatus.mutateAsync({ id: apt.id, status: "Finalizado" })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all">
                                    Finalizar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nova Consulta</DialogTitle>
            <DialogDescription>Agende um novo atendimento para um paciente da sua lista.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</Label>
              <Select value={novaPacienteId} onValueChange={setNovaPacienteId}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecionar paciente..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {pacientes.length === 0 && <SelectItem value="_none" disabled>Nenhum paciente vinculado</SelectItem>}
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} — CPF {p.cpf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data e Hora</Label>
              <Input
                type="datetime-local"
                value={novaDataHora}
                onChange={(e) => setNovaDataHora(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</Label>
              <Select value={novaTipo} onValueChange={setNovaTipo}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TIPOS_CONSULTA.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações <span className="normal-case text-muted-foreground/70">(opcional)</span></Label>
              <Textarea
                value={novaObs}
                onChange={(e) => setNovaObs(e.target.value)}
                placeholder="Informações adicionais para o atendimento..."
                className="min-h-[80px] rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNovaOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleCriarConsulta} disabled={createConsulta.isPending} className="rounded-xl gap-2">
              {createConsulta.isPending && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {createConsulta.isPending ? "Agendando..." : "Agendar Consulta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
