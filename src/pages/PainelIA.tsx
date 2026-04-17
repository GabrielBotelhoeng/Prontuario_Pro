import { useMemo, useState } from "react";
import {
  Home,
  FileText,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Sparkles,
  Brain,
  Send,
  AlertTriangle,
  MapPin,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Bot,
  User,
  Activity,
  Network,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

type ChatMsg = { role: "user" | "ai"; content: string };

const initialChat: ChatMsg[] = [
  {
    role: "ai",
    content:
      "Olá, Dr. Carlos! Sou o assistente clínico de IA. Posso responder perguntas sobre seus pacientes, sugerir diagnósticos ou cruzar dados do consultório. Como posso ajudar?",
  },
];

const epidemicAlerts = [
  {
    id: "alert-1",
    severity: "high" as const,
    title: "Surto de Gripe H1N1",
    region: "Bairro Centro · Pirenópolis-GO",
    delta: "+20%",
    description:
      "Aumento significativo nas últimas 72h. Recomenda-se reforçar campanha de vacinação para grupos de risco.",
  },
  {
    id: "alert-2",
    severity: "medium" as const,
    title: "Dengue em alta",
    region: "Região Norte · 5 km do consultório",
    delta: "+12%",
    description:
      "Casos confirmados subindo gradualmente. Atenção redobrada em pacientes com febre alta e dor retro-orbital.",
  },
  {
    id: "alert-3",
    severity: "low" as const,
    title: "Estabilidade COVID-19",
    region: "Toda a cidade",
    delta: "−4%",
    description:
      "Casos em queda controlada. Manter protocolos padrão de prevenção em consultório.",
  },
];

const noShowData = [
  { day: "Seg", probability: 12 },
  { day: "Ter", probability: 18 },
  { day: "Qua", probability: 9 },
  { day: "Qui", probability: 24 },
  { day: "Sex", probability: 31 },
  { day: "Sáb", probability: 42 },
];

const noShowChartConfig: ChartConfig = {
  probability: { label: "Probabilidade de falta", color: "hsl(var(--primary))" },
};

const protocols = [
  {
    id: "p1",
    title: "Manejo de Hipertensão Resistente — Diretriz SBC 2024",
    tag: "Cardiologia",
    updated: "Atualizado há 3 dias",
    relevance: "Alta",
  },
  {
    id: "p2",
    title: "Antibioticoterapia em ITU não complicada",
    tag: "Clínica Geral",
    updated: "Atualizado há 1 semana",
    relevance: "Alta",
  },
  {
    id: "p3",
    title: "Rastreio de Diabetes Tipo 2 em adultos > 45 anos",
    tag: "Endocrinologia",
    updated: "Atualizado há 2 semanas",
    relevance: "Média",
  },
  {
    id: "p4",
    title: "Conduta em Síndrome Gripal — atualização sazonal",
    tag: "Infectologia",
    updated: "Atualizado ontem",
    relevance: "Crítica",
  },
];

const severityStyles = {
  high: {
    bg: "bg-rose-500/10",
    text: "text-rose-600",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    label: "Crítico",
  },
  medium: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    label: "Atenção",
  },
  low: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Estável",
  },
};

