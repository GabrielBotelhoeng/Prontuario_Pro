// Edge Function: admin-usuarios
// Provisionamento de contas pela administração do hospital.
// Só aceita chamadas de usuários com profiles.tipo = 'admin' e ativo.
//
// Ações (POST JSON):
//   { action: "criar", tipo, nome, email, documento?, especialidade? }
//   { action: "redefinir_senha", user_id }
//   { action: "definir_ativo", user_id, ativo }
//
// Senhas temporárias são geradas aqui e devolvidas UMA vez; o usuário
// é obrigado a trocá-las no primeiro acesso (precisa_trocar_senha).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Tipo = "medico" | "paciente" | "admin";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function senhaTemporaria(): string {
  // 12 caracteres sem ambíguos (0/O, 1/l/I) + garantia de dígito e maiúscula
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const corpo = Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
  return corpo + "A7";
}

function somenteDigitos(v: string) {
  return v.replace(/\D/g, "");
}

function cpfValido(cpf: string): boolean {
  const c = somenteDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(c[i]) * (len + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // ── Autorização: chamador precisa ser admin ativo
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return json({ error: "Não autenticado." }, 401);

  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !caller?.user) return json({ error: "Sessão inválida." }, 401);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("tipo, ativo")
    .eq("id", caller.user.id)
    .single();

  if (callerProfile?.tipo !== "admin" || !callerProfile?.ativo) {
    return json({ error: "Acesso restrito à administração." }, 403);
  }

  const audit = (action: string, target: string | null, metadata: Record<string, unknown>) =>
    admin.from("audit_logs").insert({
      actor_id: caller.user.id,
      actor_tipo: "admin",
      action,
      resource_type: "usuario",
      resource_id: target,
      target_user_id: target,
      metadata,
    });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  try {
    switch (body.action) {
      case "criar": {
        const tipo = body.tipo as Tipo;
        const nome = String(body.nome ?? "").trim();
        const email = String(body.email ?? "").trim().toLowerCase();
        const documentoBruto = String(body.documento ?? "").trim();
        const especialidade = String(body.especialidade ?? "Clínica Geral").trim();

        if (!["medico", "paciente", "admin"].includes(tipo)) return json({ error: "Tipo inválido." }, 400);
        if (nome.length < 3) return json({ error: "Informe o nome completo." }, 400);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail inválido." }, 400);

        let documento = "";
        if (tipo === "paciente") {
          if (!cpfValido(documentoBruto)) return json({ error: "CPF inválido." }, 400);
          documento = somenteDigitos(documentoBruto);
          const { data: dup } = await admin.from("pacientes").select("id").eq("cpf", documento).maybeSingle();
          if (dup) return json({ error: "Já existe paciente com este CPF." }, 409);
        } else if (tipo === "medico") {
          documento = documentoBruto.toUpperCase().replace(/[^0-9A-Z]/g, "");
          if (!/^\d{4,6}[A-Z]{2}$/.test(documento)) {
            return json({ error: "CRM inválido. Use o formato 123456/UF." }, 400);
          }
          const { data: dup } = await admin.from("medicos").select("id").eq("crm", documento).maybeSingle();
          if (dup) return json({ error: "Já existe médico com este CRM." }, 409);
        }

        const senha = senhaTemporaria();
        const { data: created, error } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          app_metadata: { tipo, provisionado: true, precisa_trocar_senha: true },
          user_metadata: { nome, documento, especialidade },
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already") || msg.includes("registered")) {
            return json({ error: "E-mail já cadastrado." }, 409);
          }
          throw error;
        }

        await audit("usuario_criado", created.user.id, { tipo });
        return json({ user_id: created.user.id, senha_temporaria: senha });
      }

      case "redefinir_senha": {
        const userId = String(body.user_id ?? "");
        const senha = senhaTemporaria();
        const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
        if (error) throw error;
        await admin.from("profiles").update({ precisa_trocar_senha: true }).eq("id", userId);
        await audit("senha_redefinida", userId, {});
        return json({ senha_temporaria: senha });
      }

      case "definir_ativo": {
        const userId = String(body.user_id ?? "");
        const ativo = Boolean(body.ativo);
        if (userId === caller.user.id) return json({ error: "Você não pode desativar a própria conta." }, 400);
        const { error } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: ativo ? "none" : "876000h",
        });
        if (error) throw error;
        await admin.from("profiles").update({ ativo }).eq("id", userId);
        await audit(ativo ? "usuario_reativado" : "usuario_desativado", userId, {});
        return json({ ok: true });
      }

      default:
        return json({ error: "Ação desconhecida." }, 400);
    }
  } catch (err) {
    console.error("[admin-usuarios]", err);
    return json({ error: "Falha ao processar a solicitação." }, 500);
  }
});
