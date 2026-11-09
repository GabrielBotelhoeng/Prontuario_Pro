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

export type LoginTipo = "medico" | "paciente" | "admin";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  medico: Medico | null;
  paciente: Paciente | null;
  loading: boolean;
  /** médico → CRM · paciente → CPF · admin → e-mail institucional */
  signIn: (tipo: LoginTipo, identificador: string, senha: string) => Promise<void>;
  /** Troca a senha do usuário logado e encerra a obrigação de primeiro acesso. */
  trocarSenha: (novaSenha: string) => Promise<void>;
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
    if (profileData.ativo === false) {
      await supabase.auth.signOut();
      return;
    }
    setProfile(profileData as Profile);

    if (profileData.tipo === "admin") return;

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

  async function signIn(tipo: LoginTipo, identificador: string, senha: string) {
    const credenciaisInvalidas = "Credenciais inválidas. Verifique os dados e tente novamente.";

    if (tipo === "admin") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identificador.trim().toLowerCase(),
        password: senha,
      });
      if (error || !data.user) throw new Error(credenciaisInvalidas);
      const { data: perfil } = await supabase
        .from("profiles")
        .select("tipo, ativo")
        .eq("id", data.user.id)
        .single();
      if (perfil?.tipo !== "admin" || perfil?.ativo === false) {
        await supabase.auth.signOut();
        throw new Error("Esta conta não tem acesso administrativo.");
      }
      return;
    }

    const docOriginal = identificador.trim();
    const docSemMascara = docOriginal.replace(/[.\-\s]/g, "");

    // login_lookup só retorna email quando a senha confere — fecha enumeration.
    // Mesma resposta (NULL) para "identificador não existe" ou "senha errada".
    let email: string | null = null;
    // Erro na RPC ≠ senha errada: não mascarar como "credenciais inválidas"
    // (foi assim que uma regressão no login passou despercebida).
    const indisponivel = "Não foi possível verificar suas credenciais agora. Tente novamente em instantes.";
    const { data: e1, error: erroLookup } = await supabase.rpc("login_lookup", {
      p_identifier: docOriginal,
      p_tipo: tipo,
      p_password: senha,
    });
    if (erroLookup) {
      console.error("[auth] login_lookup falhou:", erroLookup.message);
      throw new Error(indisponivel);
    }
    if (e1) {
      email = e1;
    } else if (docSemMascara !== docOriginal) {
      const { data: e2, error: erroLookup2 } = await supabase.rpc("login_lookup", {
        p_identifier: docSemMascara,
        p_tipo: tipo,
        p_password: senha,
      });
      if (erroLookup2) throw new Error(indisponivel);
      if (e2) email = e2;
    }

    if (!email) {
      throw new Error(credenciaisInvalidas);
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        throw new Error("Conta ainda não ativada. Procure a administração do hospital.");
      }
      throw new Error(credenciaisInvalidas);
    }
  }

  async function trocarSenha(novaSenha: string) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("different") || msg.includes("same")) {
        throw new Error("A nova senha precisa ser diferente da senha temporária.");
      }
      if (msg.includes("weak") || msg.includes("short")) {
        throw new Error("Senha muito fraca. Use ao menos 8 caracteres com letras e números.");
      }
      throw new Error("Não foi possível alterar a senha. Tente novamente.");
    }
    const { error: rpcErr } = await supabase.rpc("marcar_senha_trocada");
    if (rpcErr) console.warn("[auth] marcar_senha_trocada falhou:", rpcErr);
    if (currentUserIdRef.current) await loadUserData(currentUserIdRef.current);
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
    <AuthContext.Provider value={{ user, profile, medico, paciente, loading, signIn, trocarSenha, signOut, resetPassword, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
