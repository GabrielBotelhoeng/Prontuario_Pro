import { useState, useMemo } from "react";
import {
  Home,
  FileText,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Sparkles,
  Eye,
  Download,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Repeat,
  FileBarChart,
  FileSpreadsheet,
  FileClock,
  FolderOpen,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEstatisticasMedico, useConsultasMedico } from "@/hooks/useConsultas";
import { useToast } from "@/hooks/use-toast";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { Consulta } from "@/lib/database.types";

const PALETA = [
  "hsl(var(--primary))",
  "hsl(270 60% 70%)",
  "hsl(270 40% 85%)",
  "hsl(200 70% 65%)",
  "hsl(40 80% 65%)",
  "hsl(0 65% 70%)",
];

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Documentos", url: "/medico/documentos", icon: FolderOpen },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

interface MetricItem {
  label: string;
  sublabel: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const reports: ReportItem[] = [
  {
    id: "diario",
    title: "Relatório Diário",
    description: "Atendimentos e faturamento do dia",
    icon: FileClock,
  },
  {
    id: "mensal",
    title: "Relatório Mensal",
    description: "Consolidado mensal de procedimentos",
    icon: FileBarChart,
  },
  {
    id: "anual",
    title: "Relatório Anual",
    description: "Visão completa do ano fiscal",
    icon: FileSpreadsheet,
  },
];

function getInterval(reportId: string, ref: Date): { start: Date; end: Date } {
  if (reportId === "diario") return { start: startOfDay(ref), end: endOfDay(ref) };
  if (reportId === "mensal") return { start: startOfMonth(ref), end: endOfMonth(ref) };
  return { start: startOfYear(ref), end: endOfYear(ref) };
}

export default function PainelMonitoramento() {
  const [dates, setDates] = useState<Record<string, Date | undefined>>({
    diario: new Date(),
    mensal: new Date(),
    anual: new Date(),
  });
  const [previewReport, setPreviewReport] = useState<ReportItem | null>(null);

  const { toast } = useToast();
  const { data: stats } = useEstatisticasMedico();
  const { data: todasConsultas = [] } = useConsultasMedico();

  const consultasFiltradas = useMemo(() => {
    if (!previewReport) return [] as Consulta[];
    const ref = dates[previewReport.id] ?? new Date();
    const { start, end } = getInterval(previewReport.id, ref);
    return todasConsultas.filter((c) =>
      isWithinInterval(new Date(c.data_hora), { start, end }),
    );
  }, [previewReport, dates, todasConsultas]);

  const handleDownload = (report: ReportItem) => {
    const ref = dates[report.id] ?? new Date();
    const { start, end } = getInterval(report.id, ref);
    const linhas = todasConsultas.filter((c) =>
      isWithinInterval(new Date(c.data_hora), { start, end }),
    );

    if (linhas.length === 0) {
      toast({
        title: "Sem dados no período",
        description: "Não há consultas registradas para a data selecionada.",
      });
      return;
    }

    const rows = linhas.map((c) => ({
      data: format(new Date(c.data_hora), "dd/MM/yyyy HH:mm"),
      paciente: c.paciente?.profile?.nome ?? "",
      tipo: c.tipo,
      status: c.status,
      observacoes: c.observacoes ?? "",
    }));
    const csv = toCsv(
      ["Data/Hora", "Paciente", "Tipo", "Status", "Observações"],
      rows,
      ["data", "paciente", "tipo", "status", "observacoes"],
    );
    const dateLabel = format(ref, report.id === "anual" ? "yyyy" : report.id === "mensal" ? "MM-yyyy" : "dd-MM-yyyy");
    downloadCsv(`relatorio-${report.id}-${dateLabel}.csv`, csv);
    toast({
      title: "Relatório baixado",
      description: `${linhas.length} consulta(s) exportada(s) em CSV.`,
    });
  };

  const metrics: MetricItem[] = useMemo(() => [
    {
      label: "Total de Atendimentos",
      sublabel: "Este mês",
      value: String(stats?.totalConsultasMes ?? 0),
      icon: Users,
    },
    {
      label: "Finalizadas Hoje",
      sublabel: "Atendimentos concluídos",
      value: String(stats?.finalizadasHoje ?? 0),
      icon: Clock,
    },
    {
      label: "Pacientes Únicos",
      sublabel: "Atendidos no mês",
      value: String(stats?.pacientesUnicos ?? 0),
      icon: Repeat,
    },
  ], [stats]);

  const diagnosticData = useMemo(
    () => (stats?.distribuicaoPatologias ?? []).map((d, i) => ({
      name: d.nome,
      value: d.percentual,
      qtd: d.qtd,
      color: PALETA[i % PALETA.length],
    })),
    [stats],
  );

  const chartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    diagnosticData.forEach((d) => { cfg[d.name] = { label: d.name, color: d.color }; });
    return cfg;
  }, [diagnosticData]);

  return (
    <DashboardLayout navItems={navItems} userName="Dr. Carlos" userRole="Médico">
      <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              Monitoramento Inteligente
              <Sparkles className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Análise clínica e financeira com insights de IA
            </p>
          </div>
        </div>

        {/* Mini metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <Card
              key={m.label}
              className="p-5 rounded-2xl border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {m.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.sublabel}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <m.icon className="h-[18px] w-[18px] text-primary" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Diagnostics chart */}
          <Card className="lg:col-span-3 p-6 rounded-2xl border-white/60 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                  Análise de Diagnósticos
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distribuição de patologias — Mês atual
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                Mensal
              </span>
            </div>

            {diagnosticData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Sem dados suficientes ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-[240px] w-full">
                  <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={diagnosticData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3} strokeWidth={0}>
                        {diagnosticData.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>
                <div className="space-y-3">
                  {diagnosticData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                        <span className="text-sm font-medium text-foreground">{d.name}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground tabular-nums">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/8 to-primary/4 border border-primary/15">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Resumo</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {stats && stats.totalConsultasMes > 0
                      ? <>Você teve <strong>{stats.totalConsultasMes} consulta(s)</strong> no mês, atendendo <strong>{stats.pacientesUnicos} paciente(s) único(s)</strong>. Taxa de conclusão: <strong>{stats.taxaConclusao}%</strong>.</>
                      : <>Sem consultas registradas neste mês ainda. Os dados aparecerão aqui conforme você atender pacientes.</>}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Right: Reports center */}
          <Card className="lg:col-span-2 p-6 rounded-2xl border-white/60 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                Centro de Relatórios
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gere e compartilhe relatórios financeiros
              </p>
            </div>

            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <r.icon className="h-[18px] w-[18px] text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "flex-1 h-9 px-3 rounded-lg border border-border/70 bg-background/70",
                            "text-xs font-medium text-foreground/80 hover:border-primary/40 hover:bg-primary/5",
                            "transition-all duration-200 flex items-center justify-between gap-2",
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <CalendarIcon className="h-3.5 w-3.5 text-primary/70" />
                            {dates[r.id]
                              ? format(dates[r.id]!, "dd MMM yyyy", { locale: ptBR })
                              : "Selecionar data"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={dates[r.id]}
                          onSelect={(d) => setDates((prev) => ({ ...prev, [r.id]: d }))}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <button
                      title="Visualizar"
                      onClick={() => setPreviewReport(r)}
                      className="w-9 h-9 rounded-lg border border-border/70 bg-background/70 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      title="Baixar CSV"
                      onClick={() => handleDownload(r)}
                      className="w-9 h-9 rounded-lg border border-border/70 bg-background/70 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={!!previewReport} onOpenChange={(open) => !open && setPreviewReport(null)}>
        <DialogContent className="max-w-3xl rounded-2xl">
          {previewReport && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                  {previewReport.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {previewReport.description} ·{" "}
                  {format(
                    dates[previewReport.id] ?? new Date(),
                    previewReport.id === "anual"
                      ? "yyyy"
                      : previewReport.id === "mensal"
                        ? "MMMM 'de' yyyy"
                        : "dd 'de' MMMM 'de' yyyy",
                    { locale: ptBR },
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-3 py-2 border-y border-border/40">
                <div className="text-sm">
                  <span className="font-bold text-foreground tabular-nums">{consultasFiltradas.length}</span>
                  <span className="text-muted-foreground"> consulta(s) no período</span>
                </div>
                <button
                  onClick={() => handleDownload(previewReport)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar CSV
                </button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto">
                {consultasFiltradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    Nenhuma consulta registrada para o período selecionado.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/40">
                      <tr>
                        <th className="text-left py-2 font-semibold">Data/Hora</th>
                        <th className="text-left py-2 font-semibold">Paciente</th>
                        <th className="text-left py-2 font-semibold">Tipo</th>
                        <th className="text-left py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultasFiltradas.map((c) => (
                        <tr key={c.id} className="border-b border-border/30 last:border-0">
                          <td className="py-2.5 tabular-nums text-foreground">
                            {format(new Date(c.data_hora), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td className="py-2.5 text-foreground">{c.paciente?.profile?.nome ?? "—"}</td>
                          <td className="py-2.5 text-muted-foreground">{c.tipo}</td>
                          <td className="py-2.5">
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 border border-border/40 text-foreground/80">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
