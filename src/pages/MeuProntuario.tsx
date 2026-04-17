import { useState, useMemo } from "react";
import {
  Home,
  FileText,
  FolderHeart,
  CalendarDays,
  Stethoscope,
  Activity,
  ScanLine,
  Search,
  Droplet,
  AlertTriangle,
  Pill,
  Heart,
  Thermometer,
  Weight,
  Gauge,
  Download,
  FileSearch,
  Filter,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import patientMaria from "@/assets/patient-maria.jpg";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

type EventType = "consulta" | "exame" | "retorno";

interface ClinicalEvent {
  id: string;
  date: string; // dd/mm/aaaa
  year: string;
  type: EventType;
  doctor: { name: string; initials: string; specialty: string };
  complaint: string;
  conduct: string;
  vitals: { bp: string; weight: string; temp: string };
  hasReceita?: boolean;
}

const events: ClinicalEvent[] = [
  {
    id: "ev-1",
    date: "12 Set 2024",
    year: "2024",
    type: "consulta",
    doctor: { name: "Dr. Carlos Mendes", initials: "CM", specialty: "Clínica Geral" },
    complaint: "Cefaleia recorrente há 2 semanas, com piora noturna.",
    conduct:
      "Solicitado hemograma completo. Prescrito analgésico e orientação de hidratação.",
    vitals: { bp: "120/80", weight: "62 kg", temp: "36.5°C" },
    hasReceita: true,
  },
  {
    id: "ev-2",
    date: "28 Jul 2024",
    year: "2024",
    type: "exame",
    doctor: { name: "Dra. Beatriz Alves", initials: "BA", specialty: "Radiologia" },
    complaint: "Exame de rotina — Raio-X de tórax solicitado em check-up anual.",
    conduct:
      "Resultado dentro da normalidade. Sem achados patológicos significativos.",
    vitals: { bp: "118/76", weight: "62 kg", temp: "36.4°C" },
  },
  {
    id: "ev-3",
    date: "14 Mai 2024",
    year: "2024",
    type: "retorno",
    doctor: { name: "Dra. Ana Ribeiro", initials: "AR", specialty: "Ginecologia" },
    complaint: "Retorno para avaliação de exames preventivos.",
    conduct:
      "Resultados dentro do esperado. Reforço de orientações sobre saúde feminina.",
    vitals: { bp: "115/75", weight: "61 kg", temp: "36.6°C" },
    hasReceita: true,
  },
  {
    id: "ev-4",
    date: "10 Fev 2023",
    year: "2023",
    type: "consulta",
    doctor: { name: "Dr. Carlos Mendes", initials: "CM", specialty: "Clínica Geral" },
    complaint: "Febre alta (39.2°C) e dor de cabeça intensa há 3 dias.",
    conduct:
      "Hipótese diagnóstica de infecção viral. Prescrito antitérmico e hidratação.",
    vitals: { bp: "115/75", weight: "60 kg", temp: "39.2°C" },
    hasReceita: true,
  },
];

const typeMeta: Record<EventType, { label: string; icon: typeof Stethoscope; tint: string }> = {
  consulta: { label: "Consulta", icon: Stethoscope, tint: "bg-primary/10 text-primary" },
  exame: { label: "Exame", icon: ScanLine, tint: "bg-blue-500/10 text-blue-600" },
  retorno: { label: "Retorno", icon: Activity, tint: "bg-emerald-500/10 text-emerald-600" },
};

export default function MeuProntuario() {
  const [year, setYear] = useState<string>("todos");
  const [specialty, setSpecialty] = useState<string>("todas");
  const [query, setQuery] = useState("");

  const specialties = useMemo(
    () => Array.from(new Set(events.map((e) => e.doctor.specialty))),
    [],
  );
  const years = useMemo(() => Array.from(new Set(events.map((e) => e.year))), []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (year !== "todos" && e.year !== year) return false;
      if (specialty !== "todas" && e.doctor.specialty !== specialty) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const blob = `${e.complaint} ${e.conduct} ${e.doctor.name} ${e.doctor.specialty}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [year, specialty, query]);

  return (
    <DashboardLayout navItems={navItems} userName="Maria Silva" userRole="Paciente">
      <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Meu Prontuário
            <FolderHeart className="h-5 w-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Linha do tempo clínica com seu histórico completo de saúde
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* Left: Health profile sidebar */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <Card className="p-6 rounded-2xl border-white/60 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 ring-offset-2 ring-offset-card">
                    <img
                      src={patientMaria}
                      alt="Maria Silva"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h2 className="mt-4 text-lg font-bold text-foreground tracking-tight">
                  Maria Silva
                </h2>
                <p className="text-xs text-muted-foreground">38 anos · Feminino</p>
              </div>

              <div className="mt-5 pt-5 border-t border-border/60 space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                    <Droplet className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Tipo Sanguíneo
                    </p>
                    <p className="text-sm font-bold text-foreground">O+</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Alergias
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 font-medium">
                        Dipirona
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 font-medium">
                        Penicilina
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Pill className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Uso Contínuo
                    </p>
                    <p className="text-sm text-foreground/90 leading-relaxed mt-0.5">
                      Losartana 50mg
                      <br />
                      Vitamina D3
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border-primary/20 bg-gradient-to-br from-primary/8 to-primary/3 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Heart className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Resumo
                </p>
              </div>
              <p className="text-xs text-foreground/75 leading-relaxed">
                <strong className="text-foreground">{events.length} atendimentos</strong>{" "}
                registrados no seu histórico. Última consulta:{" "}
                <strong className="text-foreground">12 Set 2024</strong>.
              </p>
            </Card>
          </div>

          {/* Right: Timeline + filters */}
          <div className="space-y-5 min-w-0">
            {/* Filters */}
            <Card className="p-4 rounded-2xl border-white/60 shadow-sm">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                    placeholder="Buscar por sintomas, médico ou conduta..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/40 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-card"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-[130px] h-10 rounded-xl border-border/60 bg-muted/40">
                      <Filter className="h-3.5 w-3.5 mr-1 text-primary/70" />
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os anos</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger className="w-[170px] h-10 rounded-xl border-border/60 bg-muted/40">
                      <SelectValue placeholder="Especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas especialidades</SelectItem>
                      {specialties.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <div className="relative pl-8 sm:pl-10">
              {/* vertical line */}
              <div
                className="absolute left-3 sm:left-4 top-2 bottom-2 w-px"
                style={{
                  background:
                    "linear-gradient(180deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.05) 100%)",
                }}
              />

              {filtered.length === 0 && (
                <Card className="p-8 rounded-2xl border-white/60 shadow-sm text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum atendimento encontrado com os filtros atuais.
                  </p>
                </Card>
              )}

              <div className="space-y-5">
                {filtered.map((ev) => {
                  const meta = typeMeta[ev.type];
                  const Icon = meta.icon;
                  return (
                    <div key={ev.id} className="relative">
                      {/* Dot */}
                      <div
                        className={cn(
                          "absolute -left-[26px] sm:-left-[30px] top-5 w-4 h-4 rounded-full border-4 border-background flex items-center justify-center",
                          "bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
                        )}
                      />
                      <Card className="p-5 rounded-2xl border-white/60 shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
                                meta.tint,
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-foreground tracking-tight">
                                {ev.date}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {meta.label}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                            {ev.doctor.specialty}
                          </span>
                        </div>

                        {/* Doctor */}
                        <div className="mt-4 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                            {ev.doctor.initials}
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {ev.doctor.name}
                          </p>
                        </div>

                        {/* Content */}
                        <div className="mt-4 space-y-2.5">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                              Queixa Principal
                            </p>
                            <p className="text-sm text-foreground/85 leading-relaxed">
                              {ev.complaint}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                              Conduta
                            </p>
                            <p className="text-sm text-foreground/85 leading-relaxed">
                              {ev.conduct}
                            </p>
                          </div>
                        </div>

                        {/* Vitals mini-panel */}
                        <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/40">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground leading-tight">PA</p>
                              <p className="text-xs font-semibold text-foreground tabular-nums">
                                {ev.vitals.bp}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Weight className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground leading-tight">Peso</p>
                              <p className="text-xs font-semibold text-foreground tabular-nums">
                                {ev.vitals.weight}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Thermometer className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground leading-tight">Temp</p>
                              <p className="text-xs font-semibold text-foreground tabular-nums">
                                {ev.vitals.temp}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {ev.hasReceita && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { /* TODO: Implementar lógica no Cursor - Ver Receita */ }}
                              className="h-8 rounded-lg border-primary/30 text-primary hover:bg-primary/5 text-xs font-medium"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1.5" />
                              Ver Receita
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { /* TODO: Implementar lógica no Cursor - Ver Detalhes do Evento */ }}
                            className="h-8 rounded-lg border-border/60 text-foreground/70 hover:bg-muted text-xs font-medium"
                          >
                            <FileSearch className="h-3.5 w-3.5 mr-1.5" />
                            Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { /* TODO: Implementar lógica no Cursor - Baixar Relatório */ }}
                            className="h-8 rounded-lg text-muted-foreground hover:text-primary text-xs font-medium ml-auto"
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Baixar Relatório
                          </Button>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
