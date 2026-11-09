import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { useAnamnesesDoPaciente } from "@/hooks/useAnamneses";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

/** Linha do tempo das anamneses do paciente (todas as que o médico pode ver). */
export function HistoricoPaciente({ pacienteId }: { pacienteId: string }) {
  const { user } = useAuth();
  const { data: anamneses = [], isLoading } = useAnamnesesDoPaciente(pacienteId);

  // Alergias registradas em qualquer atendimento: informação crítica no topo.
  const alergias = useMemo(() => {
    const vistas = new Set<string>();
    anamneses.forEach((a) => {
      a.alergias
        ?.split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s && !/^(nega|nenhuma|sem alergias?)/i.test(s))
        .forEach((s) => vistas.add(s));
    });
    return [...vistas];
  }, [anamneses]);

  return (
    <section aria-labelledby="historico-titulo">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="historico-titulo" className="eyebrow">Histórico no hospital</h2>
        {!isLoading && <span className="font-mono text-xs text-muted-foreground">{anamneses.length} registro(s)</span>}
      </div>

      {alergias.length > 0 && (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5" role="note">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> Alergias registradas
          </p>
          <p className="mt-1 text-sm text-foreground">{alergias.join(" · ")}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : anamneses.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Primeiro atendimento registrado deste paciente.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-5">
          {anamneses.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[25px] top-4 h-2 w-2 rounded-full bg-primary ring-4 ring-background" />
              <details className="group rounded-lg border border-border bg-card open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {format(new Date(a.created_at), "dd MMM yyyy · HH:mm", { locale: ptBR })}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                      {a.queixa_principal || "Sem queixa registrada"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.medico_id === user?.id ? "Você" : `Dr(a). ${a.medico?.profile?.nome ?? "—"}`}
                      {a.medico?.especialidade ? ` · ${a.medico.especialidade}` : ""}
                    </p>
                  </div>
                  <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <dl className="space-y-2.5 border-t border-border px-3.5 py-3 text-sm">
                  {(
                    [
                      ["HDA", a.historia_doenca],
                      ["Medicamentos", a.medicamentos_uso],
                      ["Exame físico", a.exame_fisico],
                      ["Hipótese", a.hipotese_diagnostica],
                      ["Conduta", a.conduta],
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="eyebrow !text-[10px]">{k}</dt>
                        <dd className="mt-0.5 whitespace-pre-line text-foreground/90">{v}</dd>
                      </div>
                    ))}
                  {a.sinais_vitais && Object.values(a.sinais_vitais).some(Boolean) && (
                    <div>
                      <dt className="eyebrow !text-[10px]">Sinais vitais</dt>
                      <dd className="mt-0.5 font-mono text-xs text-foreground/90">
                        {Object.entries(a.sinais_vitais)
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${k.toUpperCase()} ${v}`)
                          .join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
