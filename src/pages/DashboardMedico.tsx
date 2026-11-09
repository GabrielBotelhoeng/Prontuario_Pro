import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Check, ClipboardList, FileText, FolderOpen, PlayCircle, X } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { medicoNavItems as navItems } from "@/lib/nav";
import { useAuth } from "@/contexts/AuthContext";
import { useConsultasMedico, useUpdateConsultaStatus } from "@/hooks/useConsultas";
import { usePacientesDoMedico } from "@/hooks/usePacientes";
import { AmbientMedia } from "@/components/AmbientMedia";
import { StatusConsulta } from "@/components/clinico/StatusConsulta";
import { EstadoVazio } from "@/components/clinico/EstadoVazio";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Consulta } from "@/lib/database.types";
import consultorioImg from "@/assets/consultorio.webp";
import vazioAgenda from "@/assets/vazio/agenda.webp";

const ATALHOS = [
  { titulo: "Nova anamnese", descricao: "Registrar atendimento", url: "/medico/anamnese", icon: ClipboardList },
  { titulo: "Prescrever", descricao: "Receita digital com QR", url: "/medico/prescricao", icon: FileText },
  { titulo: "Documentos", descricao: "Exames dos pacientes", url: "/medico/documentos", icon: FolderOpen },
];

export default function DashboardMedico() {
  const { profile, medico } = useAuth();
  const navigate = useNavigate();
  const { data: consultas = [], isLoading } = useConsultasMedico();
  const { data: pacientes = [] } = usePacientesDoMedico();
  const atualizar = useUpdateConsultaStatus();

  const hoje = useMemo(
    () => consultas.filter((c) => isToday(new Date(c.data_hora)) && c.status !== "Cancelado"),
    [consultas],
  );
  const solicitacoes = useMemo(
    () => consultas.filter((c) => c.status === "Aguardando" && new Date(c.data_hora) > new Date()),
    [consultas],
  );
  const finalizadas = hoje.filter((c) => c.status === "Finalizado").length;
  // Próximo atendimento: em curso, ou confirmado que ainda não passou de 1h do horário.
  const limite = Date.now() - 60 * 60 * 1000;
  const proxima =
    hoje.find((c) => c.status === "Em andamento") ??
    hoje.find((c) => c.status === "Confirmado" && new Date(c.data_hora).getTime() >= limite);

  const primeiroNome = profile?.nome?.split(" ")[0] ?? "";
  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

  async function mudarStatus(c: Consulta, status: Consulta["status"], msg: string) {
    try {
      await atualizar.mutateAsync({ id: c.id, status });
      toast.success(msg);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function iniciar(c: Consulta) {
    try {
      if (c.status !== "Em andamento") await atualizar.mutateAsync({ id: c.id, status: "Em andamento" });
      navigate(`/medico/anamnese?consultaId=${c.id}&pacienteId=${c.paciente_id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const numeros: [string, number][] = [
    ["Consultas hoje", hoje.length],
    ["Finalizadas", finalizadas],
    ["A confirmar", solicitacoes.length],
    ["Pacientes na lista", pacientes.length],
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mx-auto max-w-6xl">
        {/* Abertura */}
        <section className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col justify-center p-8 lg:p-10">
            <p className="eyebrow mb-4">{medico?.especialidade ?? "Corpo clínico"}</p>
            <h1 className="font-display text-4xl leading-[1.02] text-foreground lg:text-5xl">
              {saudacao}, <em>{primeiroNome}</em>.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              {proxima ? (
                <>
                  Próximo atendimento às{" "}
                  <span className="font-mono text-foreground">{format(new Date(proxima.data_hora), "HH:mm")}</span> com{" "}
                  <span className="text-foreground">{proxima.paciente?.profile?.nome ?? "paciente"}</span>.
                </>
              ) : hoje.length > 0 ? (
                "Não há mais atendimentos confirmados para hoje."
              ) : (
                "Nenhuma consulta marcada para hoje."
              )}
            </p>
            {proxima && (
              <Button onClick={() => iniciar(proxima)} className="mt-6 w-fit gap-2">
                <PlayCircle className="h-4 w-4" />
                {proxima.status === "Em andamento" ? "Continuar atendimento" : "Iniciar atendimento"}
              </Button>
            )}
          </div>
          <AmbientMedia poster={consultorioImg} video="/media/dash-med.mp4" className="h-56 lg:h-auto" />
        </section>

        {/* Números do dia */}
        <dl className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
          {numeros.map(([rotulo, n]) => (
            <div key={rotulo} className="bg-background py-6 pr-4 [&:not(:first-child)]:pl-6">
              <dt className="eyebrow">{rotulo}</dt>
              <dd className="mt-2 font-mono text-3xl tabular-nums text-foreground">
                {isLoading ? <Skeleton className="h-8 w-10" /> : String(n).padStart(2, "0")}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Agenda de hoje */}
          <section aria-labelledby="hoje-titulo">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 id="hoje-titulo" className="font-display text-3xl text-foreground">
                Agenda de <em>hoje</em>
              </h2>
              <Link to="/medico/agenda" className="inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-4">
                Agenda completa <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : hoje.length === 0 ? (
              <div className="rounded-xl border border-border bg-card">
                <EstadoVazio
                  imagem={vazioAgenda}
                  titulo={<>Dia <em className="text-primary">livre</em> na agenda.</>}
                  acao={
                    <Button variant="outline" onClick={() => navigate("/medico/agenda")}>
                      Agendar consulta
                    </Button>
                  }
                >
                  As solicitações dos pacientes aparecem ao lado para você confirmar.
                </EstadoVazio>
              </div>
            ) : (
              <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {hoje.map((c) => {
                  const ativo = c.id === proxima?.id;
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4",
                        ativo && "bg-secondary/50",
                        c.status === "Finalizado" && "opacity-60",
                      )}
                    >
                      <time className="font-mono text-lg tabular-nums text-foreground">{format(new Date(c.data_hora), "HH:mm")}</time>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{c.paciente?.profile?.nome ?? "Paciente"}</p>
                        <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                          {c.tipo}
                          <StatusConsulta status={c.status} />
                        </p>
                      </div>
                      {c.status === "Aguardando" ? (
                        <Button size="sm" variant="outline" onClick={() => mudarStatus(c, "Confirmado", "Consulta confirmada")}>
                          Confirmar
                        </Button>
                      ) : c.status === "Confirmado" || c.status === "Em andamento" ? (
                        <Button size="sm" variant={ativo ? "default" : "ghost"} onClick={() => iniciar(c)}>
                          {c.status === "Em andamento" ? "Continuar" : "Iniciar"}
                        </Button>
                      ) : (
                        <span />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="space-y-10">
            {/* Solicitações */}
            <section aria-labelledby="solicitacoes-titulo">
              <h2 id="solicitacoes-titulo" className="eyebrow mb-4">
                Solicitações de pacientes
              </h2>
              {solicitacoes.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Nenhuma solicitação aguardando você.
                </p>
              ) : (
                <ul className="space-y-2">
                  {solicitacoes.slice(0, 5).map((c) => (
                    <li key={c.id} className="rounded-lg border border-border bg-card p-3.5">
                      <p className="truncate text-sm font-medium text-foreground">{c.paciente?.profile?.nome ?? "Paciente"}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {format(new Date(c.data_hora), "EEE dd/MM · HH:mm", { locale: ptBR })} · {c.tipo}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 flex-1 gap-1"
                          onClick={() => mudarStatus(c, "Confirmado", "Consulta confirmada — o paciente foi avisado")}
                        >
                          <Check className="h-3.5 w-3.5" /> Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-muted-foreground hover:text-destructive"
                          onClick={() => mudarStatus(c, "Cancelado", "Solicitação recusada — o paciente foi avisado")}
                        >
                          <X className="h-3.5 w-3.5" /> Recusar
                        </Button>
                      </div>
                    </li>
                  ))}
                  {solicitacoes.length > 5 && (
                    <li>
                      <Link to="/medico/agenda" className="text-sm text-primary hover:underline underline-offset-4">
                        + {solicitacoes.length - 5} na agenda
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </section>

            {/* Atalhos */}
            <nav aria-label="Atalhos">
              <h2 className="eyebrow mb-4">Atalhos</h2>
              <ul className="divide-y divide-border border-y border-border">
                {ATALHOS.map((a) => (
                  <li key={a.url}>
                    <Link to={a.url} className="group flex items-center gap-3 py-3.5">
                      <a.icon className="h-4 w-4 text-primary" />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-foreground">{a.titulo}</span>
                        <span className="block text-xs text-muted-foreground">{a.descricao}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
