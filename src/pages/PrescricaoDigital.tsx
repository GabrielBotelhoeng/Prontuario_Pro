import { useState, useMemo } from "react";
import {
  Home, FileText, ClipboardList, CalendarDays, BarChart3,
  Plus, Download, Printer, Save, MessageCircle, Sparkles,
  AlertTriangle, Pill, QrCode, Trash2,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatePrescricao } from "@/hooks/usePrescricoes";
import { usePacienteByConsultas } from "@/hooks/usePacientes";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@/assets/logo-icon.png";

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

interface Medication {
  id: string;
  name: string;
  dosage: string;
  quantity: string;
  posology: string;
}

const aiSuggestions: Record<string, { type: "info" | "warning"; message: string; posology?: string }> = {
  sertralina: { type: "warning", message: "Antidepressivo. Atenção a interações com IMAO.", posology: "Tomar 1 comprimido (50mg) pela manhã, após o café." },
  rivotril: { type: "warning", message: "Requer Receita de Controle Especial (Notificação Azul - B1).", posology: "Tomar 1 comprimido à noite, antes de dormir." },
  clonazepam: { type: "warning", message: "Requer Receita de Controle Especial (Notificação Azul - B1).", posology: "Tomar 1 comprimido à noite, antes de dormir." },
  amoxicilina: { type: "info", message: "Antibiótico — orientar paciente a completar todo o ciclo.", posology: "Tomar 1 cápsula (500mg) de 8 em 8 horas, por 7 dias." },
  dipirona: { type: "info", message: "Analgésico comum. Verificar histórico de alergias.", posology: "Tomar 1 comprimido (500mg) a cada 6 horas, se dor ou febre." },
};

const tipoReceitaLabel: Record<string, string> = {
  simples: "Receita Simples",
  controle: "Receita de Controle Especial",
  branca: "Receituário Comum",
  azul: "Notificação de Receita B (Azul)",
  amarela: "Notificação de Receita A (Amarela)",
};

const tipoReceitaAccent: Record<string, { stripe: string; label: string }> = {
  simples: { stripe: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.5) 100%)", label: "text-primary" },
  branca: { stripe: "linear-gradient(90deg, hsl(0 0% 75%) 0%, hsl(0 0% 90%) 100%)", label: "text-foreground/70" },
  controle: { stripe: "linear-gradient(90deg, hsl(215 85% 55%) 0%, hsl(215 85% 70%) 100%)", label: "text-[hsl(215_85%_45%)]" },
  azul: { stripe: "linear-gradient(90deg, hsl(215 90% 50%) 0%, hsl(215 90% 65%) 100%)", label: "text-[hsl(215_90%_45%)]" },
  amarela: { stripe: "linear-gradient(90deg, hsl(45 95% 55%) 0%, hsl(45 95% 70%) 100%)", label: "text-[hsl(40_85%_40%)]" },
};

