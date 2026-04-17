import { useState } from "react";
import {
  Home,
  FileText,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Sparkles,
  Eye,
  Download,
  Send,
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  Clock,
  Repeat,
  FileBarChart,
  FileSpreadsheet,
  FileClock,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

const diagnosticData = [
  { name: "Dengue", value: 62, color: "hsl(var(--primary))" },
  { name: "COVID-19", value: 25, color: "hsl(270 60% 70%)" },
  { name: "Hipertensão", value: 13, color: "hsl(270 40% 85%)" },
];

const chartConfig: ChartConfig = {
  Dengue: { label: "Dengue", color: "hsl(var(--primary))" },
  "COVID-19": { label: "COVID-19", color: "hsl(270 60% 70%)" },
  Hipertensão: { label: "Hipertensão", color: "hsl(270 40% 85%)" },
};

const metrics = [
  {
    label: "Total de Atendimentos",
    sublabel: "Este mês",
    value: "248",
    delta: "+12%",
    icon: Users,
  },
  {
    label: "Tempo Médio de Consulta",
    sublabel: "Por atendimento",
    value: "32 min",
    delta: "-4 min",
    icon: Clock,
  },
  {
    label: "Taxa de Retorno",
    sublabel: "Pacientes recorrentes",
    value: "78%",
    delta: "+5%",
    icon: Repeat,
  },
];

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

export default function PainelMonitoramento() {
  const [dates, setDates] = useState<Record<string, Date | undefined>>({
    diario: new Date(),
    mensal: new Date(),
    anual: new Date(),
  });

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
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {m.delta}
                  </span>
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
                  Distribuição de patologias — Setembro
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                Mensal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-[240px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={diagnosticData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {diagnosticData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>

              <div className="space-y-3">
                {diagnosticData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-sm font-medium text-foreground">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {d.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insight */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/8 to-primary/4 border border-primary/15">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                    IA Insight
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Observamos um aumento de <strong>15% nos casos de Dengue</strong> na sua
                    região este mês. Sugerimos reforçar orientações de prevenção e controle
                    vetorial junto aos pacientes.
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
                      onClick={() => { /* TODO: Implementar lógica no Cursor - Visualizar Relatório */ }}
                      className="w-9 h-9 rounded-lg border border-border/70 bg-background/70 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      title="Download PDF"
                      onClick={() => { /* TODO: Implementar lógica no Cursor - Baixar PDF do Relatório */ }}
                      className="w-9 h-9 rounded-lg border border-border/70 bg-background/70 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      title="Enviar por e-mail"
                      onClick={() => { /* TODO: Implementar lógica no Cursor - Enviar Relatório por E-mail */ }}
                      className="w-9 h-9 rounded-lg border border-border/70 bg-background/70 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>

                  <Button
                    onClick={() => { /* TODO: Implementar lógica no Cursor - Gerar Relatório Selecionado */ }}
                    className="w-full mt-3 h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm"
                  >
                    Gerar Relatório
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
