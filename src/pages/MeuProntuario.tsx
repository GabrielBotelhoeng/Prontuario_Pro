import { useState, useRef } from "react";
import { Home, FileText, FolderHeart, CalendarDays, ClipboardList, Activity, Stethoscope, Paperclip, Download, Trash2, Upload } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useAnamnesesPaciente } from "@/hooks/useAnamneses";
import { usePrescricoesPaciente } from "@/hooks/usePrescricoes";
import { useDocumentosPaciente, useUploadDocumento, useDeleteDocumento, downloadDocumento, validarArquivo } from "@/hooks/useDocumentos";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

export default function MeuProntuario() {
  const { profile, paciente, user } = useAuth();
  const { data: anamneses = [], isLoading: loadingA } = useAnamnesesPaciente();
  const { data: prescricoes = [], isLoading: loadingP } = usePrescricoesPaciente();
  const { data: documentos = [], isLoading: loadingD } = useDocumentosPaciente();
  const uploadDocumento = useUploadDocumento();
  const deleteDocumento = useDeleteDocumento();
  const { toast } = useToast();

  const [nomeDoc, setNomeDoc] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = loadingA || loadingP || loadingD;

  async function handleUpload() {
    if (!nomeDoc.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe um nome para o documento.", variant: "destructive" });
      return;
    }
    if (!arquivoSelecionado) {
      toast({ title: "Arquivo obrigatório", description: "Selecione um arquivo para enviar.", variant: "destructive" });
      return;
    }
    const erro = validarArquivo(arquivoSelecionado);
    if (erro) {
      toast({ title: "Arquivo inválido", description: erro, variant: "destructive" });
      return;
    }
    try {
      await uploadDocumento.mutateAsync({ pacienteId: user!.id, arquivo: arquivoSelecionado, nome: nomeDoc.trim() });
      toast({ title: "Documento enviado", description: `"${nomeDoc}" foi salvo com sucesso.` });
      setNomeDoc("");
      setArquivoSelecionado(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast({ title: "Erro ao enviar", description: "Não foi possível enviar o documento. Tente novamente.", variant: "destructive" });
    }
  }

  async function handleDelete(doc: typeof documentos[number]) {
    try {
      await deleteDocumento.mutateAsync(doc);
      toast({ title: "Documento excluído" });
    } catch {
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir o documento.", variant: "destructive" });
    }
  }

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Saúde</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Prontuário</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico completo de saúde e atendimentos</p>
        </div>

        {/* Dados básicos */}
        <div className="bg-card border border-border/40 rounded-2xl p-6" style={{ boxShadow: "0 2px 24px -6px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Activity className="h-4 w-4 text-primary" /></div>
            <h2 className="text-base font-semibold text-foreground">Dados do Paciente</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Nome", value: profile?.nome ?? "—" },
              { label: "CPF", value: paciente?.cpf ?? "—" },
              { label: "Tipo Sanguíneo", value: paciente?.tipo_sanguineo ?? "Não informado" },
              { label: "Alergias", value: paciente?.alergias?.join(", ") || "Nenhuma informada" },
            ].map((item) => (
              <div key={item.label} className="px-3 py-2 rounded-xl bg-muted/40 border border-border/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">{item.label}</p>
                <p className="text-sm font-semibold text-foreground truncate leading-tight mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : (
          <>
            {/* Anamneses */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><ClipboardList className="h-4 w-4 text-primary" /></div>
                <h2 className="text-lg font-semibold text-foreground">Histórico de Consultas</h2>
              </div>
              {anamneses.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum histórico de consulta disponível</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {anamneses.map((a) => (
                    <div key={a.id} className="bg-card border border-border/40 rounded-2xl p-5" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          <p className="text-[15px] font-semibold text-foreground">Consulta em {format(new Date(a.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        </div>
                      </div>
                      {a.queixa_principal && (
                        <div className="mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Queixa Principal</p>
                          <p className="text-sm text-foreground">{a.queixa_principal}</p>
                        </div>
                      )}
                      {a.hipotese_diagnostica && (
                        <div className="mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Diagnóstico</p>
                          <p className="text-sm text-foreground">{a.hipotese_diagnostica}</p>
                        </div>
                      )}
                      {a.conduta && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Conduta</p>
                          <p className="text-sm text-foreground">{a.conduta}</p>
                        </div>
                      )}
                      {a.sinais_vitais && Object.keys(a.sinais_vitais).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Object.entries(a.sinais_vitais).filter(([, v]) => v).map(([k, v]) => (
                            <div key={k} className="text-center px-2 py-1.5 rounded-lg bg-muted/40">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</p>
                              <p className="text-sm font-semibold text-foreground">{v as string}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Exames e Documentos */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Paperclip className="h-4 w-4 text-primary" /></div>
                <h2 className="text-lg font-semibold text-foreground">Exames e Documentos</h2>
              </div>

              {/* Formulário de upload */}
              <div className="bg-card border border-border/40 rounded-2xl p-5 mb-4" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Enviar novo documento</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Nome do documento (ex: Hemograma - Jan/2026)"
                    value={nomeDoc}
                    onChange={(e) => setNomeDoc(e.target.value)}
                    className="flex-1"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setArquivoSelecionado(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {arquivoSelecionado ? arquivoSelecionado.name.slice(0, 20) + (arquivoSelecionado.name.length > 20 ? "…" : "") : "Selecionar arquivo"}
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadDocumento.isPending}
                    className="shrink-0"
                  >
                    {uploadDocumento.isPending ? "Enviando…" : "Enviar"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">PDF, JPG ou PNG · máximo 20 MB</p>
              </div>

              {/* Lista de documentos */}
              {documentos.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div key={doc.id} className="bg-card border border-border/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-3" style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Paperclip className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{doc.nome}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {doc.tipo_arquivo.toUpperCase()} · {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            {doc.tamanho_bytes ? ` · ${(doc.tamanho_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => downloadDocumento(doc).catch(() => toast({ title: "Erro ao baixar", variant: "destructive" }))}
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {doc.uploaded_by === user?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(doc)}
                            disabled={deleteDocumento.isPending}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