export default function PrescricaoDigital() {
  const { profile, medico } = useAuth();
  const { data: pacientes = [] } = usePacienteByConsultas();
  const createPrescricao = useCreatePrescricao();
  const { toast } = useToast();

  const [tipoReceita, setTipoReceita] = useState<"simples" | "controle" | "branca" | "azul" | "amarela">("simples");
  const [pacienteId, setPacienteId] = useState("");
  const [medication, setMedication] = useState<Medication>({ id: "", name: "", dosage: "", quantity: "", posology: "" });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [salvando, setSalvando] = useState(false);

  const pacienteSelecionado = pacientes.find((p) => p.id === pacienteId);
  const pacienteNome = pacienteSelecionado?.profile?.nome ?? "";

  const aiHint = useMemo(() => {
    const key = medication.name.trim().toLowerCase();
    if (!key || key.length < 4) return null;
    const found = Object.entries(aiSuggestions).find(([k]) => key.includes(k));
    return found ? found[1] : null;
  }, [medication.name]);

  const addMedication = () => {
    if (!medication.name.trim()) return;
    setMedications([...medications, { ...medication, id: crypto.randomUUID() }]);
    setMedication({ id: "", name: "", dosage: "", quantity: "", posology: "" });
  };

  const removeMedication = (id: string) => setMedications(medications.filter((m) => m.id !== id));
  const applyAiPosology = () => { if (aiHint?.posology) setMedication({ ...medication, posology: aiHint.posology }); };

  const salvarRascunho = async () => {
    if (!pacienteId) { toast({ title: "Selecione um paciente", variant: "destructive" }); return; }
    setSalvando(true);
    try {
      await createPrescricao.mutateAsync({ paciente_id: pacienteId, tipo_receita: tipoReceita, medicamentos: medications, status: "rascunho" });
      toast({ title: "Rascunho salvo com sucesso!" });
    } catch { toast({ title: "Erro ao salvar rascunho", variant: "destructive" }); }
    finally { setSalvando(false); }
  };

  const finalizarReceita = async () => {
    if (!pacienteId) { toast({ title: "Selecione um paciente", variant: "destructive" }); return; }
    if (medications.length === 0) { toast({ title: "Adicione ao menos um medicamento", variant: "destructive" }); return; }
    setSalvando(true);
    try {
      await createPrescricao.mutateAsync({ paciente_id: pacienteId, tipo_receita: tipoReceita, medicamentos: medications, status: "finalizada" });
      toast({ title: "Receita finalizada!", description: "Receita salva no prontuário do paciente." });
      setMedications([]);
      setPacienteId("");
    } catch { toast({ title: "Erro ao finalizar receita", variant: "destructive" }); }
    finally { setSalvando(false); }
  };

  const accent = tipoReceitaAccent[tipoReceita] ?? tipoReceitaAccent.simples;

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Atendimento</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Prescrição Digital</h1>
            <p className="text-sm text-muted-foreground mt-1">Crie receitas com assistência inteligente e assinatura digital.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={salvarRascunho} disabled={salvando} className="rounded-xl gap-2">
              <Save className="h-4 w-4" />Salvar rascunho
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl gap-2">
              <Printer className="h-4 w-4" />Imprimir
            </Button>
            <Button size="sm" onClick={finalizarReceita} disabled={salvando} className="rounded-xl gap-2">
              <Download className="h-4 w-4" />Finalizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Form */}
          <div className="bg-card border border-border/40 rounded-2xl p-6 lg:p-7 space-y-5 relative" style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">Dados da Receita</h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15 rounded-full">
                <Pill className="h-3 w-3 mr-1" />{medications.length} medicamento(s)
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paciente</Label>
                <Select value={pacienteId} onValueChange={setPacienteId}>
                  <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background">
                    <SelectValue placeholder="Selecionar paciente..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {pacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.profile?.nome ?? "Paciente"}</SelectItem>
                    ))}
                    {pacientes.length === 0 && (
                      <SelectItem value="_none" disabled>Nenhum paciente com consultas</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de Receita</Label>
                <Select value={tipoReceita} onValueChange={(v) => setTipoReceita(v as typeof tipoReceita)}>
                  <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="simples">Receita Simples</SelectItem>
                    <SelectItem value="branca">Receituário Comum (Branca)</SelectItem>
                    <SelectItem value="controle">Controle Especial</SelectItem>
                    <SelectItem value="azul">Notificação B (Azul)</SelectItem>
                    <SelectItem value="amarela">Notificação A (Amarela)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medicamento</Label>
                <Input
                  placeholder="Ex: Sertralina, Amoxicilina..."
                  value={medication.name}
                  onChange={(e) => setMedication({ ...medication, name: e.target.value })}
                  className="h-11 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dosagem</Label>
                <Input placeholder="Ex: 50mg" value={medication.dosage} onChange={(e) => setMedication({ ...medication, dosage: e.target.value })} className="h-11 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantidade</Label>
                <Input placeholder="Ex: 30 comprimidos" value={medication.quantity} onChange={(e) => setMedication({ ...medication, quantity: e.target.value })} className="h-11 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Posologia</Label>
                <Textarea
                  placeholder="Ex: Tomar 1 comprimido pela manhã, após o café da manhã..."
                  value={medication.posology}
                  onChange={(e) => setMedication({ ...medication, posology: e.target.value })}
                  className="min-h-[110px] rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/50 resize-none"
                />
              </div>
            </div>

            {aiHint && (
              <div className={cn("rounded-xl p-4 border animate-in fade-in slide-in-from-bottom-2 duration-300", "bg-primary/5 border-primary/20")}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {aiHint.type === "warning" ? <AlertTriangle className="h-4 w-4 text-primary-foreground" /> : <Sparkles className="h-4 w-4 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Assistente de IA</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{aiHint.message}</p>
                    {aiHint.posology && (
                      <button onClick={applyAiPosology} className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />Sugerir posologia comum
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={addMedication} variant="outline" className="flex-1 h-11 rounded-xl border-primary/40 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/60 gap-2">
                <Plus className="h-4 w-4" />Adicionar Medicamento
              </Button>
              <Button onClick={finalizarReceita} disabled={salvando} className="flex-1 h-11 rounded-xl gap-2 shadow-sm">
                <Download className="h-4 w-4" />Finalizar e Salvar
              </Button>
            </div>
          </div>

          {/* RIGHT: Receipt preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Pré-visualização em tempo real</p>
              <Badge variant="outline" className={cn("rounded-full text-[10px] border-current", accent.label)}>{tipoReceitaLabel[tipoReceita]}</Badge>
            </div>
            <div className="bg-card border border-border/40 rounded-2xl min-h-[640px] flex flex-col overflow-hidden" style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)", backgroundImage: "linear-gradient(180deg, hsl(267 30% 99%) 0%, hsl(0 0% 100%) 100%)" }}>
              <div className="h-1.5 w-full" style={{ background: accent.stripe }} />
              <div className="p-8 lg:p-10 flex flex-col flex-1">
                <div className="flex items-start justify-between pb-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <img src={logoIcon} alt="" className="w-11 h-11" />
                    <div>
                      <p className="text-base font-bold text-foreground tracking-tight">{medico?.clinica_nome ?? "Consultório"}</p>
                      <p className="text-[11px] text-muted-foreground">{medico?.clinica_endereco ?? "Endereço do consultório"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{tipoReceitaLabel[tipoReceita]}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{new Date().toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <div className="py-4 border-b border-dashed border-border/50">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Paciente</p>
                  <p className="text-sm font-medium text-foreground">{pacienteNome || <span className="text-muted-foreground/50 italic">Nome do paciente</span>}</p>
                </div>
                <div className="py-5 space-y-4 flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Prescrição</p>
                  {medications.length === 0 && !medication.name && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3"><Pill className="h-5 w-5 text-muted-foreground/60" /></div>
                      <p className="text-sm text-muted-foreground/70">Os medicamentos aparecerão aqui</p>
                    </div>
                  )}
                  {medications.map((med, idx) => (
                    <div key={med.id} className="group flex gap-3 pb-3 border-b border-border/30 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{med.name} {med.dosage && <span className="text-muted-foreground font-normal">— {med.dosage}</span>}</p>
                        {med.quantity && <p className="text-xs text-muted-foreground mt-0.5">Quantidade: {med.quantity}</p>}
                        {med.posology && <p className="text-sm text-foreground/75 mt-1.5 leading-relaxed">{med.posology}</p>}
                      </div>
                      <button onClick={() => removeMedication(med.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {medication.name && (
                    <div className="flex gap-3 pb-3 border border-dashed border-primary/30 bg-primary/[0.03] rounded-xl p-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{medications.length + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{medication.name}{medication.dosage && <span className="text-muted-foreground font-normal"> — {medication.dosage}</span>}</p>
                        {medication.quantity && <p className="text-xs text-muted-foreground mt-0.5">Quantidade: {medication.quantity}</p>}
                        {medication.posology && <p className="text-sm text-foreground/75 mt-1.5 leading-relaxed">{medication.posology}</p>}
                        <p className="text-[10px] text-primary font-semibold mt-2 uppercase tracking-widest">Rascunho</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-5 border-t border-border/50 flex items-end justify-between gap-6">
                  <div className="flex-1">
                    <div className="border-b border-foreground/30 pb-1 mb-2 max-w-[240px]">
                      <p className="text-sm font-semibold text-foreground">{profile?.nome}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">CRM {medico?.crm} · {medico?.especialidade}</p>
                    <p className="text-[10px] text-primary font-semibold mt-2 uppercase tracking-widest">Assinado digitalmente</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-foreground/[0.04] to-primary/10 border border-border/60 flex items-center justify-center">
                      <QrCode className="h-10 w-10 text-foreground/70" strokeWidth={1.5} />
                    </div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Validar receita</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
