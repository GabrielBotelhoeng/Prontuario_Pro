import { cn } from "@/lib/utils";
import type { Consulta } from "@/lib/database.types";

const ESTILO: Record<Consulta["status"], { dot: string; texto: string; rotulo: string }> = {
  Aguardando: { dot: "bg-warning", texto: "text-warning", rotulo: "Aguardando confirmação" },
  Confirmado: { dot: "bg-primary", texto: "text-primary", rotulo: "Confirmada" },
  "Em andamento": { dot: "bg-brass animate-pulse", texto: "text-brass-foreground dark:text-brass", rotulo: "Em atendimento" },
  Finalizado: { dot: "bg-success", texto: "text-success", rotulo: "Finalizada" },
  Cancelado: { dot: "bg-muted-foreground/50", texto: "text-muted-foreground line-through", rotulo: "Cancelada" },
};

export function StatusConsulta({ status, className }: { status: Consulta["status"]; className?: string }) {
  const e = ESTILO[status] ?? ESTILO.Aguardando;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", e.texto, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", e.dot)} aria-hidden="true" />
      {e.rotulo}
    </span>
  );
}
