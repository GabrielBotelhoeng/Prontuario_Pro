import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, isSunday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { pacienteNavItems as navItems } from "@/lib/nav";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCancelarConsultaPaciente,
  useConsultasPaciente,
  useHorariosOcupados,
  useSolicitarConsulta,
} from "@/hooks/useConsultas";
import { useTodosMedicos } from "@/hooks/usePacientes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusConsulta } from "@/components/clinico/StatusConsulta";
import { EstadoVazio } from "@/components/clinico/EstadoVazio";
import vazioAgenda from "@/assets/vazio/agenda.webp";

const TIPOS_CONSULTA = ["Consulta de rotina", "Retorno", "Primeira consulta"] as const;

/** Slots de 30 min, 08:00–17:30 (o banco recusa conflitos no mesmo intervalo). */
const HORARIOS = Array.from({ length: 20 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});

/** Próximos 14 dias úteis + sábado (sem domingos). */
function proximosDias() {
  const dias: Date[] = [];
  let d = startOfDay(new Date());
  while (dias.length < 14) {
    if (!isSunday(d)) dias.push(d);
    d = addDays(d, 1);
  }
  return dias;
}

export default function AgendaPaciente() {
  const { paciente } = useAuth();
  const { data: consultas = [], isLoading } = useConsultasPaciente();
  const { data: medicos = [] } = useTodosMedicos();
  const solicitar = useSolicitarConsulta();
  const cancelar = useCancelarConsultaPaciente();

  const dias = useMemo(proximosDias, []);
  const [medicoId, setMedicoId] = useState("");
  const [dia, setDia] = useState<Date>(dias[0]);
  const [horario, setHorario] = useState("");
  const [tipo, setTipo] = useState<string>(TIPOS_CONSULTA[0]);
  const [obs, setObs] = useState("");

  // Pré-seleciona o médico responsável, quando houver.
  useEffect(() => {
    if (!medicoId && paciente?.medico_principal_id) setMedicoId(paciente.medico_principal_id);
  }, [paciente?.medico_principal_id, medicoId]);

  const diaISO = format(dia, "yyyy-MM-dd");
  const { data: ocupados = [], isFetching: carregandoSlots } = useHorariosOcupados(medicoId, diaISO);

  const slots = useMemo(() => {
    const agora = new Date();
    return HORARIOS.map((h) => {
      const [hh, mm] = h.split(":").map(Number);
      const inicio = new Date(dia);
      inicio.setHours(hh, mm, 0, 0);
      const ocupado = ocupados.some((o) => Math.abs(o.getTime() - inicio.getTime()) < 30 * 60 * 1000);
      return { h, inicio, indisponivel: ocupado || inicio <= agora, ocupado };
    });
  }, [dia, ocupados]);

  // Horário escolhido deixa de valer se o dia/médico mudar ou ele for ocupado.
  useEffect(() => {
    if (horario && slots.find((s) => s.h === horario)?.indisponivel) setHorario("");
  }, [slots, horario]);

  const futuras = useMemo(
    () =>
      consultas
        .filter((c) => new Date(c.data_hora) >= new Date() && c.status !== "Cancelado" && c.status !== "Finalizado")
        .sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora)),
    [consultas],
  );
  const passadas = useMemo(
    () =>
      consultas
        .filter((c) => new Date(c.data_hora) < new Date() || c.status === "Finalizado" || c.status === "Cancelado")
        .sort((a, b) => +new Date(b.data_hora) - +new Date(a.data_hora))
        .slice(0, 10),
    [consultas],
  );

  async function handleSolicitar() {
    const slot = slots.find((s) => s.h === horario);
    if (!medicoId || !slot) return;
    try {
      await solicitar.mutateAsync({
        medico_id: medicoId,
        data_hora: slot.inicio.toISOString(),
        tipo,
        observacoes: obs.trim() || undefined,
      });
      toast.success("Solicitação enviada", { description: "Você será avisado quando o médico confirmar." });
      setHorario("");
      setObs("");
    } catch (err) {
      toast.error("Não foi possível solicitar", { description: (err as Error).message });
    }
  }

  async function handleCancelar(id: string) {
    try {
      await cancelar.mutateAsync(id);
      toast.success("Consulta cancelada. O médico foi avisado.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const medicoSel = medicos.find((m) => m.id === medicoId);

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-border pb-8">
          <p className="eyebrow mb-3">Agendamento</p>
          <h1 className="font-display text-5xl leading-none text-foreground">
            Marque sua <em>consulta</em>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
            Escolha o médico, o dia e um horário livre. A consulta fica confirmada depois que o médico aprovar.
          </p>
        </header>

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Solicitação */}
          <section aria-label="Solicitar consulta" className="space-y-8">
            <Passo n="01" titulo="Médico">
              <Select value={medicoId} onValueChange={setMedicoId}>
                <SelectTrigger className="h-11" aria-label="Médico">
                  <SelectValue placeholder="Escolha o médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      Dr(a). {m.profile?.nome ?? "—"} · {m.especialidade}
                      {m.id === paciente?.medico_principal_id ? " · seu médico" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Passo>

            <Passo n="02" titulo="Dia">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="radiogroup" aria-label="Dia">
                {dias.map((d) => {
                  const ativo = isSameDay(d, dia);
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => setDia(d)}
                      className={cn(
                        "flex w-16 flex-shrink-0 flex-col items-center rounded-lg border py-2.5 transition-colors",
                        ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30",
                      )}
                    >
                      <span className={cn("text-[11px] uppercase", ativo ? "opacity-80" : "text-muted-foreground")}>
                        {format(d, "EEE", { locale: ptBR }).replace(".", "")}
                      </span>
                      <span className="font-mono text-lg tabular-nums">{format(d, "dd")}</span>
                      <span className={cn("text-[10px]", ativo ? "opacity-70" : "text-muted-foreground")}>
                        {format(d, "MMM", { locale: ptBR }).replace(".", "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Passo>

            <Passo n="03" titulo="Horário">
              {!medicoId ? (
                <p className="text-sm text-muted-foreground">Escolha o médico para ver os horários livres.</p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6" role="radiogroup" aria-label="Horário">
                    {slots.map((s) => (
                      <button
                        key={s.h}
                        type="button"
                        role="radio"
                        aria-checked={horario === s.h}
                        disabled={s.indisponivel || carregandoSlots}
                        onClick={() => setHorario(s.h)}
                        title={s.ocupado ? "Horário ocupado" : undefined}
                        className={cn(
                          "rounded-md border py-2 font-mono text-sm tabular-nums transition-colors",
                          horario === s.h
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary/50",
                          "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted/50 disabled:text-muted-foreground/50",
                          s.ocupado && "disabled:line-through",
                        )}
                      >
                        {s.h}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {carregandoSlots ? "Atualizando horários…" : "Horários riscados já estão ocupados."}
                  </p>
                </>
              )}
            </Passo>

            <Passo n="04" titulo="Detalhes">
              <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger aria-label="Tipo de consulta">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONSULTA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Motivo da consulta (opcional)"
                  className="min-h-[44px] resize-y"
                  aria-label="Motivo da consulta"
                />
              </div>
            </Passo>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-secondary/60 px-5 py-4">
              <p className="text-sm text-foreground">
                {medicoSel && horario ? (
                  <>
                    <span className="font-mono">{format(dia, "dd/MM")} · {horario}</span> com Dr(a). {medicoSel.profile?.nome}
                  </>
                ) : (
                  <span className="text-muted-foreground">Escolha médico, dia e horário.</span>
                )}
              </p>
              <Button onClick={handleSolicitar} disabled={!medicoId || !horario || solicitar.isPending} className="gap-2">
                {solicitar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Solicitar consulta
              </Button>
            </div>
          </section>

          {/* Minhas consultas */}
          <aside className="space-y-10">
            <section aria-labelledby="proximas-titulo">
              <h2 id="proximas-titulo" className="eyebrow mb-4">
                Próximas consultas
              </h2>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : futuras.length === 0 ? (
                <div className="rounded-xl border border-border bg-card">
                  <EstadoVazio imagem={vazioAgenda} titulo="Nada marcado." className="!flex-col !py-6 !text-center sm:!text-center">
                    Sua próxima consulta aparece aqui.
                  </EstadoVazio>
                </div>
              ) : (
                <ul className="space-y-2">
                  {futuras.map((c) => (
                    <li key={c.id} className="rounded-lg border border-border bg-card p-4">
                      <p className="font-mono text-lg tabular-nums text-foreground">
                        {format(new Date(c.data_hora), "dd/MM · HH:mm")}
                      </p>
                      <p className="truncate text-sm text-foreground">Dr(a). {c.medico?.profile?.nome ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.tipo}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <StatusConsulta status={c.status} />
                        <button
                          onClick={() => handleCancelar(c.id)}
                          disabled={cancelar.isPending}
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {passadas.length > 0 && (
              <section aria-labelledby="passadas-titulo">
                <h2 id="passadas-titulo" className="eyebrow mb-4">
                  Histórico
                </h2>
                <ul className="divide-y divide-border border-y border-border">
                  {passadas.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {format(new Date(c.data_hora), "dd/MM/yyyy · HH:mm")}
                        </p>
                        <p className="truncate text-sm text-foreground">Dr(a). {c.medico?.profile?.nome ?? "—"}</p>
                      </div>
                      <StatusConsulta status={c.status} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Passo({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 md:grid-cols-[3rem_minmax(0,1fr)]">
      <span className="font-mono text-sm text-muted-foreground md:pt-0.5">{n}</span>
      <div>
        <h3 className="mb-3 text-lg font-medium text-foreground">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}
