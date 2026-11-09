import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { AuthHeading, NovaSenhaForm } from "@/components/auth/AuthPrimitives";
import { supabase } from "@/lib/supabase";

const aside = {
  title: (
    <>
      Uma senha <em>nova</em>,
      <br />
      o mesmo cuidado.
    </>
  ),
  caption: "Use ao menos 8 caracteres, combinando letras e números. Evite repetir senhas de outros serviços.",
};

const ResetSenha = () => {
  const [done, setDone] = useState(false);
  const [sessaoRecovery, setSessaoRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // O Supabase processa o hash da URL e cria a sessão de recovery.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessaoRecovery(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessaoRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const salvar = async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) throw new Error("Não foi possível redefinir a senha. Solicite um novo link.");
    await supabase.rpc("marcar_senha_trocada");
    setDone(true);
    // Encerra a sessão de recovery para forçar novo login com a senha nova.
    await supabase.auth.signOut();
    setTimeout(() => navigate("/"), 1800);
  };

  return (
    <AuthLayout aside={aside}>
      {done ? (
        <div className="rise-in">
          <CheckCircle2 className="mb-6 h-10 w-10 text-success" strokeWidth={1.5} />
          <AuthHeading eyebrow="Tudo certo" title={<>Senha <em>redefinida</em>.</>}>
            Redirecionando para o login…
          </AuthHeading>
        </div>
      ) : !sessaoRecovery ? (
        <div>
          <Loader2 className="mb-6 h-8 w-8 animate-spin text-primary" />
          <AuthHeading eyebrow="Validando" title="Conferindo seu link…">
            Se nada acontecer em alguns segundos, o link pode ter expirado.
          </AuthHeading>
          <Link to="/esqueci-senha" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
            <ArrowLeft className="h-4 w-4" /> Solicitar novo link
          </Link>
        </div>
      ) : (
        <>
          <AuthHeading eyebrow="Redefinir senha" title={<>Defina sua <em>nova</em> senha.</>} />
          <NovaSenhaForm onSubmit={salvar} submitLabel="Salvar nova senha" />
        </>
      )}
    </AuthLayout>
  );
};

export default ResetSenha;