const relevanceStyles: Record<string, string> = {
  Crítica: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  Alta: "bg-primary/10 text-primary border-primary/30",
  Média: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

export default function PainelIA() {
  const [chat, setChat] = useState<ChatMsg[]>(initialChat);
  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    // TODO: Implementar lógica no Cursor - Chamar edge function de IA clínica (Lovable AI Gateway) e fazer streaming da resposta
    setChat((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "ai",
        content:
          "Analisando sua base clínica... (resposta será gerada pela IA quando o backend for conectado)",
      },
    ]);
    setInput("");
  };

  const maxNoShow = useMemo(
    () => Math.max(...noShowData.map((d) => d.probability)),
    [],
  );

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Dr. Carlos"
      userRole="Clínica Geral"
    >
      <div
        className="max-w-7xl mx-auto space-y-6 -m-4 lg:-m-8 p-4 lg:p-8 min-h-[calc(100vh-4rem)]"
        style={{
          background:
            "linear-gradient(160deg, hsl(240 35% 97%) 0%, hsl(260 40% 96%) 50%, hsl(220 35% 95%) 100%)",
        }}
      >
        {/* Header */}
        <div
          className="relative rounded-2xl overflow-hidden border border-primary/20 p-6 lg:p-7"
          style={{
            background:
              "linear-gradient(135deg, hsl(230 45% 18%) 0%, hsl(258 50% 28%) 50%, hsl(270 50% 35%) 100%)",
            boxShadow: "0 12px 40px -12px hsl(258 50% 25% / 0.4)",
          }}
        >
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, hsl(270 80% 60% / 0.6), transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-30 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, hsl(220 80% 60% / 0.6), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Network className="h-7 w-7 text-white" strokeWidth={1.8} />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-white text-2xl lg:text-3xl font-bold tracking-tight">
                  Painel de IA
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                  Cérebro Clínico
                </span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                Centro de inteligência clínica em tempo real. Cruze dados,
                detecte padrões e tome decisões mais rápidas com apoio da IA.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-6 px-5 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="text-center">
                <p className="text-white text-xl font-bold tabular-nums">
                  1.247
                </p>
                <p className="text-white/60 text-[10px] uppercase tracking-wider">
                  Análises hoje
                </p>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="text-center">
                <p className="text-white text-xl font-bold tabular-nums">
                  98.2%
                </p>
                <p className="text-white/60 text-[10px] uppercase tracking-wider">
                  Precisão
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Chat Clínico com IA */}
          <div
            className="bg-card rounded-2xl border border-border/50 flex flex-col overflow-hidden"
            style={{ boxShadow: "0 4px 24px -8px rgba(0,0,0,0.08)" }}
          >
            <div
              className="px-5 py-4 border-b border-border/50 flex items-center gap-3"
              style={{
                background:
                  "linear-gradient(90deg, hsl(258 50% 28% / 0.04) 0%, transparent 100%)",
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-bold text-[15px] tracking-tight">
                  Chat Clínico com IA
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pergunte qualquer coisa sobre seus pacientes
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>

            {/* Mensagens */}
            <div className="flex-1 px-5 py-4 space-y-3 max-h-[340px] overflow-y-auto">
              {chat.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300",
                    msg.role === "user" && "flex-row-reverse",
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                      msg.role === "ai"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-foreground/70",
                    )}
                  >
                    {msg.role === "ai" ? (
                      <Bot className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]",
                      msg.role === "ai"
                        ? "bg-muted/60 text-foreground rounded-tl-sm"
                        : "bg-primary text-primary-foreground rounded-tr-sm",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Sugestões rápidas */}
            <div className="px-5 pb-3 flex flex-wrap gap-2">
              {[
                "Pacientes > 60 anos sem check-up há 6 meses",
                "Quem tem alergia a penicilina?",
                "Diagnósticos mais comuns no mês",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/50 hover:border-primary/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 pb-5 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <Input
                  id="aiChatInput"
                  name="aiChatInput"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ex: Quais pacientes têm risco cardiovascular alto?"
                  className="h-11 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50 text-sm"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="h-11 w-11 rounded-xl p-0 shadow-sm flex-shrink-0"
                  title="Enviar pergunta"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2: Alertas Epidemiológicos */}
          <div
            className="bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col"
            style={{ boxShadow: "0 4px 24px -8px rgba(0,0,0,0.08)" }}
          >
            <div
              className="px-5 py-4 border-b border-border/50 flex items-center gap-3"
              style={{
                background:
                  "linear-gradient(90deg, hsl(0 75% 55% / 0.04) 0%, transparent 100%)",
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <ShieldAlert className="h-[18px] w-[18px] text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-bold text-[15px] tracking-tight">
                  Alertas Epidemiológicos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Surtos detectados na sua região
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-rose-500/30 text-rose-600 bg-rose-500/10 text-[10px] uppercase tracking-wider font-bold"
              >
                3 ativos
              </Badge>
            </div>

            <div className="p-5 space-y-3 flex-1">
              {epidemicAlerts.map((alert) => {
                const s = severityStyles[alert.severity];
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all hover:shadow-sm",
                      s.border,
                      s.bg,
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn("w-2 h-2 rounded-full animate-pulse", s.dot)}
                        />
                        <h4 className="font-semibold text-foreground text-sm truncate">
                          {alert.title}
                        </h4>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold tabular-nums px-2 py-0.5 rounded-md",
                          s.text,
                          s.bg,
                        )}
                      >
                        {alert.delta}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      {alert.region}
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                );
              })}

              <button
                onClick={() => {
                  /* TODO: Implementar lógica no Cursor - Abrir mapa epidemiológico completo */
                }}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-border/60 text-foreground/80 text-sm font-medium hover:bg-muted hover:border-primary/30 hover:text-primary transition-all"
              >
                <MapPin className="h-4 w-4" />
                Ver mapa interativo da região
              </button>
            </div>
          </div>

          {/* Card 3: Análise Preditiva de Agenda */}
          <div
            className="bg-card rounded-2xl border border-border/50 overflow-hidden"
            style={{ boxShadow: "0 4px 24px -8px rgba(0,0,0,0.08)" }}
          >
            <div
              className="px-5 py-4 border-b border-border/50 flex items-center gap-3"
              style={{
                background:
                  "linear-gradient(90deg, hsl(220 75% 50% / 0.04) 0%, transparent 100%)",
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-[18px] w-[18px] text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-bold text-[15px] tracking-tight">
                  Análise Preditiva de Agenda
                </h3>
                <p className="text-xs text-muted-foreground">
                  Probabilidade de no-show por dia da semana
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">
                IA preditiva
              </span>
            </div>

            <div className="p-5">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-foreground tabular-nums">
                  18%
                </span>
                <span className="text-xs text-muted-foreground">
                  taxa média prevista esta semana
                </span>
                <Badge
                  variant="outline"
                  className="ml-auto border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-semibold"
                >
                  −3% vs semana anterior
                </Badge>
              </div>

              <ChartContainer config={noShowChartConfig} className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={noShowData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ChartTooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="probability" radius={[8, 8, 0, 0]}>
                      {noShowData.map((d) => (
                        <Cell
                          key={d.day}
                          fill={
                            d.probability === maxNoShow
                              ? "hsl(0 75% 60%)"
                              : d.probability > 20
                                ? "hsl(35 90% 55%)"
                                : "hsl(var(--primary))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  <strong className="font-semibold text-amber-700">
                    Sugestão da IA:
                  </strong>{" "}
                  Sábado tem 42% de chance de faltas. Considere overbooking de 2
                  horários ou enviar lembretes 24h antes.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Biblioteca de Protocolos */}
          <div
            className="bg-card rounded-2xl border border-border/50 overflow-hidden"
            style={{ boxShadow: "0 4px 24px -8px rgba(0,0,0,0.08)" }}
          >
            <div
              className="px-5 py-4 border-b border-border/50 flex items-center gap-3"
              style={{
                background:
                  "linear-gradient(90deg, hsl(258 50% 50% / 0.04) 0%, transparent 100%)",
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-bold text-[15px] tracking-tight">
                  Biblioteca de Protocolos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Atualizações sugeridas para o seu perfil clínico
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                Curado por IA
              </span>
            </div>

            <div className="p-5 space-y-2.5">
              {protocols.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    /* TODO: Implementar lógica no Cursor - Abrir protocolo clínico {p.id} */
                  }}
                  className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/[0.03] transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center flex-shrink-0 transition-colors">
                    <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {p.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {p.tag}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground">
                        {p.updated}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      relevanceStyles[p.relevance],
                    )}
                  >
                    {p.relevance}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}

              <button
                onClick={() => {
                  /* TODO: Implementar lógica no Cursor - Ver biblioteca completa de protocolos */
                }}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-primary text-sm font-semibold hover:bg-primary/5 transition-all"
              >
                Ver biblioteca completa
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé / status da IA */}
        <div
          className="rounded-2xl border border-border/50 p-4 flex flex-wrap items-center gap-4 bg-card"
          style={{ boxShadow: "0 4px 24px -8px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Modelo clínico ativo
              </p>
              <p className="text-[11px] text-muted-foreground">
                Última sincronização há 2 minutos
              </p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-border/50" />
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground font-semibold">
                3.847 prontuários
              </strong>{" "}
              indexados na base
            </p>
          </div>
          <button
            onClick={() => {
              /* TODO: Implementar lógica no Cursor - Abrir configurações da IA */
            }}
            className="ml-auto text-xs font-semibold text-primary hover:underline"
          >
            Configurações avançadas →
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
