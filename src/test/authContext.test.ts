import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

// Respostas de profiles por chamada (testes de retry e de login admin)
let profileResponses: Array<{ data: unknown }> = [];
let profileCallCount = 0;
let rpcCalls: Array<{ name: string; args: unknown }> = [];
let loginLookupResult: string | null = null;

function makeFromMock() {
  return (tableName: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => {
        if (tableName === "profiles") {
          const resp = profileResponses[profileCallCount] ?? { data: null };
          profileCallCount++;
          return resp;
        }
        return { data: null };
      },
    };
    return chain;
  };
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const mocked = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  profileCallCount = 0;
  profileResponses = [];
  rpcCalls = [];
  loginLookupResult = null;

  mocked(supabase.from).mockImplementation(makeFromMock());
  mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } });
  mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null });
  mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
  mocked(supabase.rpc).mockImplementation(async (name: string, args: unknown) => {
    rpcCalls.push({ name, args });
    if (name === "login_lookup") return { data: loginLookupResult, error: null };
    return { data: null, error: null };
  });
});

// ---------------------------------------------------------------------------
// signIn — profissionais e pacientes (CRM/CPF)
// ---------------------------------------------------------------------------

describe("signIn — CRM/CPF", () => {
  it("resolve o e-mail via login_lookup e autentica", async () => {
    loginLookupResult = "ana@hospital.com";
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signIn("medico", "123456/GO", "segredo1");
    });

    expect(rpcCalls[0]).toMatchObject({ name: "login_lookup", args: { p_tipo: "medico" } });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "ana@hospital.com", password: "segredo1" });
  });

  it("faz uma única consulta por tentativa (o banco normaliza a máscara)", async () => {
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.signIn("paciente", "123.456.789-09", "x")).rejects.toThrow(/Credenciais inválidas/);
    });

    const lookups = rpcCalls.filter((c) => c.name === "login_lookup");
    expect(lookups).toHaveLength(1);
    expect(lookups[0].args).toMatchObject({ p_identifier: "123.456.789-09" });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("mostra a mensagem de bloqueio quando o banco recusa por excesso de tentativas", async () => {
    mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { code: "PT429", message: "Muitas tentativas de acesso. Tente novamente em 15 minuto(s)." },
    });
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.signIn("medico", "123456/SP", "x")).rejects.toThrow(/Muitas tentativas/);
    });
  });

  it("erro inesperado no banco não aparece como senha errada", async () => {
    mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { code: "42883", message: "function crypt does not exist" } });
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.signIn("medico", "123456/SP", "x")).rejects.toThrow(/Não foi possível verificar/);
    });
  });
});

// ---------------------------------------------------------------------------
// signIn — administração (e-mail)
// ---------------------------------------------------------------------------

describe("signIn — administração", () => {
  it("permite entrar quando o perfil é admin ativo", async () => {
    profileResponses = [{ data: { tipo: "admin", ativo: true } }];
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signIn("admin", "  TI@Hospital.com ", "segredo1");
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "ti@hospital.com", password: "segredo1" });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("encerra a sessão quando a conta não é admin", async () => {
    profileResponses = [{ data: { tipo: "medico", ativo: true } }];
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.signIn("admin", "medico@hospital.com", "x")).rejects.toThrow(/acesso administrativo/);
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("mensagem genérica quando o Supabase recusa a senha", async () => {
    mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: { user: null }, error: { message: "Invalid" } });
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.signIn("admin", "x@y.com", "errada")).rejects.toThrow(/Credenciais inválidas/);
    });
  });
});

// ---------------------------------------------------------------------------
// trocarSenha — primeiro acesso
// ---------------------------------------------------------------------------

describe("trocarSenha", () => {
  it("atualiza a senha e marca o primeiro acesso como concluído", async () => {
    const { result } = renderAuth();

    await act(async () => {
      await result.current.trocarSenha("NovaSenha123");
    });

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "NovaSenha123" });
    expect(rpcCalls.map((c) => c.name)).toContain("marcar_senha_trocada");
  });

  it("traduz o erro de senha igual à anterior", async () => {
    mocked(supabase.auth.updateUser).mockResolvedValue({
      data: {},
      error: { message: "New password should be different from the old password." },
    });
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.trocarSenha("Igual12345")).rejects.toThrow(/diferente da senha temporária/);
    });
    expect(rpcCalls.map((c) => c.name)).not.toContain("marcar_senha_trocada");
  });
});

// ---------------------------------------------------------------------------
// loadUserData — retry e contas desativadas
// ---------------------------------------------------------------------------

describe("loadUserData", () => {
  it("perfil encontrado na primeira tentativa → sem retry", async () => {
    profileResponses = [{ data: { id: "u1", nome: "Dr. Ana", tipo: "medico", email: "ana@med.com", ativo: true } }];
    mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    const { result } = renderAuth();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(profileCallCount).toBe(1);
    expect(result.current.profile).toMatchObject({ id: "u1", nome: "Dr. Ana" });
  });

  it("perfil null na 1ª tentativa, encontrado na 2ª → retry uma vez", async () => {
    profileResponses = [{ data: null }, { data: { id: "u2", nome: "João", tipo: "paciente", email: "j@m.com", ativo: true } }];
    mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "u2" } } } });

    const { result } = renderAuth();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1800));
    });

    expect(profileCallCount).toBe(2);
    expect(result.current.profile).toMatchObject({ id: "u2" });
  }, 10000);

  it("perfil null em todas as tentativas → desiste sem lançar erro", async () => {
    profileResponses = [{ data: null }, { data: null }, { data: null }, { data: null }];
    mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "u3" } } } });

    const { result } = renderAuth();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 3000));
    });

    expect(profileCallCount).toBe(4);
    expect(result.current.profile).toBeNull();
  }, 15000);

  it("conta desativada → encerra a sessão e não expõe o perfil", async () => {
    profileResponses = [{ data: { id: "u4", nome: "Ex", tipo: "medico", email: "e@x.com", ativo: false } }];
    mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "u4" } } } });

    const { result } = renderAuth();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
  });
});
