import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { differenceInYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Loader2, Plus, Search, UserPlus, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { medicoNavItems as navItems } from "@/lib/nav";
import { useSalvarAnamnese } from "@/hooks/useAnamneses";
import { usePacientesDoMedico, useVincularPaciente } from "@/hooks/usePacientes";
import { useConsultasMedico, useUpdateConsultaStatus } from "@/hooks/useConsultas";
import { logAuditEvent } from "@/hooks/useAuditLogs";
import { useToast } from "@/hooks/use-toast";
import { buscarCid } from "@/lib/cid10";
import { maskCPF } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EstadoVazio } from "@/components/clinico/EstadoVazio";
import { HistoricoPaciente } from "@/components/clinico/HistoricoPaciente";
import { DocumentosPacientePanel } from "@/components/clinico/DocumentosPacientePanel";
import vazioAnamnese from "@/assets/vazio/anamnese.webp";

const PATOLOGIAS = [
  "Hipertensão",
  "Diabetes",
  "Dislipidemia",
  "Asma",
  "DPOC",
  "Cardiopatia",
  "Doença renal",
  "Tireoide",
  "Depressão",
  "Ansiedade",
  "Obesidade",
  "Tabagismo",
];

interface Vitais {
  pressao: string;
  fc: string;
  fr: string;
  temp: string;
  spo2: string;
  peso: string;
  altura: string;
}

const SINAIS: { chave: keyof Vitais; rotulo: string; unidade: string; placeholder: string }[] = [
  { chave: "pressao", rotulo: "PA", unidade: "mmHg", placeholder: "120/80" },
  { chave: "fc", rotulo: "FC", unidade: "bpm", placeholder: "72" },
  { chave: "fr", rotulo: "FR", unidade: "irpm", placeholder: "16" },
  { chave: "temp", rotulo: "Temp.", unidade: "°C", placeholder: "36,5" },
  { chave: "spo2", rotulo: "SpO₂", unidade: "%", placeholder: "98" },
  { chave: "peso", rotulo: "Peso", unidade: "kg", placeholder: "70" },
  { chave: "altura", rotulo: "Altura", unidade: "cm", placeholder: "170" },
];

interface Formulario {
  queixa_principal: string;
  historia_doenca: string;
  antecedentes_pessoais: string;
  antecedentes_familiares: string;
  medicamentos_uso: string;
  alergias: string;
  exame_fisico: string;
  hipotese_diagnostica: string;
  conduta: string;
}

const FORM_VAZIO: Formulario = {
  queixa_principal: "",
  historia_doenca: "",
  antecedentes_pessoais: "",
  antecedentes_familiares: "",
  medicamentos_uso: "",
  alergias: "",
  exame_fisico: "",
  hipotese_diagnostica: "",
  conduta: "",
};

const VITAIS_VAZIO: Vitais = { pressao: "", fc: "", fr: "", temp: "", spo2: "", peso: "", altura: "" };

const textareaClass = "min-h-[92px] resize-y bg-background text-[15px] leading-relaxed";

