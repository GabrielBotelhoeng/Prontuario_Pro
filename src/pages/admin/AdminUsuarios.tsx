import { useMemo, useState } from "react";
import { Check, Copy, KeyRound, MoreHorizontal, Plus, Power, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { adminNavItems } from "./nav";
import {
  useCriarUsuario,
  useDefinirAtivo,
  useRedefinirSenha,
  useUsuarios,
  type NovoUsuario,
  type UsuarioAdmin,
} from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { maskCPF, maskCRM } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Filtro = "todos" | UsuarioAdmin["tipo"] | "inativos";

const TIPO_LABEL: Record<UsuarioAdmin["tipo"], string> = {
  medico: "Médico",
  paciente: "Paciente",
  admin: "Admin",
};

function formatarDocumento(u: UsuarioAdmin) {
  if (!u.documento) return "—";
  if (u.tipo === "paciente") return maskCPF(u.documento);
  if (u.tipo === "medico") return maskCRM(u.documento.replace(/^(\d+)([A-Z]{2})$/, "$1/$2"));
  return u.documento;
}

/* ───────────────────────── Senha temporária (exibida uma vez) ───────────────────────── */

function SenhaTemporariaDialog({ dados, onClose }: { dados: { nome: string; senha: string } | null; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    if (!dados) return;
    try {
      await navigator.clipboard.writeText(dados.senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  return (
    <Dialog open={!!dados} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="eyebrow">Senha temporária</p>
          <DialogTitle className="font-display text-3xl font-normal">
            Entregue a <em className="text-primary">{dados?.nome.split(" ")[0]}</em>
          </DialogTitle>
          <DialogDescription>
            Esta senha aparece somente agora. No primeiro login, o usuário será obrigado a criar uma senha pessoal.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
          <code className="flex-1 select-all font-mono text-xl tracking-[0.12em] text-foreground">{dados?.senha}</code>
          <Button size="icon" variant="ghost" onClick={copiar} aria-label="Copiar senha">
            {copiado ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Nova conta ───────────────────────── */

const VAZIO: NovoUsuario = { tipo: "paciente", nome: "", email: "", documento: "", especialidade: "" };

function NovaContaDialog({
  open,
  onOpenChange,
  onCriada,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCriada: (nome: string, senha: string) => void;
}) {
  const [form, setForm] = useState<NovoUsuario>(VAZIO);
  const criar = useCriarUsuario();
  const set = <K extends keyof NovoUsuario>(k: K, v: NovoUsuario[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await criar.mutateAsync(form);
      onCriada(form.nome, r.senha_temporaria);
      setForm(VAZIO);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="eyebrow">Provisionamento</p>
          <DialogTitle className="font-display text-3xl font-normal">Nova conta</DialogTitle>
          <DialogDescription>
            A conta nasce ativa e com senha temporária. Nenhum e-mail automático é enviado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div role="radiogroup" aria-label="Tipo de conta" className="grid grid-cols-3 gap-2">
            {(["paciente", "medico", "admin"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={form.tipo === t}
                onClick={() => setForm({ ...VAZIO, nome: form.nome, email: form.email, tipo: t })}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  form.tipo === t
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-nome">Nome completo</Label>
            <Input id="nc-nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} required autoComplete="off" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nc-email">E-mail</Label>
            <Input
              id="nc-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Usado para recuperação de senha.</p>
          </div>

          {form.tipo !== "admin" && (
            <div className={cn("grid gap-4", form.tipo === "medico" && "sm:grid-cols-2")}>
              <div className="space-y-2">
                <Label htmlFor="nc-doc">{form.tipo === "medico" ? "CRM" : "CPF"}</Label>
                <Input
                  id="nc-doc"
                  className="font-mono"
                  value={form.documento}
                  placeholder={form.tipo === "medico" ? "123456/UF" : "000.000.000-00"}
                  onChange={(e) => set("documento", form.tipo === "medico" ? maskCRM(e.target.value) : maskCPF(e.target.value))}
                  required
                />
              </div>
              {form.tipo === "medico" && (
                <div className="space-y-2">
                  <Label htmlFor="nc-esp">Especialidade</Label>
                  <Input
                    id="nc-esp"
                    value={form.especialidade}
                    placeholder="Clínica Geral"
                    onChange={(e) => set("especialidade", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {form.tipo === "admin" && (
            <p className="flex gap-2 rounded-lg bg-warning/10 p-3 text-xs leading-relaxed text-foreground">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 text-warning" />
              Administradores gerenciam todas as contas e veem a trilha de auditoria completa.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? "Criando…" : "Criar conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Página ───────────────────────── */

export default function AdminUsuarios() {
  const { user } = useAuth();
  const { data: usuarios = [], isLoading, error } = useUsuarios();
  const redefinir = useRedefinirSenha();
  const definirAtivo = useDefinirAtivo();

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [novaAberta, setNovaAberta] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string } | null>(null);
  const [confirmarStatus, setConfirmarStatus] = useState<UsuarioAdmin | null>(null);

  const contagem = useMemo(
    () => ({
      medico: usuarios.filter((u) => u.tipo === "medico" && u.ativo).length,
      paciente: usuarios.filter((u) => u.tipo === "paciente" && u.ativo).length,
      admin: usuarios.filter((u) => u.tipo === "admin" && u.ativo).length,
      inativos: usuarios.filter((u) => !u.ativo).length,
    }),
    [usuarios],
  );

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qDigitos = q.replace(/\D/g, "");
    return usuarios.filter((u) => {
      if (filtro === "inativos" ? u.ativo : filtro !== "todos" && (u.tipo !== filtro || !u.ativo)) return false;
      if (!q) return true;
      return (
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (!!qDigitos && !!u.documento?.includes(qDigitos)) ||
        !!u.documento?.toLowerCase().includes(q.replace(/[^0-9a-z]/g, ""))
      );
    });
  }, [usuarios, filtro, busca]);

  const handleRedefinir = async (u: UsuarioAdmin) => {
    try {
      const r = await redefinir.mutateAsync(u.id);
      setSenhaGerada({ nome: u.nome, senha: r.senha_temporaria });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleStatus = async () => {
    if (!confirmarStatus) return;
    const u = confirmarStatus;
    setConfirmarStatus(null);
    try {
      await definirAtivo.mutateAsync({ userId: u.id, ativo: !u.ativo });
      toast.success(u.ativo ? `${u.nome} foi desativado.` : `${u.nome} foi reativado.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filtros: { id: Filtro; label: string; n?: number }[] = [
    { id: "todos", label: "Todos", n: usuarios.length },
    { id: "medico", label: "Médicos", n: contagem.medico },
    { id: "paciente", label: "Pacientes", n: contagem.paciente },
    { id: "admin", label: "Administração", n: contagem.admin },
    { id: "inativos", label: "Desativados", n: contagem.inativos },
  ];

  return (
    <DashboardLayout navItems={adminNavItems}>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
          <div>
            <p className="eyebrow mb-3">Administração do hospital</p>
            <h1 className="font-display text-5xl leading-none text-foreground">
              Equipe &amp; <em>pacientes</em>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
              Crie contas, redefina senhas temporárias e controle quem pode acessar o prontuário.
            </p>
          </div>
          <Button onClick={() => setNovaAberta(true)} className="h-11 gap-2 px-5">
            <Plus className="h-4 w-4" /> Nova conta
          </Button>
        </header>

        {/* Faixa de números */}
        <dl className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
          {[
            ["Médicos ativos", contagem.medico],
            ["Pacientes ativos", contagem.paciente],
            ["Administradores", contagem.admin],
            ["Desativados", contagem.inativos],
          ].map(([label, n]) => (
            <div key={label} className="bg-background py-6 pr-4 [&:not(:first-child)]:pl-6">
              <dt className="eyebrow">{label}</dt>
              <dd className="mt-2 font-mono text-3xl tabular-nums text-foreground">
                {isLoading ? <Skeleton className="h-8 w-12" /> : String(n).padStart(2, "0")}
              </dd>
            </div>
          ))}
        </dl>

        {/* Filtros + busca */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {filtros.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                  filtro === f.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
                <span className="ml-1.5 font-mono text-[11px] opacity-60">{f.n ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, e-mail, CPF ou CRM"
              className="pl-9"
              aria-label="Buscar contas"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_44px] gap-4 border-b border-border bg-muted/40 px-5 py-3 md:grid">
            {["Nome", "Papel", "Documento", "Criada em", ""].map((h) => (
              <span key={h} className="eyebrow">{h}</span>
            ))}
          </div>

          {error ? (
            <p className="p-8 text-sm text-destructive">
              Não foi possível carregar as contas. Confirme que a migration 019 foi aplicada.
            </p>
          ) : isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : visiveis.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visiveis.map((u) => (
                <li
                  key={u.id}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_44px] items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_44px]",
                    !u.ativo && "opacity-55",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.nome}
                      {u.id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground md:hidden">
                      {TIPO_LABEL[u.tipo]} · {formatarDocumento(u)}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-sm",
                        u.tipo === "admin" ? "text-brass-foreground dark:text-brass" : "text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          u.tipo === "medico" ? "bg-primary" : u.tipo === "admin" ? "bg-brass" : "bg-muted-foreground/50",
                        )}
                      />
                      {TIPO_LABEL[u.tipo]}
                    </span>
                    {u.especialidade && <p className="text-xs text-muted-foreground">{u.especialidade}</p>}
                    {!u.ativo && <p className="text-xs text-destructive">Desativada</p>}
                    {u.ativo && u.precisa_trocar_senha && <p className="text-xs text-warning">Aguardando 1º acesso</p>}
                  </div>
                  <span className="hidden font-mono text-sm text-foreground md:block">{formatarDocumento(u)}</span>
                  <span className="hidden font-mono text-xs text-muted-foreground md:block">
                    {format(new Date(u.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Ações para ${u.nome}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRedefinir(u)} disabled={!u.ativo || redefinir.isPending}>
                        <KeyRound className="mr-2 h-4 w-4" /> Gerar senha temporária
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmarStatus(u)}
                        disabled={u.id === user?.id}
                        className={u.ativo ? "text-destructive focus:text-destructive" : ""}
                      >
                        <Power className="mr-2 h-4 w-4" /> {u.ativo ? "Desativar conta" : "Reativar conta"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NovaContaDialog
        open={novaAberta}
        onOpenChange={setNovaAberta}
        onCriada={(nome, senha) => setSenhaGerada({ nome, senha })}
      />
      <SenhaTemporariaDialog dados={senhaGerada} onClose={() => setSenhaGerada(null)} />

      <AlertDialog open={!!confirmarStatus} onOpenChange={(o) => !o && setConfirmarStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmarStatus?.ativo ? "Desativar" : "Reativar"} a conta de {confirmarStatus?.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmarStatus?.ativo
                ? "O acesso é bloqueado imediatamente. O histórico clínico é preservado e a conta pode ser reativada depois."
                : "O usuário volta a conseguir entrar com a senha atual."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatus}
              className={confirmarStatus?.ativo ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmarStatus?.ativo ? "Desativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
