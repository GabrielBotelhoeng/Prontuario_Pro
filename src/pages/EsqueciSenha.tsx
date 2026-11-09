import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { AuthError, AuthField, AuthHeading, AuthSubmit, authInputClass } from "@/components/auth/AuthPrimitives";
import { useAuth } from "@/contexts/AuthContext";

const aside = {
  title: (
    <>
      Seu acesso,
      <br />
      <em>de volta</em> com segurança.
    </>
  ),
  caption: "O link de redefinição expira em pouco tempo e só funciona uma vez.",
};

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      // Mesma resposta para e-mail existente ou não (anti-enumeração).
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout aside={aside}>
      {sent ? (
        <div className="rise-in">
          <MailCheck className="mb-6 h-10 w-10 text-primary" strokeWidth={1.5} />
          <AuthHeading eyebrow="Verifique seu e-mail" title={<>Instruções <em>enviadas</em>.</>}>
            Se <span className="font-medium text-foreground">{email}</span> estiver vinculado a uma conta,
            você receberá um link para definir uma nova senha.
          </AuthHeading>
          <p className="mb-8 text-[13px] text-muted-foreground">
            Não recebeu? Confira o spam ou procure a administração do hospital.
          </p>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Link>
        </div>
      ) : (
        <>
          <AuthHeading eyebrow="Recuperar acesso" title={<>Esqueceu a <em>senha</em>?</>}>
            Informe o e-mail cadastrado na sua conta. Enviaremos um link para redefinir a senha.
          </AuthHeading>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <AuthField id="email" label="E-mail">
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={authInputClass}
              />
            </AuthField>
            <AuthError>{erro}</AuthError>
            <AuthSubmit loading={loading} loadingText="Enviando" disabled={!email}>
              Enviar link de redefinição
            </AuthSubmit>
          </form>
          <Link to="/" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
            <ArrowLeft className="h-4 w-4" /> Voltar ao login
          </Link>
        </>
      )}
    </AuthLayout>
  );
};

export default EsqueciSenha;
