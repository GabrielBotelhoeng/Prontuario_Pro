import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, Medico, Paciente, ConsentimentoTipo } from "@/lib/database.types";
import { registrarConsentimentosLote } from "@/hooks/useConsentimentos";
import { logAuditEvent } from "@/hooks/useAuditLogs";

const PENDING_CONSENTS_KEY = "prontuario:pendingConsents";

/** Drena consentimentos pendentes salvos pelo Cadastro durante e-mail-confirm. */
async function drainPendingConsents() {
  try {
    const raw = localStorage.getItem(PENDING_CONSENTS_KEY);
    if (!raw) return;
    const itens = JSON.parse(raw) as { tipo: ConsentimentoTipo; aceito: boolean }[];
    if (Array.isArray(itens) && itens.length > 0) {
      await registrarConsentimentosLote(itens);
    }
    localStorage.removeItem(PENDING_CONSENTS_KEY);
  } catch (err) {
    console.warn("[auth] falha ao registrar consentimentos pendentes:", err);
  }
}

interface SignUpData {
  nome: string;
  email: string;
  documento: string;
  senha: string;
  tipo: "medico" | "paciente";
  especialidade?: string;
  medico_principal_id?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  medico: Medico | null;
  paciente: Paciente | null;
  loading: boolean;
  signIn: (tipo: "medico" | "paciente", documento: string, senha: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [medico, setMedico] = useState<Medico | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(true);

  // Rastreia o user.id em foco. Resultados de loadUserData que chegam
  // após troca de sessão são descartados — evita race ao trocar de conta
  // ou ao getSession/onAuthStateChange dispararem em paralelo no mount.
  const currentUserIdRef = useRef<string | null>(null);

  async function loadUserData(userId: string, tentativa = 0) {
    if (currentUserIdRef.current !== userId) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (currentUserIdRef.current !== userId) return;

    if (!profileData) {
      if (tentativa < 3) {
        await new Promise((r) => setTimeout(r, 800));
        return loadUserData(userId, tentativa + 1);
      }
      return;
    }
    setProfile(profileData as Profile);

    if (profileData.tipo === "medico") {
      const { data } = await supabase
        .from("medicos")
        .select("*")
        .eq("id", userId)
        .single();
      if (currentUserIdRef.current !== userId) return;
      setMedico(data as Medico);
    } else {
      const { data } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", userId)
        .single();
      if (currentUserIdRef.current !== userId) return;
      setPaciente(data as Paciente);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      currentUserIdRef.current = u?.id ?? null;
      setUser(u);
      if (u) loadUserData(u.id).finally(() => mounted && setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      const newId = newUser?.id ?? null;

      // Troca de usuário (ou logout): limpa estados antes de carregar os novos
      // para não exibir dados do usuário anterior durante o intervalo.
      if (currentUserIdRef.current !== newId) {
        setProfile(null);
        setMedico(null);
        setPaciente(null);
      }

      currentUserIdRef.current = newId;
      setUser(newUser);
      if (newUser) loadUserData(newUser.id);

      // Eventos LGPD no momento do login efetivo (não em refresh).
      if (event === "SIGNED_IN" && newUser) {
        drainPendingConsents();
        logAuditEvent({ action: "login_sucesso" });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(tipo: "medico" | "paciente", documento: string, senha: string) {
    const docOriginal = documento.trim();
    const docSemMascara = docOriginal.replace(/[.\-\s]/g, "");

    // login_lookup só retorna email quando a senha confere — fecha enumeration.
    // Mesma resposta (NULL) para "identificador não existe" ou "senha errada".
    let email: string | null = null;
    const { data: e1 } = await supabase.rpc("login_lookup", {
      p_identifier: docOriginal,
      p_tipo: tipo,
      p_password: senha,
    });
    if (e1) {
      email = e1;
    } else if (docSemMascara !== docOriginal) {
      const { data: e2 } = await supabase.rpc("login_lookup", {
        p_identifier: docSemMascara,
        p_tipo: tipo,
        p_password: senha,
      });
      if (e2) email = e2;
    }

    if (!email) {
      throw new Error("Credenciais inválidas. Verifique os dados e tente novamente.");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        throw new Error("Cadastro não confirmado. Verifique sua caixa de entrada e clique no link de ativação.");
      }
      throw new Error("Credenciais inválidas. Verifique os dados e tente novamente.");
    }
  }

  async function signUp(data: SignUpData): Promise<{ needsConfirmation: boolean }> {
    const docNormalizado =
      data.tipo === "paciente"
        ? data.documento.replace(/[^0-9]/g, "")
        : data.documento.replace(/[^0-9A-Za-z]/g, "").toUpperCase();

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.senha,
      options: {
        data: {
          nome: data.nome,
          tipo: data.tipo,
          documento: docNormalizado,
          especialidade: data.especialidade ?? "Clínica Geral",
        },
      },
    });

    if (error) {
      const status = (error as { status?: number }).status;
      const msg = error.message.toLowerCase();
      if (status === 422 || msg.includes("422")) {
        if (msg.includes("already") || msg.includes("email address") || msg.includes("already registered")) {
          throw new Error("E-mail já cadastrado. Use outro e-mail ou faça login.");
        }
        throw new Error("Dados inválidos no cadastro. Verifique as informações e tente novamente.");
      }
      throw new Error(error.message);
    }

    // Se sessão existe (email confirmation desativado), garante que o perfil foi criado
    if (authData.session) {
      try {
        await supabase.rpc("upsert_user_profile", {
          p_nome: data.nome,
          p_tipo: data.tipo,
          p_documento: docNormalizado,
          p_especialidade: data.especialidade ?? "Clínica Geral",
        });
      } catch (upsertErr) {
        console.warn("[signUp] upsert_user_profile falhou (não crítico):", upsertErr);
      }

      // Paciente cadastrado escolheu médico responsável: vincula via update
      // (RLS atual permite via pacientes_update_own).
      if (data.tipo === "paciente" && data.medico_principal_id && authData.user?.id) {
        try {
          await supabase
            .from("pacientes")
            .update({ medico_principal_id: data.medico_principal_id })
            .eq("id", authData.user.id);
        } catch (vincErr) {
          console.warn("[signUp] vínculo médico responsável falhou (não crítico):", vincErr);
        }
      }
    }

    return { needsConfirmation: !authData.session };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-senha`,
    });
    if (error) throw new Error(error.message);
  }

  async function refreshUserData() {
    if (currentUserIdRef.current) {
      await loadUserData(currentUserIdRef.current);
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, medico, paciente, loading, signIn, signUp, signOut, resetPassword, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
