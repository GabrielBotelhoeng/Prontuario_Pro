import { useRef, useState } from "react";
import { format } from "date-fns";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  downloadDocumento,
  useDeleteDocumento,
  useDocumentosPacienteMedico,
  useUploadDocumento,
  validarArquivo,
} from "@/hooks/useDocumentos";
import { DOCUMENTO_CATEGORIA_LABEL } from "@/lib/database.types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

/** Exames e documentos do paciente, com envio pelo médico. */
export function DocumentosPacientePanel({ pacienteId }: { pacienteId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: documentos = [], isLoading } = useDocumentosPacienteMedico(pacienteId);
  const upload = useUploadDocumento();
  const excluir = useDeleteDocumento();
  const [nome, setNome] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function enviar() {
    if (!nome.trim() || !arquivo) {
      toast({ title: "Informe o nome e escolha o arquivo", variant: "destructive" });
      return;
    }
    const erro = validarArquivo(arquivo);
    if (erro) {
      toast({ title: "Arquivo inválido", description: erro, variant: "destructive" });
      return;
    }
    try {
      await upload.mutateAsync({ pacienteId, arquivo, nome: nome.trim() });
      toast({ title: "Documento enviado" });
      setNome("");
      setArquivo(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      toast({ title: "Não foi possível enviar o documento", variant: "destructive" });
    }
  }

  return (
    <section aria-labelledby="docs-titulo" className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="docs-titulo" className="font-display text-2xl text-foreground">
          Exames e <em>documentos</em>
        </h2>
        <span className="font-mono text-xs text-muted-foreground">PDF, JPG ou PNG · até 20 MB</span>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Nome (ex.: Raio-X de tórax — nov/2026)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="flex-1"
          aria-label="Nome do documento"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="shrink-0 gap-2">
          <Upload className="h-4 w-4" />
          <span className="max-w-[10rem] truncate">{arquivo ? arquivo.name : "Escolher arquivo"}</span>
        </Button>
        <Button onClick={enviar} disabled={upload.isPending} className="shrink-0">
          {upload.isPending ? "Enviando…" : "Enviar"}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : documentos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          Nenhum documento anexado a este paciente.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documentos.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{doc.nome}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {doc.categoria ? `${DOCUMENTO_CATEGORIA_LABEL[doc.categoria]} · ` : ""}
                    {doc.tipo_arquivo.toUpperCase()}
                    {doc.data_exame ? ` · ${format(new Date(doc.data_exame + "T00:00:00"), "dd/MM/yyyy")}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Baixar ${doc.nome}`}
                  onClick={() => downloadDocumento(doc).catch(() => toast({ title: "Erro ao baixar", variant: "destructive" }))}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {doc.uploaded_by === user?.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Excluir ${doc.nome}`}
                    disabled={excluir.isPending}
                    onClick={() =>
                      excluir
                        .mutateAsync(doc)
                        .then(() => toast({ title: "Documento excluído" }))
                        .catch(() => toast({ title: "Erro ao excluir", variant: "destructive" }))
                    }
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
