import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Estado vazio editorial: foto + título serifado + texto + ação opcional. */
export function EstadoVazio({
  imagem,
  titulo,
  children,
  acao,
  className,
}: {
  imagem: string;
  titulo: ReactNode;
  children?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-6 px-6 py-10 text-center sm:flex-row sm:text-left", className)}>
      <img
        src={imagem}
        alt=""
        loading="lazy"
        className="h-36 w-36 flex-shrink-0 rounded-lg object-cover shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.5)]"
      />
      <div className="max-w-sm">
        <h3 className="font-display text-2xl leading-tight text-foreground">{titulo}</h3>
        {children && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>}
        {acao && <div className="mt-4">{acao}</div>}
      </div>
    </div>
  );
}
