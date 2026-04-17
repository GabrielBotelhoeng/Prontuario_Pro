import { useMemo, useState } from "react";
import {
  Home,
  FileText,
  ClipboardList,
  CalendarDays,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Clock,
  Stethoscope,
  Pencil,
  X,
  PlayCircle,
  Coffee,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

type ViewMode = "Dia" | "Semana" | "Mês";
type Status = "Confirmado" | "Aguardando" | "Finalizado" | "Em andamento";

interface Appointment {
  time: string;
  patient: string;
  procedure: string;
  status: Status;
  current?: boolean;
}

const appointmentsByDay: Record<number, Appointment[]> = {
  16: [
    { time: "08:00", patient: "Marina Costa", procedure: "Consulta de Rotina", status: "Finalizado" },
    { time: "09:00", patient: "João Pedro Alves", procedure: "Retorno Cardiológico", status: "Finalizado" },
    { time: "10:00", patient: "Rosa Maria da Silva", procedure: "Anamnese Inicial", status: "Em andamento", current: true },
    { time: "11:00", patient: "Antônio M. Fagundes", procedure: "Avaliação Clínica", status: "Confirmado" },
    { time: "12:00", patient: null as unknown as string, procedure: "Intervalo sugerido pela IA", status: "Aguardando" },
    { time: "14:00", patient: "Beatriz Lopes", procedure: "Consulta Pediátrica", status: "Confirmado" },
    { time: "15:00", patient: "Carlos Henrique", procedure: "Retorno", status: "Aguardando" },
    { time: "16:00", patient: "Helena Martins", procedure: "Primeira Consulta", status: "Confirmado" },
  ],
  17: [
    { time: "09:00", patient: "Lucas Oliveira", procedure: "Consulta de Rotina", status: "Confirmado" },
    { time: "10:30", patient: "Patrícia Souza", procedure: "Retorno", status: "Confirmado" },
    { time: "14:00", patient: "Felipe Rocha", procedure: "Avaliação", status: "Aguardando" },
  ],
  18: [
    { time: "08:30", patient: "Ana Beatriz", procedure: "Pré-operatório", status: "Confirmado" },
    { time: "11:00", patient: "Roberto Lima", procedure: "Consulta", status: "Confirmado" },
  ],
  22: [{ time: "10:00", patient: "Mariana Reis", procedure: "Retorno", status: "Confirmado" }],
  24: [
    { time: "09:00", patient: "Pedro Henrique", procedure: "Avaliação", status: "Confirmado" },
    { time: "15:00", patient: "Sofia Almeida", procedure: "Consulta", status: "Confirmado" },
  ],
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

const statusStyles: Record<Status, string> = {
  Confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Aguardando: "bg-amber-50 text-amber-700 border-amber-200",
  Finalizado: "bg-muted text-muted-foreground border-border",
  "Em andamento": "bg-primary/10 text-primary border-primary/30",
};

export default function Agenda() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 16));
  const [selectedDay, setSelectedDay] = useState(16);
  const [viewMode, setViewMode] = useState<ViewMode>("Dia");

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

  const dayAppointments = appointmentsByDay[selectedDay] ?? [];
  const todayAppointments = appointmentsByDay[16] ?? [];

  const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <DashboardLayout navItems={navItems} userName="Dr. Carlos" userRole="Clínica Geral">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-[28px] font-bold text-foreground tracking-tight">
              Agenda de Atendimentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie suas consultas com inteligência e fluidez
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center bg-card border border-border/60 rounded-xl p-1 shadow-sm">
              {(["Dia", "Semana", "Mês"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button 
              onClick={() => { /* TODO: Implementar lógica no Cursor - Novo Agendamento */ }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]"
            >
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </button>
          </div>
        </div>

        {/* AI Summary banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                Resumo do Dia pela IA
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                Você tem <span className="font-semibold">8 consultas</span> hoje. O período da manhã está
                lotado — sugiro um <span className="font-semibold">intervalo às 12:30</span> para descanso e
                revisão de prontuários.
              </p>
            </div>
          </div>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
          {/* LEFT — Calendar */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 h-fit shadow-[0_2px_20px_-8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">
                {monthNames[month]} <span className="text-muted-foreground font-normal">{year}</span>
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrevMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goNextMonth}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  className="text-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (day === null) return <div key={idx} className="aspect-square" />;
                const hasAppointments = !!appointmentsByDay[day];
                const isSelected = day === selectedDay;
                const isToday = day === 16;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium relative transition-all duration-200",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]"
                        : isToday
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {day}
                    {hasAppointments && (
                      <span
                        className={cn(
                          "absolute bottom-1.5 w-1 h-1 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-primary",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 pt-5 border-t border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Dias com consultas agendadas
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-sm bg-primary/10 border border-primary/30" />
                Hoje
              </div>
            </div>
          </div>

          {/* RIGHT — Timeline */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedDay === 16 ? "Hoje" : `Dia ${selectedDay}`}
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  · {dayAppointments.length} {dayAppointments.length === 1 ? "consulta" : "consultas"}
                </span>
              </h2>
            </div>

            {dayAppointments.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma consulta agendada para este dia</p>
              </div>
            ) : (
              <div className="relative pl-6">
                {/* vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                <div className="space-y-3 animate-in fade-in duration-300">
                  {dayAppointments.map((apt, idx) => {
                    const isBreak = !apt.patient;
                    return (
                      <div key={idx} className="relative">
                        {/* dot */}
                        <span
                          className={cn(
                            "absolute -left-[22px] top-5 w-3.5 h-3.5 rounded-full border-2 border-card",
                            apt.current
                              ? "bg-primary ring-4 ring-primary/20"
                              : apt.status === "Finalizado"
                              ? "bg-muted-foreground/40"
                              : "bg-primary/40",
                          )}
                        />

                        <div
                          className={cn(
                            "rounded-2xl border p-4 transition-all duration-200 hover:shadow-md",
                            apt.current
                              ? "bg-primary/5 border-primary/30 shadow-[0_4px_20px_-6px_hsl(var(--primary)/0.25)]"
                              : isBreak
                              ? "bg-amber-50/50 border-amber-200/60 border-dashed"
                              : "bg-card border-border/50 shadow-[0_1px_8px_-4px_rgba(0,0,0,0.05)]",
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center min-w-[56px]">
                              <span
                                className={cn(
                                  "text-[15px] font-bold tabular-nums",
                                  apt.current ? "text-primary" : "text-foreground",
                                )}
                              >
                                {apt.time}
                              </span>
                              <Clock className="h-3 w-3 text-muted-foreground/60 mt-1" />
                            </div>

                            <div className="flex-1 min-w-0">
                              {isBreak ? (
                                <div className="flex items-center gap-2">
                                  <Coffee className="h-4 w-4 text-amber-600" />
                                  <p className="text-sm font-medium text-amber-800">{apt.procedure}</p>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-3 mb-1">
                                    <p className="text-[15px] font-semibold text-foreground truncate">
                                      {apt.patient}
                                    </p>
                                    <span
                                      className={cn(
                                        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap",
                                        statusStyles[apt.status],
                                      )}
                                    >
                                      {apt.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Stethoscope className="h-3 w-3" />
                                    {apt.procedure}
                                  </div>
                                </>
                              )}

                              {apt.current && (
                                <div className="mt-3 flex items-center gap-2">
                                  <button 
                                    onClick={() => { /* TODO: Implementar lógica no Cursor - Iniciar Atendimento */ }}
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
                                  >
                                    <PlayCircle className="h-3.5 w-3.5" />
                                    Iniciar Atendimento
                                  </button>
                                </div>
                              )}
                            </div>

                            {!isBreak && !apt.current && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { /* TODO: Implementar lógica no Cursor - Editar Agendamento */ }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  title="Editar"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                  <button
                                    onClick={() => { /* TODO: Implementar lógica no Cursor - Cancelar Agendamento */ }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
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
    </DashboardLayout>
  );
}
