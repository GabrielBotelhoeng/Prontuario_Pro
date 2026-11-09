import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ambiente } from "./ambiente";

export type Papel = "admin" | "medico" | "paciente";

/** Resposta da Edge Function admin-usuarios, com o status HTTP real. */
export interface RespostaAdmin<T = Record<string, unknown>> {
  status: number;
  dados: T | null;
  erro: string | null;
}

/**
 * Um usuário do hospital operando o sistema pelas mesmas chamadas que o
 * front faz. Cada agente tem a própria sessão (cliente isolado, sem storage).
 */
export class Agente {
  readonly cliente: SupabaseClient;
  id = "";

  constructor(
    readonly nome: string,
    readonly papel: Papel,
  ) {
    this.cliente = novoCliente();
  }

  /** Espelha AuthContext.signIn (CRM/CPF → login_lookup; admin → e-mail). */
  async entrar(identificador: string, senha: string): Promise<void> {
    if (this.papel === "admin") {
      const { data, error } = await this.cliente.auth.signInWithPassword({
        email: identificador.trim().toLowerCase(),
        password: senha,
      });
      if (error || !data.user) throw new Error("Credenciais inválidas.");
      const perfil = await this.perfil();
      if (perfil?.tipo !== "admin" || perfil?.ativo === false) {
        await this.cliente.auth.signOut();
        throw new Error("Esta conta não tem acesso administrativo.");
      }
      this.id = data.user.id;
      return;
    }

    const original = identificador.trim();
    const semMascara = original.replace(/[.\-\s]/g, "");
    let email: string | null = null;
    for (const tentativa of original === semMascara ? [original] : [original, semMascara]) {
      const { data, error } = await this.cliente.rpc("login_lookup", {
        p_identifier: tentativa,
        p_tipo: this.papel,
        p_password: senha,
      });
      if (error) throw new Error(`login_lookup falhou: ${error.message}`);
      if (data) {
        email = data as string;
        break;
      }
    }
    if (!email) throw new Error("Credenciais inválidas.");

    const { data, error } = await this.cliente.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) throw new Error(`signInWithPassword falhou: ${error?.message}`);
    this.id = data.user.id;
  }

  async perfil() {
    const { data: u } = await this.cliente.auth.getUser();
    if (!u.user) return null;
    const { data } = await this.cliente.from("profiles").select("*").eq("id", u.user.id).single();
    return data as { tipo: Papel; ativo: boolean; precisa_trocar_senha: boolean; nome: string } | null;
  }

  /** Espelha AuthContext.trocarSenha (tela /primeiro-acesso). */
  async trocarSenha(nova: string) {
    const { error } = await this.cliente.auth.updateUser({ password: nova });
    if (error) throw new Error(`updateUser falhou: ${error.message}`);
    const { error: rpc } = await this.cliente.rpc("marcar_senha_trocada");
    if (rpc) throw new Error(`marcar_senha_trocada falhou: ${rpc.message}`);
  }

  /** Espelha useAdmin.invocarAdmin, devolvendo também o status HTTP. */
  async admin<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<RespostaAdmin<T>> {
    const { data, error } = await this.cliente.functions.invoke("admin-usuarios", { body });
    if (!error) return { status: 200, dados: data as T, erro: null };
    const ctx = (error as { context?: Response }).context;
    let mensagem = error.message;
    let status = 0;
    if (ctx && typeof ctx.json === "function") {
      status = ctx.status;
      try {
        mensagem = (await ctx.json())?.error ?? mensagem;
      } catch {
        /* corpo não-JSON */
      }
    }
    return { status, dados: null, erro: mensagem };
  }

  async sair() {
    await this.cliente.auth.signOut();
  }
}

export function novoCliente(chave = ambiente.anonKey): SupabaseClient {
  return createClient(ambiente.url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Cliente com service_role: só para preparar o primeiro admin (como o SQL Editor faria). */
export function clienteServico(): SupabaseClient {
  return novoCliente(ambiente.serviceKey);
}
