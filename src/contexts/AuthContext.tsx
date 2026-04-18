import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, Medico, Paciente } from "@/lib/database.types";

interface SignUpData {
  nome: string;
  email: string;
  documento: string;
  senha: string;
  tipo: "medico" | "paciente";
  especialidade?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  medico: Medico | null;
  paciente: Paciente | null;
  loading: boolean;
  signIn: (tipo: "medico" | "paciente", documento: string, senha: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [medico, setMedico] = useState<Medico | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUserData(userId: string) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profileData) return;
    setProfile(profileData as Profile);

    if (profileData.tipo === "medico") {
      const { data } = await supabase
        .from("medicos")
        .select("*")
        .eq("id", userId)
        .single();
      setMedico(data as Medico);
    } else {
      const { data } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", userId)
        .single();
      setPaciente(data as Paciente);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setProfile(null);
        setMedico(null);
        setPaciente(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(tipo: "medico" | "paciente", documento: string, senha: string) {
    const rpcName = tipo === "medico" ? "get_email_by_crm" : "get_email_by_cpf";
    const paramName = tipo === "medico" ? "p_crm" : "p_cpf";

    const docOriginal = documento.trim();
    // Versão só com dígitos/letras (sem pontuação de máscara)
    const docSemMascara = docOriginal.replace(/[.\-\s]/g, "");

    // Tenta original, depois sem máscara
    let email: string | null = null;
    const { data: e1, error: err1 } = await supabase.rpc(rpcName, { [paramName]: docOriginal });
    if (err1) console.error("[signIn] RPC erro (original):", err1);
    if (e1) {
      email = e1;
    } else if (docSemMascara !== docOriginal) {
      const { data: e2, error: err2 } = await supabase.rpc(rpcName, { [paramName]: docSemMascara });
      if (err2) console.error("[signIn] RPC erro (sem máscara):", err2);
      if (e2) email = e2;
    }

    if (!email) {
      throw new Error(
        tipo === "medico"
          ? "CRM não encontrado. Verifique o número cadastrado."
          : "CPF não encontrado. Verifique o número cadastrado."
      );
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      console.error("[signIn] signInWithPassword erro:", error.message, error);
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        throw new Error("E-mail não confirmado. Verifique sua caixa de entrada.");
      }
      // "Invalid login credentials" pode ser senha errada OU e-mail não confirmado
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        throw new Error("Senha incorreta ou e-mail não confirmado. Verifique os dados.");
      }
      throw new Error("Erro ao fazer login: " + error.message);
    }
  }

  async function signUp(data: SignUpData) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.senha,
      options: {
        data: {
          nome: data.nome,
          tipo: data.tipo,
          documento: data.documento,
          especialidade: data.especialidade ?? "Clínica Geral",
        },
      },
    });
    if (error) throw new Error(error.message);

    // Belt-and-suspenders: se o usuário já tem sessão (confirmação de e-mail desativada),
    // garante que o perfil foi criado mesmo se o trigger falhou
    if (authData.session) {
      await supabase.rpc("upsert_user_profile", {
        p_nome: data.nome,
        p_tipo: data.tipo,
        p_documento: data.documento,
        p_especialidade: data.especialidade ?? "Clínica Geral",
      });
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) throw new Error(error.message);
  }

  return (
    <AuthContext.Provider value={{ user, profile, medico, paciente, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
