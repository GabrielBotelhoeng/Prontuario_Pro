import { ReactNode } from "react";
import doctorHero from "@/assets/doctor-hero.jpg";

interface AuthLayoutProps {
  children: ReactNode;
  /** When true, hides the left marketing column (used on narrower forms like signup if desired) */
  marketing?: { title: ReactNode; subtitle: string };
}

const AuthLayout = ({ children, marketing }: AuthLayoutProps) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Full-screen gradient background: purple left → white right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, hsl(267,56%,45%) 0%, hsl(270,50%,55%) 25%, hsl(275,45%,65%) 40%, hsl(280,35%,78%) 55%, hsl(0,0%,96%) 70%, hsl(0,0%,100%) 100%)",
        }}
      />

      {/* Doctor image as duotone texture */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url(${doctorHero})`,
          backgroundSize: "58% auto",
          backgroundPosition: "12% center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "luminosity",
          filter: "blur(2px) contrast(1.06) brightness(0.92)",
          maskImage:
            "radial-gradient(ellipse 64% 82% at 24% 50%, hsla(0, 0%, 0%, 1) 14%, hsla(0, 0%, 0%, 0.96) 32%, hsla(0, 0%, 0%, 0.74) 50%, hsla(0, 0%, 0%, 0.36) 66%, hsla(0, 0%, 0%, 0.12) 76%, transparent 84%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 64% 82% at 24% 50%, hsla(0, 0%, 0%, 1) 14%, hsla(0, 0%, 0%, 0.96) 32%, hsla(0, 0%, 0%, 0.74) 50%, hsla(0, 0%, 0%, 0.36) 66%, hsla(0, 0%, 0%, 0.12) 76%, transparent 84%)",
        }}
      />
      {/* Purple duotone overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, hsl(267,56%,50%,0.35) 0%, transparent 50%)",
          mixBlendMode: "color",
        }}
      />

      {/* Content layer */}
      <div className="relative z-10 flex min-h-screen items-center justify-between px-6 sm:px-12 lg:px-20 py-10">
        {marketing && (
          <div className="hidden lg:flex flex-col justify-center max-w-lg xl:max-w-xl flex-shrink-0 pr-12 relative">
            <h1 className="text-white text-5xl xl:text-6xl font-bold leading-tight tracking-tight mb-6">
              {marketing.title}
            </h1>
            <p className="text-white/80 text-lg xl:text-xl leading-relaxed max-w-md">
              {marketing.subtitle}
            </p>
          </div>
        )}

        <div className={marketing ? "w-full max-w-[440px] mx-auto lg:mx-0 lg:ml-auto" : "w-full max-w-[520px] mx-auto"}>
          {children}
        </div>
      </div>

      {/* Mobile texture */}
      <div
        className="lg:hidden absolute inset-0 opacity-[0.06] -z-0"
        style={{
          backgroundImage: `url(${doctorHero})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1)",
        }}
      />

      <p className="absolute bottom-5 left-6 sm:left-12 lg:left-20 z-10 text-white/40 text-xs">
        © 2026 Prontuário-Pro. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default AuthLayout;
