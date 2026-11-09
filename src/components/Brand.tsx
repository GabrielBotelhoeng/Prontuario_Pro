import { cn } from "@/lib/utils";

/** Marca do Prontuário-Pro: cruz clínica atravessada por um traço de pulso. Usa currentColor. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("h-8 w-8", className)}>
      <path
        d="M12.5 3.5h7a1 1 0 0 1 1 1v7h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-7v7a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h7v-7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6 16h6.2l1.8-4 3.2 8 2-4H26"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLockup({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={inverted ? "text-white" : "text-primary"} />
      <span className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-foreground")}>
        Prontuário<span className={inverted ? "text-white/75" : "text-muted-foreground"}>-Pro</span>
      </span>
    </div>
  );
}

/** Traço de sinal vital que se desenha uma única vez na entrada. */
export function VitalLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 40"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("vital-line h-10 w-full text-primary", className)}
    >
      <path
        d="M0 20h210l10-14 12 30 12-36 12 34 8-14h336"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
