import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import logoIcon from "@/assets/logo-icon.png";

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <AuthLayout
      marketing={{
        title: (
          <>
            Recupere seu
            <br />
            acesso com segurança.
          </>
        ),
        subtitle:
          "Em poucos segundos você volta a acessar sua conta com total segurança.",
      }}
    >
      <div
        className="bg-white rounded-2xl p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{
          boxShadow:
            "0 4px 40px -8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex flex-col items-center gap-2 mb-8">
          <img src={logoIcon} alt="Prontuário-Pro" className="w-11 h-11" />
          <span className="text-primary text-lg font-semibold tracking-tight">
            Prontuário-Pro
          </span>
        </div>

        {!sent ? (
          <>
            <div className="text-center mb-7">
              <h2 className="text-foreground text-2xl font-semibold tracking-tight mb-2">
                Recuperar Acesso
              </h2>
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                Digite seu e-mail cadastrado e enviaremos as instruções para
                definir uma nova senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">
                  E-mail
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                    size={18}
                    strokeWidth={1.75}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="
                      w-full h-12 pl-11 pr-4 rounded-xl
                      bg-muted/40 border border-border
                      text-foreground text-sm placeholder:text-muted-foreground/50
                      outline-none transition-all duration-300
                      focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-white
                    "
                  />
                </div>
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
                Enviar Link de Recuperação
              </button>
            </form>

            <div className="text-center mt-6">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-primary text-sm font-medium transition-all duration-300 hover:opacity-70 underline-offset-4 hover:underline"
              >
                <ArrowLeft size={15} strokeWidth={2} />
                Voltar para o Login
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <CheckCircle2
                className="text-primary"
                size={32}
                strokeWidth={1.75}
              />
            </div>
            <h2 className="text-foreground text-2xl font-semibold tracking-tight mb-2">
              E-mail enviado com sucesso
            </h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-7 max-w-sm mx-auto">
              Enviamos as instruções para{" "}
              <span className="text-foreground font-medium">{email}</span>.
              Verifique sua caixa de entrada.
            </p>
            <button
              onClick={() => navigate("/")}
              className="
                w-full h-12 rounded-xl
                bg-primary text-primary-foreground font-semibold text-sm
                shadow-lg shadow-primary/20
                transition-all duration-300
                hover:opacity-90 hover:shadow-xl hover:shadow-primary/25
                active:opacity-95 active:scale-[0.99]
              "
            >
              Voltar para o Login
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default EsqueciSenha;
