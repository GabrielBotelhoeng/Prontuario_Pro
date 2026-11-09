import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check, LogOut } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { AuthHeading, NovaSenhaForm } from "@/components/auth/AuthPrimitives";
import { homeFor } from "@/lib/rotas";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { CONSENTIMENTOS_OBRIGATORIOS, registrarConsentimentosLote } from "@/hooks/useConsentimentos";
import { cn } from "@/lib/utils";

const aside = {
  title: (
    <>
      Bem-vindo ao
      <br />
      <em>Prontuário-Pro</em>.
    </>
  ),
  caption:
    "Sua conta foi criada pela equipe do hospital com uma senha temporária. Defina agora uma senha pessoal — só você terá acesso a ela.",
};

const PrimeiroAcesso = () => {
  const { user, profile, loading, trocarSenha, signOut } = useAuth();
  const navigate = useNavigate();
  const [aceite, setAceite] = useState(false);

  if (loading || (user && !profile)) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (!profile.precisa_trocar_senha) return <Navigate to={homeFor(profile.tipo)} replace />;

  const isPaciente = profile.tipo === "paciente";
  const primeiroNome = profile.nome.split(" ")[0];

  const salvar = async (senha: string) => {
    await trocarSenha(senha);
    if (isPaciente) {
      await registrarConsentimentosLote(CONSENTIMENTOS_OBRIGATORIOS.map((tipo) => ({ tipo, aceito: true })));
    }
    navigate(homeFor(profile.tipo), { replace: true });
  };

  return (
    <AuthLayout aside={aside}>
      <AuthHeading eyebrow="Primeiro acesso" title={<>Olá, <em>{primeiroNome}</em>.</>}>
        Para sua segurança, troque a senha temporária recebida antes de continuar.
      </AuthHeading>

      <NovaSenhaForm
        onSubmit={salvar}
        submitLabel="Salvar e continuar"
        extraValido={!isPaciente || aceite}
        extra={
          isPaciente && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 text-[13px] leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                  aceite ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                )}
              >
                {aceite && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span>
                Li e aceito os termos de uso, a política de privacidade e autorizo o tratamento dos meus dados de saúde
                pelo hospital, conforme a LGPD (art. 11).
              </span>
            </label>
          )
        }
      />

      <button
        type="button"
        onClick={() => signOut()}
        className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" /> Sair e fazer isso depois
      </button>
    </AuthLayout>
  );
};

export default PrimeiroAcesso;
