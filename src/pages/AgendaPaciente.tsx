import { useMemo, useState } from "react";
import { Home, FileText, FolderHeart, CalendarDays, Stethoscope, Clock, Plus, Send } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useConsultasPaciente, useSolicitarConsulta } from "@/hooks/useConsultas";
import { useTodosMedicos } from "@/hooks/usePacientes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

type Status = "Confirmado" | "Aguardando" | "Finalizado" | "Em andamento" | "Cancelado";

const statusStyles: Record<Status, string> = {
  Confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Aguardando: "bg-amber-50 text-amber-700 border-amber-200",
  Finalizado: "bg-muted text-muted-foreground border-border",
  "Em andamento": "bg-primary/10 text-primary border-primary/30",
  Cancelado: "bg-red-50 text-red-600 border-red-200",
};

const TIPOS_CONSULTA = ["Consulta de Rotina", "Retorno", "Urgência"] as const;

const HORARIOS: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 18; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 18) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

function hojeISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AgendaPaciente() {
  const { data: consultas = [], isLoading } = useConsultasPaciente();
  const { data: medicos = [] } = useTodosMedicos();
  const solicitar = useSolicitarConsulta();
  const { toast } = useToast();

  const [medicoId, setMedicoId] = useState("");
  const [data, setData] = useState(hojeISO());
  const [horario, setHorario] = useState(HORARIOS[0]);
  const [tipo, setTipo] = useState<string>(TIPOS_CONSULTA[0]);
  const [obs, setObs] = useState("");

  const futuras = useMemo(
    () =>
      consultas
        .filter((c) => new Date(c.data_hora) >= new Date() && c.status !== "Cancelado" && c.status !== "Finalizado")
        .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()),
    [consultas],
  );

  const passadas = useMemo(
    () =>
      consultas
        .filter((c) => new Date(c.data_hora) < new Date() || c.status === "Finalizado" || c.status === "Cancelado")
        .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
        .slice(0, 10),
    [consultas],
  );

  async function handleSolicitar() {
    if (!medicoId) { toast({ title: "Selecione um médico", variant: "destructive" }); return; }
    if (!data || !horario) { toast({ title: "Informe data e horário", variant: "destructive" }); return; }
    try {
      const dataHora = new Date(`${data}T${horario}:00`);
      if (dataHora < new Date()) {
        toast({ title: "Data inválida", description: "Escolha uma data e horário futuros.", variant: "destructive" });
        return;
      }
      await solicitar.mutateAsync({
        medico_id: medicoId,
        data_hora: dataHora.toISOString(),
        tipo,
        observacoes: obs.trim() || undefined,
      });
      toast({ title: "Consulta solicitada", description: "Aguarde a confirmação do médico." });
      setMedicoId("");
      setObs("");
    } catch (err: unknown) {
      toast({ title: "Erro ao solicitar", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Saúde</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Agendamento</h1>
          <p className="text-sm text-muted-foreground mt-1">Consultas agendadas e histórico de atendimentos</p>
        </div>

        {/* Solicitar Consulta */}
        <section className="bg-card border border-border/40 rounded-2xl p-6" style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Plus className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Solicitar Consulta</h2>
              <p className="text-xs text-muted-foreground">Escolha o médico, dia e horário desejados</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Médico</Label>
              <Select value={medicoId} onValueChange={setMedicoId}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecionar médico..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {medicos.length === 0 && <SelectItem value="_none" disabled>Nenhum médico disponível</SelectItem>}
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.profile?.nome ?? "Médico"} — CRM {m.crm} · {m.especialidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</Label>
              <Input type="date" value={data} min={hojeISO()} onChange={(e) => setData(e.target.value)} className="h-10 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Horário</Label>
              <Select value={horario} onValueChange={setHorario}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-72">
                  {HORARIOS.map((h) => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TIPOS_CONSULTA.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações <span className="normal-case text-muted-foreground/70">(opcional)</span></Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Conte ao médico o motivo da consulta..." className="min-h-[70px] rounded-xl resize-none" />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={handleSolicitar} disabled={solicitar.isPending} className="rounded-xl gap-2">
              {solicitar.isPending && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              <Send className="h-4 w-4" />
              {solicitar.isPending ? "Enviando..." : "Solicitar Consulta"}
            </Button>
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : (
          <>
            <section>
              <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Próximas Consultas</h2>
              {futuras.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma consulta agendada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {futuras.map((c) => (
                    <div key={c.id} className="bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-5 hover:shadow-md transition-all" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><CalendarDays className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-foreground font-semibold text-[15px]">{c.medico?.profile?.nome ?? "Médico"}</p>
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", statusStyles[c.status as Status])}>{c.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Stethoscope className="h-3.5 w-3.5" />{c.tipo}</div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5"><Clock className="h-3.5 w-3.5" />{format(new Date(c.data_hora), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {passadas.length > 0 && (
              <section>
                <h2 className="text-foreground text-lg font-semibold tracking-tight mb-4">Histórico</h2>
                <div className="space-y-3">
                  {passadas.map((c) => (
                    <div key={c.id} className="bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-5 opacity-75 hover:opacity-100 transition-all" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"><CalendarDays className="h-5 w-5 text-muted-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-foreground font-semibold text-[15px]">{c.medico?.profile?.nome ?? "Médico"}</p>
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", statusStyles[c.status as Status])}>{c.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Stethoscope className="h-3.5 w-3.5" />{c.tipo}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"><Clock className="h-3.5 w-3.5" />{format(new Date(c.data_hora), "dd/MM/yyyy 'às' HH:mm")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
