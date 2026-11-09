import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Foto com vídeo ambiente em loop por cima. Sem animação (preferência do
 * sistema) ou se o vídeo falhar, fica só a foto.
 */
export function AmbientMedia({ poster, video, className }: { poster: string; video?: string; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {video && !reducedMotion && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={video}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      )}
    </div>
  );
}
