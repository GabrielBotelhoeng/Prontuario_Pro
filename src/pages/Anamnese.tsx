import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  FileText,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Brain,
  Sparkles,
  Search,
  Save,
  Printer,
  FileSignature,
  Activity,
  HeartPulse,
  Thermometer,
  Scale,
  Stethoscope,
  Droplet,
  IdCard,
  CalendarRange,
  UserSquare2,
  Plus,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import patientRosa from "@/assets/patient-rosa.jpg";

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

// Simulação simples de mapeamento queixa -> CID
const cidDictionary: { keywords: string[]; code: string; label: string }[] = [
  { keywords: ["dor de cabeça", "cefaleia", "enxaqueca"], code: "R51", label: "Cefaleia" },
  { keywords: ["febre", "temperatura alta"], code: "R50.9", label: "Febre não especificada" },
  { keywords: ["tosse"], code: "R05", label: "Tosse" },
  { keywords: ["pressão alta", "hipertensão"], code: "I10", label: "Hipertensão essencial" },
  { keywords: ["ansiedade", "ansioso"], code: "F41.1", label: "Ansiedade generalizada" },
  { keywords: ["insônia", "não consigo dormir", "dificuldade para dormir"], code: "G47.0", label: "Distúrbios do sono" },
  { keywords: ["dor lombar", "dor nas costas", "lombalgia"], code: "M54.5", label: "Dor lombar baixa" },
  { keywords: ["náusea", "enjoo", "vômito"], code: "R11", label: "Náusea e vômito" },
  { keywords: ["diabetes", "glicemia"], code: "E11", label: "Diabetes mellitus tipo 2" },
];

interface Pathology {
  id: string;
  label: string;
  active: boolean;
}

