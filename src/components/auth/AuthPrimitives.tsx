import { forwardRef, useState, type ReactNode } from "react";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { forcaSenha, validarSenha } from "@/lib/senha";

export const authInputClass =
  "h-12 w-full rounded-lg border border-input bg-card px-4 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10 aria-[invalid=true]:border-destructive";

export function AuthHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-7">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h2 className="font-display text-[2.4rem] leading-[1.02] text-foreground">{title}</h2>
      {children && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{children}</p>}
    </header>
  );
}

export function AuthField({ id, label, children, hint }: { id: string; label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint}
    </div>
  );
}

export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visivel, setVisivel] = useState(false);
    return (
      <div className="relative">
        <input ref={ref} type={visivel ? "text" : "password"} className={cn(authInputClass, "pr-12", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export function AuthSubmit({ loading, children, loadingText, disabled }: { loading?: boolean; children: ReactNode; loadingText?: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="group flex h-12 w-full items-center justify-between rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.7)] transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
    >
      {loading ? loadingText ?? children : children}
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {children}
    </p>
  );
}

const ROTULOS_FORCA = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];

export function PasswordStrength({ senha }: { senha: string }) {
  if (!senha) return null;
  const f = forcaSenha(senha);
  return (
    <div className="flex items-center gap-3 pt-1" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < f ? (f <= 1 ? "bg-destructive" : f === 2 ? "bg-warning" : "bg-success") : "bg-border",
            )}
          />
        ))}
      </div>
      <span className="w-20 text-right font-mono text-[11px] text-muted-foreground">{ROTULOS_FORCA[f]}</span>
    </div>
  );
}

/** Formulário de nova senha + confirmação, usado em reset e primeiro acesso. */
export function NovaSenhaForm({
  onSubmit,
  submitLabel,
  extra,
  extraValido = true,
}: {
  onSubmit: (senha: string) => Promise<void>;
  submitLabel: string;
  extra?: ReactNode;
  extraValido?: boolean;
}) {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    const violacao = validarSenha(senha);
    if (violacao) return setErro(violacao);
    if (senha !== confirmar) return setErro("As senhas não coincidem.");
    setLoading(true);
    try {
      await onSubmit(senha);
    } catch (err: unknown) {
      setErro((err as Error).message ?? "Não foi possível salvar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handle} className="space-y-5" noValidate>
      <AuthField id="nova-senha" label="Nova senha" hint={<PasswordStrength senha={senha} />}>
        <PasswordInput
          id="nova-senha"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Mínimo de 8 caracteres"
          required
        />
      </AuthField>
      <AuthField id="confirmar-senha" label="Confirmar nova senha">
        <PasswordInput
          id="confirmar-senha"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          placeholder="Repita a senha"
          required
          aria-invalid={!!confirmar && confirmar !== senha}
        />
      </AuthField>
      {extra}
      <AuthError>{erro}</AuthError>
      <AuthSubmit loading={loading} loadingText="Salvando" disabled={!senha || !confirmar || !extraValido}>
        {submitLabel}
      </AuthSubmit>
    </form>
  );
}
