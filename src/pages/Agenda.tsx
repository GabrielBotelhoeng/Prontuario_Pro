import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, PlayCircle, Plus, Stethoscope, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { medicoNavItems as navItems } from "@/lib/nav";
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
import { StatusConsulta } from "@/components/clinico/StatusConsulta";
import { EstadoVazio } from "@/components/clinico/EstadoVazio";
import vazioAgenda from "@/assets/vazio/agenda.webp";



const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const weekDays = ["D","S","T","Q","Q","S","S"];


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

  async function mudarStatus(apt: Consulta, status: Consulta["status"], msg: string) {
    try {
      await updateStatus.mutateAsync({ id: apt.id, status });
      toast({ title: msg });
    } catch (err: unknown) {
      toast({ title: "Não foi possível atualizar", description: (err as Error).message, variant: "destructive" });
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

  const aConfirmar = consultas.filter((c) => c.status === "Aguardando" && new Date(c.data_hora) > new Date()).length;

  const dayConsultas = (consultasByDay.get(selectedDay) ?? []).sort(
    (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
  );

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
          <div>
            <p className="eyebrow mb-3">Agenda</p>
            <h1 className="font-display text-5xl leading-none text-foreground">
              Seus <em>atendimentos</em>
            </h1>
            {aConfirmar > 0 && (
              <p className="mt-3 text-[15px] text-muted-foreground">
                <span className="font-mono text-warning">{String(aConfirmar).padStart(2, "0")}</span>{" "}
                {aConfirmar === 1 ? "solicitação de paciente aguarda" : "solicitações de pacientes aguardam"} sua confirmação.
              </p>
            )}
          </div>
          <Button onClick={abrirNovaConsulta} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova consulta
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
          <div className="bg-card border border-border rounded-xl p-6 h-fit">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-2xl text-foreground">{monthNames[month]} <span className="font-mono text-base text-muted-foreground">{year}</span></h3>
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
                  <button key={idx} onClick={() => setSelectedDay(day)} className={cn("aspect-square rounded-md flex flex-col items-center justify-center font-mono text-sm relative transition-colors", isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted")}>
                    {day}
                    {hasApts && <span className={cn("absolute bottom-1.5 w-1 h-1 rounded-full", isSelected ? "bg-primary-foreground" : "bg-primary")} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="flex items-baseline gap-3 px-1">
              <span className="font-display text-3xl text-foreground">{selectedDay} de {monthNames[month].toLowerCase()}</span>
              <span className="font-mono text-xs text-muted-foreground">{dayConsultas.length} {dayConsultas.length === 1 ? "consulta" : "consultas"}</span>
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : dayConsultas.length === 0 ? (
              <div className="rounded-xl border border-border bg-card">
                <EstadoVazio imagem={vazioAgenda} titulo={<>Nenhuma consulta <em className="text-primary">neste dia</em>.</>}>
                  Use “Nova consulta” para agendar um paciente da sua lista.
                </EstadoVazio>
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
                        <div className={cn("rounded-lg border p-4 transition-colors", isCurrent ? "bg-secondary/60 border-primary/30" : "bg-card border-border", apt.status === "Cancelado" && "opacity-60")}>
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center min-w-[56px]">
                              <span className={cn("font-mono text-lg tabular-nums", isCurrent ? "text-primary" : "text-foreground")}>{format(new Date(apt.data_hora), "HH:mm")}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <p className="text-[15px] font-semibold text-foreground truncate">{apt.paciente?.profile?.nome ?? "Paciente"}</p>
                                <StatusConsulta status={apt.status} />
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Stethoscope className="h-3 w-3" />{apt.tipo}</div>
                              {apt.status === "Aguardando" && (
                                <div className="mt-3 flex items-center gap-2">
                                  <Button size="sm" className="h-8 gap-1.5" onClick={() => mudarStatus(apt, "Confirmado", "Consulta confirmada — o paciente foi avisado")}>
                                    <Check className="h-3.5 w-3.5" />Confirmar
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground hover:text-destructive" onClick={() => mudarStatus(apt, "Cancelado", "Solicitação recusada — o paciente foi avisado")}>
                                    <X className="h-3.5 w-3.5" />Recusar
                                  </Button>
                                </div>
                              )}
                              {apt.status === "Confirmado" && (
                                <div className="mt-3 flex items-center gap-2">
                                  <Button size="sm" className="h-8 gap-1.5" onClick={() => handleIniciarAtendimento(apt)} title="Inicia o atendimento e abre a anamnese">
                                    <PlayCircle className="h-3.5 w-3.5" />Iniciar atendimento
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground hover:text-destructive" onClick={() => mudarStatus(apt, "Cancelado", "Consulta cancelada — o paciente foi avisado")}>
                                    <X className="h-3.5 w-3.5" />Cancelar
                                  </Button>
                                </div>
                              )}
                              {isCurrent && (
                                <div className="mt-3 flex items-center gap-2">
                                  <Button size="sm" className="h-8 gap-1.5" onClick={() => handleContinuarAtendimento(apt)}>
                                    <Stethoscope className="h-3.5 w-3.5" />Continuar anamnese
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8" onClick={() => mudarStatus(apt, "Finalizado", "Atendimento finalizado")}>
                                    Finalizar sem anamnese
                                  </Button>
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