export default function Anamnese() {
  const [queixa, setQueixa] = useState("");
  const [historicoFamiliar, setHistoricoFamiliar] = useState("");
  const [vitals, setVitals] = useState({
    pressao: "",
    fc: "",
    temp: "",
    peso: "",
  });
  const [pathologies, setPathologies] = useState<Pathology[]>([
    { id: "diabetes", label: "Diabetes", active: false },
    { id: "hipertensao", label: "Hipertensão", active: false },
    { id: "depressao", label: "Depressão", active: false },
    { id: "asma", label: "Asma", active: false },
    { id: "cardiopatia", label: "Cardiopatia", active: false },
    { id: "tireoide", label: "Tireoide", active: false },
    { id: "obesidade", label: "Obesidade", active: false },
    { id: "renal", label: "Insuficiência Renal", active: false },
  ]);
  const [cidSearch, setCidSearch] = useState("");

  const togglePathology = (id: string) => {
    setPathologies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );
  };

  // IA: sugere CID baseado na queixa principal
  const cidSuggestions = useMemo(() => {
    const text = (queixa + " " + cidSearch).toLowerCase();
    if (text.trim().length < 3) return [];
    return cidDictionary.filter((c) =>
      c.keywords.some((k) => text.includes(k)),
    );
  }, [queixa, cidSearch]);

  // IA: análise da queixa em tempo real
  const aiAnalyzing = queixa.trim().length > 5;

  return (
    <DashboardLayout navItems={navItems} userName="Dr. Carlos" userRole="Clínica Geral">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">
              Atendimento
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Anamnese Inteligente
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prontuário do paciente com assistência clínica em tempo real.
            </p>
          </div>
        </div>

        {/* Patient identification card */}
        <div
          className="bg-card border border-border/40 rounded-2xl p-6 lg:p-7"
          style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-primary/50 opacity-80 blur-[2px]" />
              <img
                src={patientRosa}
                alt="Rosa Maria da Silva"
                className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-full object-cover border-[3px] border-card ring-2 ring-primary/40"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
                  Rosa Maria da Silva
                </h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                  Em consulta
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Paciente desde março de 2021 · Última consulta há 2 meses
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <PatientStat icon={CalendarRange} label="Idade" value="44 anos" />
                <PatientStat icon={IdCard} label="CPF" value="000.000.000-00" />
                <PatientStat icon={Droplet} label="Tipo Sanguíneo" value="O+" />
                <PatientStat icon={UserSquare2} label="Convênio" value="Particular" />
              </div>
            </div>
          </div>
        </div>

        {/* Main grid: forms (2 cols) + AI panel (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: form cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Queixa principal */}
            <SectionCard
              title="Queixa Principal e Evolução"
              subtitle="Descreva os sintomas relatados pelo paciente"
              icon={Stethoscope}
            >
              <div className="space-y-3">
                <Textarea
                  id="queixa"
                  name="queixa"
                  placeholder="Ex: Paciente relata dor de cabeça constante há 5 dias, com piora ao final da tarde..."
                  value={queixa}
                  onChange={(e) => setQueixa(e.target.value)}
                  className="min-h-[140px] rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50 resize-none"
                />
                {aiAnalyzing && (
                  <div className="flex items-center gap-2 text-xs text-primary/80 italic animate-in fade-in duration-300">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    Analisando sintomas para sugerir CID...
                  </div>
                )}
              </div>

              <div className="mt-5 pt-5 border-t border-dashed border-border/50 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Histórico Familiar
                </Label>
                <Textarea
                  id="historicoFamiliar"
                  name="historicoFamiliar"
                  placeholder="Pais, irmãos, condições hereditárias relevantes..."
                  value={historicoFamiliar}
                  onChange={(e) => setHistoricoFamiliar(e.target.value)}
                  className="min-h-[80px] rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50 resize-none"
                />
              </div>
            </SectionCard>

            {/* Card 2: Patologias */}
            <SectionCard
              title="Histórico e Patologias"
              subtitle="Marque as condições preexistentes do paciente"
              icon={Activity}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pathologies.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer",
                      p.active
                        ? "bg-primary/5 border-primary/30"
                        : "bg-background border-border/60 hover:border-primary/30 hover:bg-primary/[0.02]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        p.active ? "text-primary" : "text-foreground/80",
                      )}
                    >
                      {p.label}
                    </span>
                    <Switch
                      checked={p.active}
                      onCheckedChange={() => togglePathology(p.id)}
                    />
                  </label>
                ))}
              </div>
            </SectionCard>

            {/* Card 3: Sinais vitais */}
            <SectionCard
              title="Sinais Vitais"
              subtitle="Medidas atuais aferidas no atendimento"
              icon={HeartPulse}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <VitalInput
                  icon={Activity}
                  label="Pressão Arterial"
                  unit="mmHg"
                  placeholder="120/80"
                  value={vitals.pressao}
                  onChange={(v) => setVitals({ ...vitals, pressao: v })}
                />
                <VitalInput
                  icon={HeartPulse}
                  label="Frequência Cardíaca"
                  unit="bpm"
                  placeholder="72"
                  value={vitals.fc}
                  onChange={(v) => setVitals({ ...vitals, fc: v })}
                />
                <VitalInput
                  icon={Thermometer}
                  label="Temperatura"
                  unit="°C"
                  placeholder="36.5"
                  value={vitals.temp}
                  onChange={(v) => setVitals({ ...vitals, temp: v })}
                />
                <VitalInput
                  icon={Scale}
                  label="Peso"
                  unit="kg"
                  placeholder="68.5"
                  value={vitals.peso}
                  onChange={(v) => setVitals({ ...vitals, peso: v })}
                />
              </div>
            </SectionCard>
          </div>

          {/* RIGHT: AI Insights panel (sticky) */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-4">
              <div
                className="rounded-2xl p-6 border border-primary/20 relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(160deg, hsl(267 60% 98%) 0%, hsl(267 50% 96%) 60%, hsl(270 55% 94%) 100%)",
                  boxShadow: "0 4px 30px -8px hsl(267 60% 50% / 0.18)",
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                      <Brain className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        Insights da IA
                      </p>
                      <p className="text-sm font-semibold text-foreground tracking-tight">
                        Assistente Clínico
                      </p>
                    </div>
                  </div>

                  {/* CID search */}
                  <div className="mt-5 space-y-2">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Busca inteligente de CID
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="cidSearch"
                        name="cidSearch"
                        placeholder="Digite o sintoma..."
                        value={cidSearch}
                        onChange={(e) => setCidSearch(e.target.value)}
                        className="h-10 pl-9 rounded-xl border-border/60 bg-card focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50 text-sm"
                      />
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="mt-4 space-y-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Sugestões de CID
                    </p>

                    {cidSuggestions.length === 0 && (
                      <div className="rounded-xl bg-card/60 border border-dashed border-border/60 p-4 text-center">
                        <Sparkles className="h-4 w-4 text-primary/40 mx-auto mb-1.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Comece a descrever a queixa para receber sugestões automáticas de CID-10.
                        </p>
                      </div>
                    )}

                    {cidSuggestions.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => { /* TODO: Implementar lógica no Cursor - Selecionar CID */ }}
                        className="group w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:bg-primary/[0.03] transition-all text-left animate-in fade-in slide-in-from-right-2 duration-300"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Badge className="bg-primary text-primary-foreground hover:bg-primary rounded-md text-[10px] font-bold tracking-wider flex-shrink-0">
                            {s.code}
                          </Badge>
                          <span className="text-sm text-foreground/85 truncate">
                            {s.label}
                          </span>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>

                  {/* Clinical hint */}
                  {aiAnalyzing && (
                    <div className="mt-4 pt-4 border-t border-primary/15">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Observação clínica
                      </p>
                      <p className="text-xs text-foreground/75 italic leading-relaxed">
                        Considere avaliar histórico de cefaleia recorrente e padrão de sono nas últimas 2 semanas.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-2 pb-4">
          <Button
            variant="ghost"
            onClick={() => { /* TODO: Implementar lógica no Cursor - Gerar Atestado */ }}
            className="text-primary hover:text-primary hover:bg-primary/5 rounded-xl gap-2"
          >
            <FileSignature className="h-4 w-4" />
            Gerar Atestado
          </Button>
          <Button
            variant="outline"
            onClick={() => { /* TODO: Implementar lógica no Cursor - Imprimir Relatório */ }}
            className="rounded-xl border-primary/40 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/60 gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir Relatório
          </Button>
          <Button 
            onClick={() => { /* TODO: Implementar lógica no Cursor - Salvar Prontuário */ }}
            className="rounded-xl gap-2 shadow-sm"
          >
            <Save className="h-4 w-4" />
            Salvar Prontuário
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* -------------------------------- Helpers --------------------------------- */

function PatientStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40 border border-border/40">
      <Icon className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground truncate leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section
      className="bg-card border border-border/40 rounded-2xl p-6 lg:p-7"
      style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground tracking-tight leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function VitalInput({
  icon: Icon,
  label,
  unit,
  placeholder,
  value,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-primary" strokeWidth={2} />
        {label}
      </Label>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pr-12 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50 text-sm font-medium"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {unit}
        </span>
      </div>
    </div>
  );
}
