import { useMemo, useState } from "react";
import {
  Home,
  FileText,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Sparkles,
  FolderOpen,
  Download,
  Eye,
  Search,
  FileQuestion,
  AlertCircle,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useDocumentosRecentesMedico,
  downloadDocumento,
  type DocumentoRecente,
} from "@/hooks/useDocumentos";
import {
  DOCUMENTO_CATEGORIA_LABEL,
  type DocumentoCategoria,
  type Documento,
} from "@/lib/database.types";
import { cn } from "@/lib/utils";

const navItems: NavItem[] = [
  { title: "Início", url: "/medico", icon: Home },
  { title: "Prescrição Digital", url: "/medico/prescricao", icon: FileText },
  { title: "Anamnese", url: "/medico/anamnese", icon: ClipboardList },
  { title: "Agenda", url: "/medico/agenda", icon: CalendarDays },
  { title: "Documentos", url: "/medico/documentos", icon: FolderOpen },
  { title: "Monitoramento", url: "/medico/monitoramento", icon: BarChart3 },
  { title: "Painel de IA", url: "/medico/painel-ia", icon: Sparkles },
];

const CATEGORIA_COR: Record<DocumentoCategoria, string> = {
  exame_laboratorial: "bg-blue-500/10 text-blue-700 border-blue-200",
  exame_imagem: "bg-violet-500/10 text-violet-700 border-violet-200",
  receita: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  atestado: "bg-amber-500/10 text-amber-700 border-amber-200",
  laudo: "bg-rose-500/10 text-rose-700 border-rose-200",
  outro: "bg-slate-500/10 text-slate-700 border-slate-200",
};

function tamanhoLegivel(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isNovo(createdAt: string): boolean {
  const horas = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return horas < 24;
}

export default function DocumentosPacientes() {
  const { data: documentos = [], isLoading, isError, error } = useDocumentosRecentesMedico();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<"todas" | DocumentoCategoria>("todas");
  const [baixando, setBaixando] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const buscaLow = busca.trim().toLowerCase();
    return documentos.filter((d) => {
      if (filtroCategoria !== "todas" && d.categoria !== filtroCategoria) return false;
      if (!buscaLow) return true;
      const nomePaciente = d.paciente?.profile?.nome?.toLowerCase() ?? "";
      const nomeDoc = d.nome.toLowerCase();
      return nomePaciente.includes(buscaLow) || nomeDoc.includes(buscaLow);
    });
  }, [documentos, busca, filtroCategoria]);

  const totalNovos = useMemo(
    () => documentos.filter((d) => isNovo(d.created_at)).length,
    [documentos],
  );

  async function handleBaixar(doc: DocumentoRecente) {
    try {
      setBaixando(doc.id);
      await downloadDocumento(doc as Documento);
    } catch (err: unknown) {
      toast({
        title: "Erro ao baixar",
        description: (err as Error).message ?? "Não foi possível abrir o arquivo.",
        variant: "destructive",
      });
    } finally {
      setBaixando(null);
    }
  }

  function handleVerProntuario(pacienteId: string | undefined) {
    if (!pacienteId) return;
    navigate(`/medico/anamnese?pacienteId=${pacienteId}`);
  }

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="h-5 w-5 text-primary" />
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                Documentos dos Pacientes
              </h1>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Exames, laudos e atestados que seus pacientes enviaram pelo Prontuário-Pro.
            </p>
          </div>
          {totalNovos > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {totalNovos} {totalNovos === 1 ? "novo" : "novos"} nas últimas 24h
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome do paciente ou do documento..."
              className="h-11 pl-10 rounded-xl"
            />
          </div>
          <Select
            value={filtroCategoria}
            onValueChange={(v) => setFiltroCategoria(v as typeof filtroCategoria)}
          >
            <SelectTrigger className="h-11 sm:w-[220px] rounded-xl gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="todas">Todas categorias</SelectItem>
              {(Object.keys(DOCUMENTO_CATEGORIA_LABEL) as DocumentoCategoria[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {DOCUMENTO_CATEGORIA_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Não foi possível carregar os documentos</p>
              <p className="text-xs text-destructive/80 mt-1">{(error as Error)?.message ?? "Tente novamente em instantes."}</p>
            </div>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <FileQuestion className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {documentos.length === 0
                ? "Nenhum paciente enviou documentos ainda"
                : "Nenhum resultado para esses filtros"}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {documentos.length === 0
                ? "Quando um paciente seu enviar um exame, laudo ou receita pelo Meu Prontuário, ele aparece aqui — e você é notificado no sininho."
                : "Tente ajustar a busca ou trocar a categoria selecionada."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtrados.map((d) => {
              const novo = isNovo(d.created_at);
              const categoriaLabel = d.categoria ? DOCUMENTO_CATEGORIA_LABEL[d.categoria] : "Documento";
              const categoriaClasse = d.categoria
                ? CATEGORIA_COR[d.categoria]
                : "bg-slate-500/10 text-slate-700 border-slate-200";
              return (
                <li
                  key={d.id}
                  className={cn(
                    "bg-card border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all",
                    novo ? "border-primary/30 shadow-[0_0_0_3px_hsl(var(--primary)/0.06)]" : "border-border",
                  )}
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border",
                      categoriaClasse,
                    )}
                  >
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {d.nome}
                      </p>
                      {novo && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Novo
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          categoriaClasse,
                        )}
                      >
                        {categoriaLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Enviado por{" "}
                      <span className="font-medium text-foreground/90">
                        {d.paciente?.profile?.nome ?? "Paciente"}
                      </span>
                      {" · "}
                      {formatDistanceToNow(new Date(d.created_at), { locale: ptBR, addSuffix: true })}
                      {d.data_exame && (
                        <>
                          {" · "}exame de {format(new Date(d.data_exame), "dd/MM/yyyy", { locale: ptBR })}
                        </>
                      )}
                      {" · "}
                      {(d.tipo_arquivo ?? "").toUpperCase()} · {tamanhoLegivel(d.tamanho_bytes)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5"
                      onClick={() => handleVerProntuario(d.paciente?.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Prontuário
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl gap-1.5"
                      disabled={baixando === d.id}
                      onClick={() => handleBaixar(d)}
                    >
                      {baixando === d.id ? (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Baixar
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
