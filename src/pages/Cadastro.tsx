import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  User,
  Lock,
  IdCard,
  Stethoscope,
  HeartPulse,
  Check,
  type LucideIcon,
} from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import logoIcon from "@/assets/logo-icon.png";
import { useAuth } from "@/contexts/AuthContext";

type Profile = "paciente" | "medico";

const Cadastro = () => {
  const [profile, setProfile] = useState<Profile>("paciente");
  const [form, setForm] = useState({
    nome: "",
    email: "",
    documento: "",
    senha: "",
    confirmar: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const update =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return;
    setErro("");

    if (form.senha !== form.confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (form.senha.length < 6) {
      setErro("A senha deve ter ao menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await signUp({
        nome: form.nome,
        email: form.email,
        documento: form.documento,
        senha: form.senha,
        tipo: profile,
      });
      navigate(profile === "medico" ? "/medico" : "/paciente");
    } catch (err: any) {
      setErro(err.message ?? "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      marketing={{
        title: profile === "medico" ? (<>Gestão clínica<br />completa.</>) : (<>Sua saúde em<br />suas mãos.</>),
        subtitle: profile === "medico"
          ? "Gerencie seus pacientes e prontuários com tranquilidade."
          : "Acompanhe suas consultas, receitas e histórico médico em um só lugar.",
      }}
    >
      <div
        className="bg-white rounded-2xl p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ boxShadow: "0 4px 40px -8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex flex-col items-center gap-2 mb-7">
          <img src={logoIcon} alt="Prontuário-Pro" className="w-11 h-11" />
          <span className="text-primary text-lg font-semibold tracking-tight">Prontuário-Pro</span>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight mb-1">Criar nova conta</h2>
          <p className="text-muted-foreground text-[15px]">Selecione seu perfil para começar</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { key: "paciente" as const, label: "Sou Paciente", icon: HeartPulse },
            { key: "medico" as const, label: "Sou Médico/Clínica", icon: Stethoscope },
          ].map(({ key, label, icon: Icon }) => {
            const active = profile === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setProfile(key)}
                className={`group relative rounded-xl border p-4 text-left transition-all duration-300 ${
                  active
                    ? "border-primary bg-primary/[0.04] shadow-sm shadow-primary/10"
                    : "border-border bg-muted/30 hover:bg-muted/50 hover:border-border/80"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-colors duration-300 ${active ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground"}`}>
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <p className={`text-sm font-medium transition-colors duration-300 ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </p>
                {active && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check size={11} strokeWidth={3} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nome completo" icon={User} placeholder="Seu nome" value={form.nome} onChange={update("nome")} />
          <FormField label="E-mail" icon={Mail} type="email" placeholder="seu@email.com" value={form.email} onChange={update("email")} />
          <FormField
            label={profile === "medico" ? "CRM" : "CPF"}
            icon={IdCard}
            placeholder={profile === "medico" ? "Digite seu CRM" : "000.000.000-00"}
            value={form.documento}
            onChange={update("documento")}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Senha" icon={Lock} type="password" placeholder="••••••••" value={form.senha} onChange={update("senha")} />
            <FormField label="Confirmar" icon={Lock} type="password" placeholder="••••••••" value={form.confirmar} onChange={update("confirmar")} />
          </div>

          <label className="flex items-start gap-3 pt-1 cursor-pointer group select-none">
            <span className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border transition-all duration-300 ${accepted ? "bg-primary border-primary" : "bg-white border-border group-hover:border-primary/50"}`}>
              {accepted && <Check size={12} strokeWidth={3} className="text-primary-foreground" />}
            </span>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="sr-only" />
            <span className="text-[13px] text-muted-foreground leading-relaxed">
              Aceito os{" "}
              <a className="text-primary font-medium hover:underline underline-offset-4 cursor-pointer">termos de uso</a>{" "}
              e{" "}
              <a className="text-primary font-medium hover:underline underline-offset-4 cursor-pointer">política de privacidade</a>
            </span>
          </label>

          {erro && (
            <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2.5">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={!accepted || loading}
            className="w-full h-12 rounded-xl mt-2 bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 transition-all duration-300 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            {loading ? "Criando conta..." : "Cadastrar Agora"}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link to="/" className="inline-flex items-center gap-1.5 text-primary text-sm font-medium transition-all duration-300 hover:opacity-70 underline-offset-4 hover:underline">
            <ArrowLeft size={15} strokeWidth={2} />
            Já tenho uma conta
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

interface FormFieldProps {
  label: string;
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FormField = ({ label, icon: Icon, type = "text", placeholder, value, onChange }: FormFieldProps) => (
  <div className="space-y-1.5">
    <label className="text-foreground text-sm font-medium">{label}</label>
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={17} strokeWidth={1.75} />
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/40 border border-border text-foreground text-sm placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:bg-white"
      />
    </div>
  </div>
);

export default Cadastro;
