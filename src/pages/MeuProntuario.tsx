import { useState, useRef, useEffect } from "react";
import { Home, FileText, FolderHeart, CalendarDays, ClipboardList, Activity, Stethoscope, Paperclip, Download, Trash2, Upload, Pencil, X as XIcon } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useAnamnesesPaciente } from "@/hooks/useAnamneses";
import { usePrescricoesPaciente } from "@/hooks/usePrescricoes";
import { useDocumentosPaciente, useUploadDocumento, useDeleteDocumento, downloadDocumento, validarArquivo } from "@/hooks/useDocumentos";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const TIPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

export default function MeuProntuario() {
  const { profile, paciente, user, refreshUserData } = useAuth();
  const { data: anamneses = [], isLoading: loadingA } = useAnamnesesPaciente();
  const { data: prescricoes = [], isLoading: loadingP } = usePrescricoesPaciente();
  const { data: documentos = [], isLoading: loadingD } = useDocumentosPaciente();
  const uploadDocumento = useUploadDocumento();
  const deleteDocumento = useDeleteDocumento();
  const { toast } = useToast();

  const [nomeDoc, setNomeDoc] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edição de perfil
  const [editOpen, setEditOpen] = useState(false);
  const [editTipoSanguineo, setEditTipoSanguineo] = useState<string>("");
  const [editDataNasc, setEditDataNasc] = useState<string>("");
  const [editPeso, setEditPeso] = useState<string>("");
  const [editAltura, setEditAltura] = useState<string>("");
  const [editAlergias, setEditAlergias] = useState<string[]>([]);
  const [novaAlergia, setNovaAlergia] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  useEffect(() => {
    if (editOpen) {
      setEditTipoSanguineo(paciente?.tipo_sanguineo ?? "");
      setEditDataNasc(paciente?.data_nascimento ?? "");
      setEditPeso(paciente?.peso != null ? String(paciente.peso) : "");
      setEditAltura(paciente?.altura != null ? String(paciente.altura) : "");
      setEditAlergias(paciente?.alergias ?? []);
      setNovaAlergia("");
    }
  }, [editOpen, paciente]);

  function adicionarAlergia() {
    const v = novaAlergia.trim();
    if (!v) return;
    if (editAlergias.some((a) => a.toLowerCase() === v.toLowerCase())) {
      setNovaAlergia("");
      return;
    }
    setEditAlergias([...editAlergias, v]);
    setNovaAlergia("");
  }

  function removerAlergia(a: string) {
    setEditAlergias(editAlergias.filter((x) => x !== a));
  }

  async function salvarPerfil() {
    if (!user?.id) return;
    setSalvandoPerfil(true);
    try {
      const peso = editPeso.trim() ? Number(editPeso.replace(",", ".")) : null;
      const altura = editAltura.trim() ? Number(editAltura.replace(",", ".")) : null;
      if (editPeso.trim() && (peso === null || Number.isNaN(peso))) {
        toast({ title: "Peso inválido", variant: "destructive" });
        setSalvandoPerfil(false);
        return;
      }
      if (editAltura.trim() && (altura === null || Number.isNaN(altura))) {
        toast({ title: "Altura inválida", variant: "destructive" });
        setSalvandoPerfil(false);
        return;
      }
      const { error } = await supabase
        .from("pacientes")
        .update({
          tipo_sanguineo: editTipoSanguineo || null,
          data_nascimento: editDataNasc || null,
          peso,
          altura,
          alergias: editAlergias.length ? editAlergias : null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshUserData();
      toast({ title: "Perfil atualizado com sucesso" });
      setEditOpen(false);
    } catch (err: unknown) {
      toast({ title: "Erro ao salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSalvandoPerfil(false);
    }
  }

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
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Activity className="h-4 w-4 text-primary" /></div>
              <h2 className="text-base font-semibold text-foreground">Dados do Paciente</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="rounded-xl gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Editar perfil
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Nome", value: profile?.nome ?? "—" },
              { label: "CPF", value: paciente?.cpf ?? "—" },
              { label: "Data de nascimento", value: paciente?.data_nascimento ? format(new Date(paciente.data_nascimento + "T00:00:00"), "dd/MM/yyyy") : "Não informado" },
              { label: "Tipo Sanguíneo", value: paciente?.tipo_sanguineo ?? "Não informado" },
              { label: "Peso", value: paciente?.peso != null ? `${paciente.peso} kg` : "Não informado" },
              { label: "Altura", value: paciente?.altura != null ? `${paciente.altura} cm` : "Não informado" },
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>Atualize seus dados de saúde para um atendimento mais preciso.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo Sanguíneo</Label>
                <Select value={editTipoSanguineo} onValueChange={setEditTipoSanguineo}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TIPOS_SANGUINEOS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de nascimento</Label>
                <Input
                  type="date"
                  value={editDataNasc}
                  onChange={(e) => setEditDataNasc(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peso (kg)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={editPeso}
                  onChange={(e) => setEditPeso(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="Ex: 70.5"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Altura (cm)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  value={editAltura}
                  onChange={(e) => setEditAltura(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="Ex: 175"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alergias</Label>
              <div className="flex gap-2">
                <Input
                  value={novaAlergia}
                  onChange={(e) => setNovaAlergia(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarAlergia(); } }}
                  placeholder="Digite uma alergia e pressione Enter"
                  className="h-10 rounded-xl"
                />
                <Button type="button" variant="outline" onClick={adicionarAlergia} className="rounded-xl shrink-0">
                  Adicionar
                </Button>
              </div>
              {editAlergias.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editAlergias.map((a) => (
                    <Badge key={a} variant="secondary" className="rounded-full pl-3 pr-1.5 py-1 gap-1.5 bg-primary/10 text-primary hover:bg-primary/15">
                      {a}
                      <button
                        type="button"
                        onClick={() => removerAlergia(a)}
                        className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                        aria-label={`Remover ${a}`}
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl" disabled={salvandoPerfil}>
              Cancelar
            </Button>
            <Button onClick={salvarPerfil} disabled={salvandoPerfil} className="rounded-xl gap-2">
              {salvandoPerfil && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {salvandoPerfil ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
