import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CalendarPlus, FileText, FolderHeart } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { pacienteNavItems as navItems } from "@/lib/nav";
import MedicoResponsavelBanner from "@/components/MedicoResponsavelBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useCancelarConsultaPaciente, useConsultasPaciente, useProximaConsultaPaciente } from "@/hooks/useConsultas";
import { usePrescricoesPaciente } from "@/hooks/usePrescricoes";
import { AmbientMedia } from "@/components/AmbientMedia";
import { StatusConsulta } from "@/components/clinico/StatusConsulta";
import { Button } from "@/components/ui/button";
import salaEsperaImg from "@/assets/sala-espera.webp";

export default function DashboardPaciente() {
  const { profile } = useAuth();
  const { data: consultas = [] } = useConsultasPaciente();
  const { data: proxima } = useProximaConsultaPaciente();
  const { data: prescricoes = [] } = usePrescricoesPaciente();
  const cancelar = useCancelarConsultaPaciente();

  const primeiroNome = profile?.nome?.split(" ")[0] ?? "";
  const ultimaReceita = prescricoes[0];

  // Linha do tempo: consultas passadas e receitas, mais recentes primeiro.
  const historico = useMemo(() => {
    const itens = [
      ...consultas
        .filter((c) => c.status === "Finalizado")
        .map((c) => ({
          data: new Date(c.data_hora),
          texto: `Consulta com Dr(a). ${c.medico?.profile?.nome ?? "—"}`,
          detalhe: c.medico?.especialidade ?? c.tipo,
        })),
      ...prescricoes.map((p) => ({
        data: new Date(p.data_emissao),
        texto: "Receita emitida",
        detalhe: `${(p.medicamentos as unknown[])?.length ?? 0} medicamento(s)`,
      })),
    ];
    return itens.sort((a, b) => b.data.getTime() - a.data.getTime()).slice(0, 5);
  }, [consultas, prescricoes]);

  const medicos = useMemo(
    () => [...new Map(consultas.filter((c) => c.medico).map((c) => [c.medico_id, c.medico!])).values()].slice(0, 4),
    [consultas],
  );

  async function handleCancelar(id: string) {
    try {
      await cancelar.mutateAsync(id);
      toast.success("Consulta cancelada. O médico foi avisado.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mx-auto max-w-6xl space-y-8">
        <MedicoResponsavelBanner />

        {/* Abertura */}
        <section className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col justify-center p-8 lg:p-10">
            <p className="eyebrow mb-4">Seu painel de saúde</p>
            <h1 className="font-display text-4xl leading-[1.02] text-foreground lg:text-5xl">
              Olá, <em>{primeiroNome}</em>.
            </h1>

            {proxima ? (
              <div className="mt-6 border-l-2 border-primary pl-4">
                <p className="eyebrow !text-[10px]">
                  Próxima consulta · {formatDistanceToNowStrict(new Date(proxima.data_hora), { locale: ptBR, addSuffix: true })}
                </p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-foreground">
                  {format(new Date(proxima.data_hora), "dd/MM · HH:mm")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Dr(a). {proxima.medico?.profile?.nome ?? "—"} · {proxima.medico?.especialidade}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <StatusConsulta status={proxima.status} />
                  <button
                    onClick={() => handleCancelar(proxima.id)}
                    disabled={cancelar.isPending}
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
                  >
                    Cancelar consulta
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Você não tem consultas marcadas.
              </p>
            )}

            <Button asChild variant={proxima ? "outline" : "default"} className="mt-6 w-fit gap-2">
              <Link to="/paciente/agendamento">
                <CalendarPlus className="h-4 w-4" /> Agendar consulta
              </Link>
            </Button>
          </div>
          <AmbientMedia poster={salaEsperaImg} video="/media/dash-pac.mp4" className="h-56 lg:h-auto" />
        </section>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Histórico */}
          <section aria-labelledby="historico-titulo">
            <h2 id="historico-titulo" className="mb-4 font-display text-3xl text-foreground">
              Seu <em>histórico</em>
            </h2>
            {historico.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                Suas consultas finalizadas e receitas aparecem aqui.
              </p>
            ) : (
              <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {historico.map((h, i) => (
                  <li key={i} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 px-5 py-4">
                    <time className="font-mono text-sm tabular-nums text-muted-foreground">
                      {format(h.data, "dd MMM yy", { locale: ptBR })}
                    </time>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{h.texto}</p>
                      <p className="truncate text-xs text-muted-foreground">{h.detalhe}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div className="space-y-10">
            {/* Atalhos */}
            <nav aria-label="Atalhos">
              <h2 className="eyebrow mb-4">Acesso rápido</h2>
              <ul className="divide-y divide-border border-y border-border">
                <AtalhoItem
                  to="/paciente/receitas"
                  icon={FileText}
                  titulo="Minhas receitas"
                  descricao={
                    ultimaReceita
                      ? `Última em ${format(new Date(ultimaReceita.data_emissao), "dd/MM/yyyy")}`
                      : "Nenhuma receita ainda"
                  }
                />
                <AtalhoItem to="/paciente/prontuario" icon={FolderHeart} titulo="Meu prontuário" descricao="Exames, anamneses e documentos" />
              </ul>
            </nav>

            {/* Médicos */}
            {medicos.length > 0 && (
              <section aria-labelledby="medicos-titulo">
                <h2 id="medicos-titulo" className="eyebrow mb-4">
                  Quem cuida de você
                </h2>
                <ul className="space-y-3">
                  {medicos.map((m) => (
                    <li key={m.crm} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-secondary-foreground">
                        {m.profile?.nome
                          ?.split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("") ?? "—"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">Dr(a). {m.profile?.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.especialidade}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function AtalhoItem({
  to,
  icon: Icon,
  titulo,
  descricao,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
}) {
  return (
    <li>
      <Link to={to} className="group flex items-center gap-3 py-3.5">
        <Icon className="h-4 w-4 text-primary" />
        <span className="flex-1">
          <span className="block text-sm font-medium text-foreground">{titulo}</span>
          <span className="block text-xs text-muted-foreground">{descricao}</span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>
    </li>
  );
}
