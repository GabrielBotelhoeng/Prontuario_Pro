import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useAuth, type LoginTipo } from "@/contexts/AuthContext";
import { maskCPF, maskCRM } from "@/lib/masks";
import { cn } from "@/lib/utils";
import AuthLayout from "@/components/AuthLayout";
import { VitalLine } from "@/components/Brand";
import { homeFor } from "@/lib/rotas";
import { AuthError, AuthSubmit, PasswordInput, authInputClass } from "@/components/auth/AuthPrimitives";

const MODO_KEY = "prontuario:loginModo";

const MODOS: Record<LoginTipo, {
  rotulo: string;
  campo: string;
  placeholder: string;
  subtitulo: string;
}> = {
  medico: {
    rotulo: "Profissional",
    campo: "CRM",
    placeholder: "123456/UF",
    subtitulo: "Entre com seu CRM para acessar agenda, prontuários e prescrições.",
  },
  paciente: {
    rotulo: "Paciente",
    campo: "CPF",
    placeholder: "000.000.000-00",
    subtitulo: "Acompanhe consultas, receitas e seu histórico clínico.",
  },
  admin: {
    rotulo: "Administração",
    campo: "E-mail institucional",
    placeholder: "nome@hospital.com.br",
    subtitulo: "Gestão de contas, acessos e auditoria do hospital.",
  },
};

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function lerModoSalvo(): LoginTipo {
  try {
    const v = localStorage.getItem(MODO_KEY);
    return v === "paciente" || v === "medico" ? v : "medico";
  } catch {
    return "medico";
  }
}

const Index = () => {
  const [modo, setModo] = useState<LoginTipo>(lerModoSalvo);
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const { signIn, profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const expirouPorInatividade = (location.state as { motivo?: string } | null)?.motivo === "inatividade";

  // Já autenticado (ou login acabou de concluir): segue para a área correta.
  useEffect(() => {
    if (user && profile) {
      navigate(profile.precisa_trocar_senha ? "/primeiro-acesso" : homeFor(profile.tipo), { replace: true });
    }
  }, [user, profile, navigate]);

  const trocarModo = (novo: LoginTipo) => {
    setModo(novo);
    setIdentificador("");
    setErro("");
    if (novo !== "admin") {
      try {
        localStorage.setItem(MODO_KEY, novo);
      } catch {
        /* armazenamento indisponível: preferência não persiste */
      }
    }
  };

  const handleIdentificador = (v: string) => {
    if (modo === "medico") setIdentificador(maskCRM(v));
    else if (modo === "paciente") setIdentificador(maskCPF(v));
    else setIdentificador(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await signIn(modo, identificador.trim(), senha);
      // O redirecionamento acontece no efeito acima, quando o perfil carregar.
    } catch (err: unknown) {
      setErro((err as Error).message ?? "Erro ao entrar.");
      setLoading(false);
    }
  };

  const detectarCaps = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  const cfg = MODOS[modo];
  const isAdmin = modo === "admin";

  return (
    <AuthLayout
      aside={{
        title: (
          <>
            O cuidado começa
            <br />
            por um <em>registro</em> confiável.
          </>
        ),
        caption:
          "Prontuário eletrônico do hospital: agenda, anamnese, prescrição digital e histórico do paciente em um só lugar, com trilha de auditoria LGPD.",
      }}
    >
      <VitalLine className="-mx-1 mb-6 h-8 opacity-70" />

      <p className="eyebrow mb-3">{isAdmin ? "Acesso restrito" : "Acesso ao prontuário"}</p>
      <h2 className="font-display text-[2.6rem] leading-none text-foreground">
        {saudacao()}<em>.</em>
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{cfg.subtitulo}</p>
      {expirouPorInatividade && (
        <p role="status" className="mt-5 rounded-lg border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm text-foreground">
          Sua sessão foi encerrada após 15 minutos sem uso. Entre novamente para continuar.
        </p>
      )}

      {isAdmin ? (
        <button
          type="button"
          onClick={() => trocarModo(lerModoSalvo())}
          className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao acesso clínico
        </button>
      ) : (
        <div role="tablist" aria-label="Tipo de acesso" className="mt-7 grid grid-cols-2 border-b border-border">
          {(["medico", "paciente"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={modo === t}
              onClick={() => trocarModo(t)}
              className={cn(
                "relative pb-3 text-left text-sm font-medium transition-colors",
                modo === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {MODOS[t].rotulo}
              <span
                className={cn(
                  "absolute -bottom-px left-0 h-[2px] bg-primary transition-all duration-300",
                  modo === t ? "w-full" : "w-0",
                )}
              />
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        <div className="space-y-2">
          <label htmlFor="identificador" className="text-sm font-medium text-foreground">
            {cfg.campo}
          </label>
          <input
            id="identificador"
            type={isAdmin ? "email" : "text"}
            inputMode={modo === "paciente" ? "numeric" : isAdmin ? "email" : "text"}
            autoComplete="username"
            autoCapitalize={isAdmin ? "none" : "characters"}
            spellCheck={false}
            value={identificador}
            onChange={(e) => handleIdentificador(e.target.value)}
            maxLength={modo === "medico" ? 9 : modo === "paciente" ? 14 : 120}
            placeholder={cfg.placeholder}
            required
            aria-invalid={!!erro}
            className={cn(authInputClass, !isAdmin && "font-mono tracking-wide")}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="senha" className="text-sm font-medium text-foreground">
              Senha
            </label>
            <Link to="/esqueci-senha" className="text-xs font-medium text-primary hover:underline underline-offset-4">
              Esqueci minha senha
            </Link>
          </div>
          <PasswordInput
            id="senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyUp={detectarCaps}
            onKeyDown={detectarCaps}
            placeholder="••••••••"
            required
            aria-invalid={!!erro}
          />
          {capsLock && (
            <p className="text-xs font-medium text-warning">Caps Lock está ativado.</p>
          )}
        </div>

        <AuthError>{erro}</AuthError>

        <AuthSubmit loading={loading} loadingText="Verificando credenciais" disabled={!identificador || !senha}>
          Entrar
        </AuthSubmit>
      </form>

      <div className="mt-8 rounded-lg border border-dashed border-border px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
        {modo === "paciente" ? (
          <>Ainda não tem acesso? Solicite na <strong className="font-medium text-foreground">recepção do hospital</strong> com um documento com foto.</>
        ) : modo === "medico" ? (
          <>Contas de profissionais são criadas pela <strong className="font-medium text-foreground">administração do hospital</strong>.</>
        ) : (
          <>Somente contas autorizadas pela TI. Todas as ações são registradas.</>
        )}
      </div>

      {!isAdmin && (
        <button
          type="button"
          onClick={() => trocarModo("admin")}
          className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <KeyRound className="h-3.5 w-3.5" /> Acesso da administração
        </button>
      )}
    </AuthLayout>
  );
};

export default Index;
