import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import logoIcon from "@/assets/logo-icon.png";
import { supabase } from "@/lib/supabase";

const ResetSenha = () => {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessaoRecovery, setSessaoRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase processa o hash da URL e dispara o evento PASSWORD_RECOVERY
    // ou já cria a sessão de recovery automaticamente.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessaoRecovery(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessaoRecovery(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (senha.length < 6) {
      setErro("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      setDone(true);
      // Encerra a sessão de recovery para forçar novo login com a senha nova.
      await supabase.auth.signOut();
      setTimeout(() => navigate("/"), 1800);
    } catch (err: unknown) {
      setErro((err as Error).message ?? "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      marketing={{
        title: (
          <>
            Defina sua
            <br />
            nova senha.
          </>
        ),
        subtitle: "Escolha uma senha forte para manter sua conta segura.",
      }}
    >
      <div
        className="bg-white rounded-2xl p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ boxShadow: "0 4px 40px -8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex flex-col items-center gap-2 mb-8">
          <img src={logoIcon} alt="Prontuário-Pro" className="w-11 h-11" />
          <span className="text-primary text-lg font-semibold tracking-tight">Prontuário-Pro</span>
        </div>

        {done ? (
          <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="text-primary" size={32} strokeWidth={1.75} />
            </div>
            <h2 className="text-foreground text-2xl font-semibold tracking-tight mb-2">
              Senha redefinida
            </h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-7 max-w-sm mx-auto">
              Sua senha foi atualizada com sucesso. Você será redirecionado para o login.
            </p>
          </div>
        ) : !sessaoRecovery ? (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-5" />
            <p className="text-sm text-muted-foreground">
              Validando link de recuperação...
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Se nada acontecer em alguns segundos, solicite um novo link.
            </p>
            <Link
              to="/esqueci-senha"
              className="inline-flex items-center gap-1.5 mt-4 text-primary text-sm font-medium hover:opacity-70 underline-offset-4 hover:underline"
            >
              <ArrowLeft size={15} strokeWidth={2} />
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <h2 className="text-foreground text-2xl font-semibold tracking-tight mb-2">
                Definir nova senha
              </h2>
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                Escolha uma nova senha com pelo menos 6 caracteres.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">Nova senha</label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                    size={17}
                    strokeWidth={1.75}
                  />
                  <input
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/40 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">Confirmar senha</label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                    size={17}
                    strokeWidth={1.75}
                  />
                  <input
                    type="password"
                    required
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-muted/40 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-white"
                  />
                </div>
              </div>

              {erro && (
                <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2.5">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 transition-all duration-300 hover:opacity-90 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {loading ? "Atualizando..." : "Redefinir senha"}
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
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetSenha;