export default function Anamnese() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: pacientes = [], isLoading: carregandoPacientes } = usePacientesDoMedico();
  const { data: consultas = [] } = useConsultasMedico();
  const vincular = useVincularPaciente();
  const salvar = useSalvarAnamnese();
  const atualizarConsulta = useUpdateConsultaStatus();

  const consultaId = searchParams.get("consultaId");
  const consulta = useMemo(() => consultas.find((c) => c.id === consultaId) ?? null, [consultas, consultaId]);

  const [pacienteId, setPacienteId] = useState(searchParams.get("pacienteId") ?? "");
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);
  const [vitais, setVitais] = useState<Vitais>(VITAIS_VAZIO);
  const [patologias, setPatologias] = useState<string[]>([]);
  const [cidBusca, setCidBusca] = useState("");
  const [cpf, setCpf] = useState("");
  const [mostrarVincular, setMostrarVincular] = useState(false);
  const [salvando, setSalvando] = useState<"" | "salvar" | "finalizar">("");

  const paciente = pacientes.find((p) => p.id === pacienteId);
  const cids = useMemo(() => buscarCid(cidBusca), [cidBusca]);

  // Chegada pela agenda: o paciente vem na URL.
  useEffect(() => {
    const p = searchParams.get("pacienteId");
    if (p) setPacienteId(p);
  }, [searchParams]);

  // Trocar de paciente limpa o formulário e registra o acesso ao prontuário (LGPD).
  const ultimoLog = useRef<string | null>(null);
  useEffect(() => {
    setForm(FORM_VAZIO);
    setVitais(VITAIS_VAZIO);
    setPatologias([]);
    setCidBusca("");
    if (pacienteId && ultimoLog.current !== pacienteId) {
      ultimoLog.current = pacienteId;
      logAuditEvent({ action: "prontuario_visualizado", resourceType: "paciente", resourceId: pacienteId, targetUserId: pacienteId });
    }
  }, [pacienteId]);

  const set = (campo: keyof Formulario) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  function adicionarCid(codigo: string, descricao: string) {
    setForm((f) => ({
      ...f,
      hipotese_diagnostica: [f.hipotese_diagnostica.trim(), `${codigo} — ${descricao}`].filter(Boolean).join("\n"),
    }));
    setCidBusca("");
  }

  async function handleVincular() {
    const digitos = cpf.replace(/\D/g, "");
    if (digitos.length !== 11) {
      toast({ title: "CPF incompleto", description: "Informe os 11 dígitos do CPF.", variant: "destructive" });
      return;
    }
    try {
      const p = await vincular.mutateAsync(digitos);
      setPacienteId(p.id);
      setCpf("");
      setMostrarVincular(false);
      toast({ title: `${p.nome} agora está na sua lista` });
    } catch (err) {
      toast({ title: "Não foi possível vincular", description: (err as Error).message, variant: "destructive" });
    }
  }

  function sairDaConsulta() {
    searchParams.delete("consultaId");
    searchParams.delete("pacienteId");
    setSearchParams(searchParams);
  }

  async function handleSalvar(finalizar: boolean) {
    if (!pacienteId) return;
    if (!form.queixa_principal.trim()) {
      toast({ title: "Informe a queixa principal", variant: "destructive" });
      document.getElementById("queixa_principal")?.focus();
      return;
    }
    setSalvando(finalizar ? "finalizar" : "salvar");
    try {
      const sinais = Object.fromEntries(Object.entries(vitais).filter(([, v]) => v.trim()));
      await salvar.mutateAsync({
        paciente_id: pacienteId,
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined])),
        sinais_vitais: sinais,
        patologias,
        consulta_id: consulta?.id,
      });

      if (finalizar && consulta) {
        await atualizarConsulta.mutateAsync({ id: consulta.id, status: "Finalizado" });
        toast({ title: "Atendimento finalizado", description: "A anamnese foi registrada no prontuário." });
        navigate("/medico/agenda");
        return;
      }
      toast({ title: "Anamnese registrada no prontuário" });
      setForm(FORM_VAZIO);
      setVitais(VITAIS_VAZIO);
      setPatologias([]);
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSalvando("");
    }
  }

  const idade = paciente?.data_nascimento ? differenceInYears(new Date(), new Date(paciente.data_nascimento)) : null;
  const emAtendimento = consulta?.status === "Em andamento";

  return (
    <DashboardLayout navItems={navItems}>
      <div className="mx-auto max-w-7xl">
        {/* Cabeçalho */}
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
          <div>
            <p className="eyebrow mb-3">{consulta ? "Atendimento em curso" : "Prontuário"}</p>
            <h1 className="font-display text-5xl leading-none text-foreground">
              Anamnese{paciente && <span className="text-muted-foreground"> · </span>}
              {paciente && <em>{paciente.nome.split(" ")[0]}</em>}
            </h1>
            {consulta && (
              <p className="mt-3 text-[15px] text-muted-foreground">
                Consulta de{" "}
                <span className="font-mono text-foreground">{format(new Date(consulta.data_hora), "dd/MM · HH:mm")}</span> ·{" "}
                {consulta.tipo}
                <button onClick={sairDaConsulta} className="ml-3 text-xs text-primary hover:underline underline-offset-4">
                  desvincular desta consulta
                </button>
              </p>
            )}
          </div>

          {!consulta && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Select value={pacienteId} onValueChange={setPacienteId}>
                <SelectTrigger className="h-11 sm:w-80" aria-label="Paciente">
                  <SelectValue placeholder={carregandoPacientes ? "Carregando pacientes…" : "Escolha o paciente"} />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} <span className="font-mono text-muted-foreground">· {maskCPF(p.cpf)}</span>
                    </SelectItem>
                  ))}
                  {pacientes.length === 0 && (
                    <SelectItem value="_vazio" disabled>
                      Nenhum paciente na sua lista
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-11 gap-2" onClick={() => setMostrarVincular((v) => !v)}>
                <UserPlus className="h-4 w-4" /> Buscar por CPF
              </Button>
            </div>
          )}
        </header>

        {mostrarVincular && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-muted-foreground">
              Paciente ainda não está na sua lista? Informe o CPF para assumir o acompanhamento.
            </p>
            <Input
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="font-mono sm:w-48"
              aria-label="CPF do paciente"
            />
            <Button onClick={handleVincular} disabled={vincular.isPending}>
              {vincular.isPending ? "Buscando…" : "Adicionar"}
            </Button>
          </div>
        )}

        {!paciente ? (
          <div className="mt-10 rounded-xl border border-border bg-card">
            <EstadoVazio
              imagem={vazioAnamnese}
              titulo={
                <>
                  Escolha um <em className="text-primary">paciente</em> para começar.
                </>
              }
            >
              Selecione na lista acima ou inicie o atendimento pela agenda — assim a anamnese fica ligada à consulta.
            </EstadoVazio>
          </div>
        ) : (
          <>
            {/* Identificação */}
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg bg-secondary/60 px-5 py-3.5 text-sm">
              <span className="font-medium text-foreground">{paciente.nome}</span>
              <span className="font-mono text-muted-foreground">CPF {maskCPF(paciente.cpf)}</span>
              {idade !== null && <span className="font-mono text-muted-foreground">{idade} anos</span>}
              {paciente.ultima_consulta && (
                <span className="text-muted-foreground">
                  Última consulta {format(new Date(paciente.ultima_consulta), "dd MMM yyyy", { locale: ptBR })}
                </span>
              )}
            </div>

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
              {/* Roteiro clínico */}
              <form
                className="space-y-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSalvar(emAtendimento);
                }}
              >
                <Secao n="01" titulo="Queixa principal" obrigatorio>
                  <Textarea
                    id="queixa_principal"
                    value={form.queixa_principal}
                    onChange={set("queixa_principal")}
                    placeholder="Nas palavras do paciente — ex.: “dor de cabeça há 5 dias”"
                    className={cn(textareaClass, "min-h-[72px]")}
                  />
                </Secao>

                <Secao n="02" titulo="História da doença atual">
                  <Textarea
                    value={form.historia_doenca}
                    onChange={set("historia_doenca")}
                    placeholder="Início, duração, localização, intensidade, fatores de melhora e piora, sintomas associados…"
                    className={cn(textareaClass, "min-h-[130px]")}
                  />
                </Secao>

                <Secao n="03" titulo="Antecedentes">
                  <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Condições preexistentes">
                    {PATOLOGIAS.map((p) => {
                      const ativo = patologias.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={ativo}
                          onClick={() => setPatologias((l) => (ativo ? l.filter((x) => x !== p) : [...l, p]))}
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm transition-colors",
                            ativo
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Campo rotulo="Pessoais">
                      <Textarea
                        value={form.antecedentes_pessoais}
                        onChange={set("antecedentes_pessoais")}
                        placeholder="Cirurgias, internações, hábitos…"
                        className={textareaClass}
                      />
                    </Campo>
                    <Campo rotulo="Familiares">
                      <Textarea
                        value={form.antecedentes_familiares}
                        onChange={set("antecedentes_familiares")}
                        placeholder="Doenças em pais, irmãos…"
                        className={textareaClass}
                      />
                    </Campo>
                  </div>
                </Secao>

                <Secao n="04" titulo="Medicamentos e alergias">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Campo rotulo="Em uso">
                      <Textarea
                        value={form.medicamentos_uso}
                        onChange={set("medicamentos_uso")}
                        placeholder="Nome, dose e posologia"
                        className={textareaClass}
                      />
                    </Campo>
                    <Campo rotulo="Alergias" destaque>
                      <Textarea
                        value={form.alergias}
                        onChange={set("alergias")}
                        placeholder="Medicamentos, alimentos… ou “nega alergias”"
                        className={textareaClass}
                      />
                    </Campo>
                  </div>
                </Secao>

                <Secao n="05" titulo="Exame físico">
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                    {SINAIS.map((s) => (
                      <label key={s.chave} className="block">
                        <span className="eyebrow !text-[10px]">{s.rotulo}</span>
                        <div className="relative mt-1">
                          <Input
                            value={vitais[s.chave]}
                            onChange={(e) => setVitais((v) => ({ ...v, [s.chave]: e.target.value }))}
                            placeholder={s.placeholder}
                            inputMode="decimal"
                            className="pr-11 font-mono"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            {s.unidade}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <Textarea
                    value={form.exame_fisico}
                    onChange={set("exame_fisico")}
                    placeholder="Estado geral, aparelhos e sistemas examinados…"
                    className={textareaClass}
                  />
                </Secao>

                <Secao n="06" titulo="Hipótese diagnóstica">
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={cidBusca}
                      onChange={(e) => setCidBusca(e.target.value)}
                      placeholder="Buscar CID-10 por código ou nome (ex.: I10, lombar)"
                      className="pl-9"
                      aria-label="Buscar CID-10"
                    />
                    {cids.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                        {cids.map((c) => (
                          <li key={c.codigo}>
                            <button
                              type="button"
                              onClick={() => adicionarCid(c.codigo, c.descricao)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                            >
                              <span className="w-14 font-mono text-xs font-medium text-primary">{c.codigo}</span>
                              <span className="flex-1 text-foreground">{c.descricao}</span>
                              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Textarea
                    value={form.hipotese_diagnostica}
                    onChange={set("hipotese_diagnostica")}
                    placeholder="Hipóteses e diagnósticos diferenciais"
                    className={textareaClass}
                  />
                </Secao>

                <Secao n="07" titulo="Conduta">
                  <Textarea
                    value={form.conduta}
                    onChange={set("conduta")}
                    placeholder="Orientações, exames solicitados, encaminhamentos, retorno…"
                    className={textareaClass}
                  />
                </Secao>

                {/* Ações */}
                <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-background/90 px-4 py-4 backdrop-blur lg:-mx-8 lg:px-8">
                  <p className="mr-auto hidden text-xs text-muted-foreground md:block">
                    O registro fica no prontuário e pode ser corrigido pelo autor por 24 horas.
                  </p>
                  {emAtendimento ? (
                    <>
                      <Button type="button" variant="ghost" disabled={!!salvando} onClick={() => handleSalvar(false)}>
                        {salvando === "salvar" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar sem finalizar
                      </Button>
                      <Button type="submit" disabled={!!salvando} className="gap-2">
                        {salvando === "finalizar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Salvar e finalizar atendimento
                      </Button>
                    </>
                  ) : (
                    <Button type="submit" disabled={!!salvando} className="gap-2">
                      {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Registrar anamnese
                    </Button>
                  )}
                </div>
              </form>

              <aside className="lg:sticky lg:top-24 lg:self-start">
                <HistoricoPaciente pacienteId={paciente.id} />
                {consulta && !emAtendimento && consulta.status !== "Finalizado" && (
                  <p className="mt-6 flex items-start gap-2 rounded-lg border border-border p-3 text-xs text-muted-foreground">
                    <X className="mt-0.5 h-3.5 w-3.5" /> Esta consulta não está em atendimento. Inicie-a pela agenda para
                    poder finalizá-la daqui.
                  </p>
                )}
              </aside>
            </div>

            <div className="mt-12">
              <DocumentosPacientePanel pacienteId={paciente.id} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Secao({ n, titulo, obrigatorio, children }: { n: string; titulo: string; obrigatorio?: boolean; children: ReactNode }) {
  return (
    <section className="grid gap-4 md:grid-cols-[3rem_minmax(0,1fr)]">
      <span className="font-mono text-sm text-muted-foreground md:pt-1">{n}</span>
      <div>
        <h2 className="mb-3 text-lg font-medium text-foreground">
          {titulo}
          {obrigatorio && <span className="ml-1 text-destructive" aria-label="obrigatório">*</span>}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Campo({ rotulo, destaque, children }: { rotulo: string; destaque?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className={cn("eyebrow mb-1.5 block !text-[10px]", destaque && "!text-destructive")}>{rotulo}</span>
      {children}
    </label>
  );
}
