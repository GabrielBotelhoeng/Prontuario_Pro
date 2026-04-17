import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import doctorHero from "@/assets/doctor-hero.jpg";
import logoIcon from "@/assets/logo-icon.png";

type UserType = "medico" | "paciente";

const Index = () => {
  const [userType, setUserType] = useState<UserType>("medico");
  const [cpfCrm, setCpfCrm] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(userType === "medico" ? "/medico" : "/paciente");
  };

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

      {/* Doctor image as duotone texture — left/center-left */}
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
      {/* Purple overlay on doctor for duotone effect */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, hsl(267,56%,50%,0.35) 0%, transparent 50%)",
          mixBlendMode: "color",
        }}
      />

      {/* Content layer */}
      <div className="relative z-10 flex min-h-screen items-center justify-between px-6 sm:px-12 lg:px-20">
        {/* Left side — marketing text */}
        <div className="hidden lg:flex flex-col justify-center max-w-lg xl:max-w-xl flex-shrink-0 pr-12 relative">
          <h1 className="text-white text-5xl xl:text-6xl font-bold leading-tight tracking-tight mb-6 animate-in fade-in slide-in-from-left-4 duration-500">
            {userType === "medico" ? (
              <>
                Gestão clínica
                <br />
                completa.
              </>
            ) : (
              <>
                Sua saúde em
                <br />
                suas mãos.
              </>
            )}
          </h1>
          <p className="text-white/80 text-lg xl:text-xl leading-relaxed max-w-md animate-in fade-in slide-in-from-left-6 duration-700">
            {userType === "medico"
              ? "Gerencie seus pacientes e prontuários com tranquilidade em uma única plataforma segura e intuitiva."
              : "Acompanhe suas consultas, receitas e histórico médico em um só lugar com total segurança."}
          </p>
        </div>

        {/* Right side — login card */}
        <div className="w-full max-w-[440px] mx-auto lg:mx-0 lg:ml-auto">
          <div
            className="bg-white rounded-2xl p-8 sm:p-10"
            style={{
              boxShadow:
                "0 4px 40px -8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* Logo centered above welcome */}
            <div className="flex flex-col items-center gap-2 mb-10">
              <img
                src={logoIcon}
                alt="Prontuário-Pro"
                className="w-11 h-11"
              />
              <span className="text-primary text-lg font-semibold tracking-tight">
                Prontuário-Pro
              </span>
            </div>

            {/* Header */}
            <div className="text-center mb-7">
              <h2 className="text-foreground text-2xl font-semibold tracking-tight mb-1">
                Bem-vindo de volta
              </h2>
              <p className="text-muted-foreground text-[15px]">
                Acesse sua conta para continuar
              </p>
            </div>

            {/* Segmented Control */}
            <div className="relative bg-muted rounded-xl p-1 flex mb-7">
              <div
                className="absolute top-1 bottom-1 rounded-[10px] bg-primary shadow-md transition-all duration-300 ease-out"
                style={{
                  left: userType === "medico" ? "4px" : "50%",
                  width: "calc(50% - 4px)",
                }}
              />
              {(["medico", "paciente"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setUserType(type)}
                  className={`
                    relative z-10 flex-1 py-2.5 text-sm font-medium rounded-[10px]
                    transition-colors duration-300
                    ${
                      userType === type
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {type === "medico" ? "Médico" : "Paciente"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">
                  {userType === "medico" ? "CRM" : "CPF"}
                </label>
                <input
                  type="text"
                  value={cpfCrm}
                  onChange={(e) => setCpfCrm(e.target.value)}
                  placeholder={
                    userType === "medico"
                      ? "Digite seu CRM"
                      : "Digite seu CPF"
                  }
                  className="
                    w-full h-12 px-4 rounded-xl
                    bg-muted/40 border border-border
                    text-foreground text-sm placeholder:text-muted-foreground/50
                    outline-none transition-all duration-300
                    focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-white
                  "
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className="
                    w-full h-12 px-4 rounded-xl
                    bg-muted/40 border border-border
                    text-foreground text-sm placeholder:text-muted-foreground/50
                    outline-none transition-all duration-300
                    focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-white
                  "
                />
              </div>

              <button
                type="submit"
                className="
                  w-full h-12 rounded-xl
                  bg-primary text-primary-foreground font-semibold text-sm
                  shadow-lg shadow-primary/20
                  transition-all duration-300
                  hover:opacity-90 hover:shadow-xl hover:shadow-primary/25
                  active:opacity-95 active:scale-[0.99]
                "
              >
                Entrar
              </button>
            </form>

            <div className="flex flex-col items-center gap-3 mt-6">
              <Link
                to="/esqueci-senha"
                className="text-primary text-sm font-medium transition-all duration-300 hover:opacity-70 underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </Link>
              <p className="text-muted-foreground text-sm">
                Novo aqui?{" "}
                <Link
                  to="/cadastro"
                  className="text-primary font-semibold transition-all duration-300 hover:opacity-70 underline-offset-4 hover:underline"
                >
                  Crie uma conta
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: doctor texture as full bg with overlay */}
      <div
        className="lg:hidden absolute inset-0 opacity-[0.06] -z-0"
        style={{
          backgroundImage: `url(${doctorHero})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(1)",
        }}
      />

      {/* Copyright */}
      <p className="absolute bottom-5 left-6 sm:left-12 lg:left-20 z-10 text-white/40 text-xs">
        © 2026 Prontuário-Pro. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default Index;
