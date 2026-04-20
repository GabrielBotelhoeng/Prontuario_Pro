import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Supabase mock factory
// ---------------------------------------------------------------------------

// We capture the signUp call args so we can inspect docNormalizado
let lastSignUpCall: { options?: { data?: { documento?: string } } } | null = null;
let mockSignUpResult: { data: { session: unknown }; error: unknown } = {
  data: { session: null },
  error: null,
};

// Track whether upsert_user_profile was called
let upsertCalled = false;
let lastRpcName: string | null = null;

// Profile responses per attempt (for retry tests)
let profileResponses: Array<{ data: unknown }> = [];
let profileCallCount = 0;

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
        // medicos / pacientes — return empty
        return { data: null };
      },
    };
    return chain;
  };
}

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signUp: vi.fn().mockImplementation(async (args: { options?: { data?: { documento?: string } } }) => {
          lastSignUpCall = args;
          return mockSignUpResult;
        }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        resetPasswordForEmail: vi.fn(),
      },
      from: vi.fn().mockImplementation(makeFromMock()),
      rpc: vi.fn().mockImplementation(async (name: string) => {
        lastRpcName = name;
        if (name === "upsert_user_profile") {
          upsertCalled = true;
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }),
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

const BASE_SIGNUP_DATA = {
  nome: "Teste",
  email: "teste@example.com",
  senha: "senha123",
};

function buildSignUpData(overrides: Partial<{ tipo: "medico" | "paciente"; documento: string }> = {}) {
  return {
    ...BASE_SIGNUP_DATA,
    tipo: "paciente" as "medico" | "paciente",
    documento: "12345678900",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  lastSignUpCall = null;
  lastRpcName = null;
  upsertCalled = false;
  profileCallCount = 0;
  profileResponses = [];

  mockSignUpResult = { data: { session: null }, error: null };

  // Reset from mock to fresh implementation
  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(makeFromMock());

  // Reset auth stubs
  (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { session: null },
  });
  (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockImplementation(
    async (args: { options?: { data?: { documento?: string } } }) => {
      lastSignUpCall = args;
      return mockSignUpResult;
    }
  );
  (supabase.rpc as ReturnType<typeof vi.fn>).mockImplementation(async (name: string) => {
    lastRpcName = name;
    if (name === "upsert_user_profile") {
      upsertCalled = true;
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });
});

// ---------------------------------------------------------------------------
// Group 1: signUp — document normalization
// ---------------------------------------------------------------------------

describe("signUp — normalização do documento", () => {
  it("CPF com máscara '123.456.789-00' → docNormalizado = '12345678900'", async () => {
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signUp(
        buildSignUpData({ tipo: "paciente", documento: "123.456.789-00" })
      );
    });

    const doc = lastSignUpCall?.options?.data?.documento;
    expect(doc).toBe("12345678900");
  });

  it("CPF sem máscara '12345678900' → docNormalizado = '12345678900' (sem mudança)", async () => {
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signUp(
        buildSignUpData({ tipo: "paciente", documento: "12345678900" })
      );
    });

    expect(lastSignUpCall?.options?.data?.documento).toBe("12345678900");
  });

  it("CRM com barra '12345/SP' → docNormalizado = '12345SP'", async () => {
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signUp(
        buildSignUpData({ tipo: "medico", documento: "12345/SP" })
      );
    });

    expect(lastSignUpCall?.options?.data?.documento).toBe("12345SP");
  });

  it("CRM já normalizado '12345SP' → docNormalizado = '12345SP'", async () => {
    const { result } = renderAuth();

    await act(async () => {
      await result.current.signUp(
        buildSignUpData({ tipo: "medico", documento: "12345SP" })
      );
    });

    expect(lastSignUpCall?.options?.data?.documento).toBe("12345SP");
  });
});

// ---------------------------------------------------------------------------
// Group 2: signUp — error handling
// ---------------------------------------------------------------------------

