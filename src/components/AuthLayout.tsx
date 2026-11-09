import { ReactNode, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import corridor from "@/assets/hospital-corridor.webp";
import { BrandLockup, BrandMark } from "@/components/Brand";

interface AuthLayoutProps {
  children: ReactNode;
  /** Texto editorial sobre a fotografia (desktop). Use <em> para a ênfase em itálico. */
  aside?: { title: ReactNode; caption: string };
}

const AMBIENT_VIDEO = "/media/login-ambient.mp4";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const AuthLayout = ({ children, aside }: AuthLayoutProps) => {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      {/* Painel fotográfico */}
      <aside className="relative h-52 overflow-hidden sm:h-64 lg:sticky lg:top-0 lg:m-3 lg:h-[calc(100vh-1.5rem)] lg:rounded-2xl">
        <img src={corridor} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {!reducedMotion && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={AMBIENT_VIDEO}
            poster={corridor}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(192_45%_8%/0.88)] via-[hsl(192_45%_8%/0.25)] to-[hsl(192_45%_8%/0.35)]" />

        <div className="absolute left-5 top-5 lg:left-8 lg:top-8">
          <BrandLockup inverted />
        </div>

        {aside && (
          <div className="absolute inset-x-8 bottom-10 hidden max-w-xl lg:block xl:inset-x-12 xl:bottom-14">
            <h1 className="rise-in font-display text-5xl leading-[1.04] text-white xl:text-[4.25rem] [&_em]:text-[hsl(36_60%_72%)]">
              {aside.title}
            </h1>
            <p className="rise-in mt-6 max-w-md text-[15px] leading-relaxed text-white/75 [animation-delay:120ms]">
              {aside.caption}
            </p>
          </div>
        )}
      </aside>

      {/* Coluna do formulário */}
      <main className="paper-grain flex min-h-[calc(100vh-13rem)] flex-col px-5 py-8 sm:px-10 lg:min-h-screen lg:px-14 xl:px-20">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Ambiente protegido · dados tratados conforme a LGPD
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono">
            <BrandMark className="h-3.5 w-3.5" />© {new Date().getFullYear()}
          </span>
        </footer>
      </main>
    </div>
  );
};

export default AuthLayout;
