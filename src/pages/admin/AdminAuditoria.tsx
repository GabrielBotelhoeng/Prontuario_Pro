import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { adminNavItems } from "./nav";
import { useAuditoriaGeral, type AuditLogAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ACAO_LABEL: Record<string, string> = {
  login_sucesso: "Login",
  login_falha: "Falha de login",
  prontuario_visualizado: "Visualizou prontuário",
  prescricao_criada: "Emitiu prescrição",
  prescricao_visualizada: "Visualizou prescrição",
  anamnese_criada: "Registrou anamnese",
  anamnese_visualizada: "Visualizou anamnese",
  consulta_visualizada: "Visualizou consulta",
  documento_baixado: "Baixou documento",
  documento_enviado: "Enviou documento",
  consentimento_aceito: "Aceitou consentimento",
  consentimento_revogado: "Revogou consentimento",
  conta_encerrada: "Encerrou conta",
  senha_alterada: "Alterou a senha",
  usuario_criado: "Criou conta",
  senha_redefinida: "Gerou senha temporária",
  usuario_desativado: "Desativou conta",
  usuario_reativado: "Reativou conta",
};

const GRUPOS: { id: string; label: string; match: (a: string) => boolean }[] = [
  { id: "todos", label: "Tudo", match: () => true },
  { id: "acesso", label: "Acesso a dados", match: (a) => a.endsWith("_visualizado") || a.endsWith("_visualizada") || a === "documento_baixado" },
  { id: "clinico", label: "Registros clínicos", match: (a) => a.endsWith("_criada") || a === "documento_enviado" },
  { id: "contas", label: "Contas e senhas", match: (a) => a.startsWith("usuario_") || a.startsWith("senha_") || a.startsWith("login_") || a === "conta_encerrada" },
];

function csv(linhas: AuditLogAdmin[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["data_hora", "ator", "papel", "acao", "alvo", "recurso"];
  const body = linhas.map((l) =>
    [l.created_at, l.actor_nome, l.actor_tipo, l.action, l.target_nome, l.resource_type].map(esc).join(","),
  );
  return [head.join(","), ...body].join("\n");
}

export default function AdminAuditoria() {
  const { data: logs = [], isLoading } = useAuditoriaGeral(500);
  const [grupo, setGrupo] = useState("todos");

  const filtrados = useMemo(() => {
    const g = GRUPOS.find((x) => x.id === grupo) ?? GRUPOS[0];
    return logs.filter((l) => g.match(l.action));
  }, [logs, grupo]);

  const exportar = () => {
    const blob = new Blob(["﻿" + csv(filtrados)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout navItems={adminNavItems}>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
          <div>
            <p className="eyebrow mb-3">LGPD · art. 37</p>
            <h1 className="font-display text-5xl leading-none text-foreground">
              Trilha de <em>auditoria</em>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
              Quem acessou o quê, e quando. Registros imutáveis — nem a administração pode alterá-los.
            </p>
          </div>
          <Button variant="outline" onClick={exportar} disabled={!filtrados.length} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </header>

        <div className="flex flex-wrap gap-1.5 py-6" role="tablist">
          {GRUPOS.map((g) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={grupo === g.id}
              onClick={() => setGrupo(g.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                grupo === g.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <ol className="relative border-l border-border pl-6">
            {filtrados.map((l) => (
              <li key={l.id} className="relative pb-5 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-[29px] top-1.5 h-2 w-2 rounded-full ring-4 ring-background",
                    l.action === "login_falha" || l.action === "usuario_desativado"
                      ? "bg-destructive"
                      : l.actor_tipo === "admin"
                        ? "bg-brass"
                        : "bg-primary",
                  )}
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <time className="w-36 flex-shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {format(new Date(l.created_at), "dd/MM/yy · HH:mm:ss", { locale: ptBR })}
                  </time>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{l.actor_nome ?? (l.actor_tipo === "system" ? "Sistema" : "Usuário removido")}</span>{" "}
                    <span className="text-muted-foreground">{(ACAO_LABEL[l.action] ?? l.action).toLowerCase()}</span>
                    {l.target_nome && l.target_user_id !== l.actor_id && (
                      <>
                        {" "}
                        <span className="text-muted-foreground">·</span> <span className="font-medium">{l.target_nome}</span>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </DashboardLayout>
  );
}