describe("signUp — tratamento de erros", () => {
  it("status 422 + 'already' na mensagem → lança 'E-mail já cadastrado...'", async () => {
    mockSignUpResult = {
      data: { session: null },
      error: { status: 422, message: "User already registered" },
    };

    const { result } = renderAuth();

    await expect(
      act(async () => {
        await result.current.signUp(buildSignUpData());
      })
    ).rejects.toThrow("E-mail já cadastrado. Use outro e-mail ou faça login.");
  });

  it("status 422 + mensagem genérica → lança 'Dados inválidos no cadastro...'", async () => {
    mockSignUpResult = {
      data: { session: null },
      error: { status: 422, message: "Unprocessable entity" },
    };

    const { result } = renderAuth();

    await expect(
      act(async () => {
        await result.current.signUp(buildSignUpData());
      })
    ).rejects.toThrow(
      "Dados inválidos no cadastro. Verifique as informações e tente novamente."
    );
  });

  it("status !== 422 → lança error.message diretamente", async () => {
    mockSignUpResult = {
      data: { session: null },
      error: { status: 500, message: "Internal server error" },
    };

    const { result } = renderAuth();

    await expect(
      act(async () => {
        await result.current.signUp(buildSignUpData());
      })
    ).rejects.toThrow("Internal server error");
  });

  it("sucesso com sessão → chama upsert_user_profile", async () => {
    mockSignUpResult = {
      data: { session: { user: { id: "user-123" } } },
      error: null,
    };

    const { result } = renderAuth();

    await act(async () => {
      await result.current.signUp(buildSignUpData());
    });

    expect(upsertCalled).toBe(true);
  });

  it("sucesso sem sessão → retorna { needsConfirmation: true } e NÃO chama upsert", async () => {
    mockSignUpResult = {
      data: { session: null },
      error: null,
    };

    const { result } = renderAuth();

    let returnValue: { needsConfirmation: boolean } | undefined;
    await act(async () => {
      returnValue = await result.current.signUp(buildSignUpData());
    });

    expect(returnValue).toEqual({ needsConfirmation: true });
    expect(upsertCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group 3: loadUserData — retry logic
// ---------------------------------------------------------------------------

describe("loadUserData — lógica de retry", () => {
  it("perfil encontrado na primeira tentativa → sem retry, seta profile", async () => {
    const fakeProfile = { id: "u1", nome: "Dr. Ana", tipo: "medico", email: "ana@med.com" };
    profileResponses = [{ data: fakeProfile }];

    // Simulate a session so getSession triggers loadUserData
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });

    const { result } = renderAuth();

    // Wait for loading to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(profileCallCount).toBe(1);
    expect(result.current.profile).toMatchObject({ id: "u1", nome: "Dr. Ana" });
  });

  it("perfil null na 1ª tentativa, encontrado na 2ª → faz retry uma vez, seta profile", async () => {
    const fakeProfile = { id: "u2", nome: "Paciente João", tipo: "paciente", email: "joao@mail.com" };
    profileResponses = [{ data: null }, { data: fakeProfile }];

    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: "u2" } } },
    });

    const { result } = renderAuth();

    // Wait long enough for the 800ms retry delay + execution
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1800));
    });

    expect(profileCallCount).toBe(2);
    expect(result.current.profile).toMatchObject({ id: "u2", nome: "Paciente João" });
  }, 10000);

  it("perfil null em todas as 3 tentativas → desiste sem lançar erro", async () => {
    profileResponses = [{ data: null }, { data: null }, { data: null }, { data: null }];

    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: "u3" } } },
    });

    const { result } = renderAuth();

    // Wait for all 3 retries: 3 × 800ms + buffer
    await act(async () => {
      await new Promise((r) => setTimeout(r, 3000));
    });

    // 3 retries = 4 total calls (attempt 0, 1, 2, 3 — but tentativa < 3 means attempts 0,1,2 retry → 3 calls before giving up)
    // Actually: attempt 0 → null (tentativa=0 <3, retry), attempt 1 → null (tentativa=1 <3, retry),
    // attempt 2 → null (tentativa=2 <3, retry), attempt 3 → null (tentativa=3, not <3, return)
    // Total = 4 calls
    expect(profileCallCount).toBe(4);
    expect(result.current.profile).toBeNull();
  }, 15000);
});
