/**
 * Teste E2E "consulta real": dois agentes — uma médica e um paciente — usam o
 * sistema do primeiro acesso até a receita, interagindo entre si. Dois
 * intrusos (médico sem vínculo e outro paciente) tentam ver o que não devem.
 *
 * Roda SOMENTE contra o Supabase local (e2e/lib/ambiente.ts recusa produção).
 * As consultas espelham as do front (hooks em src/hooks) para que um erro de
 * schema/RLS apareça aqui do mesmo jeito que apareceria na tela.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Agente, clienteServico, novoCliente } from "./lib/agentes";
import { diaBrasilia, email, gerarCPF, gerarCRM, horarioBrasilia, pdfFicticio, senhaForte } from "./lib/dados";

// Selects copiados dos hooks do front.
const CONSULTAS_SELECT = `*, paciente:pacientes(cpf, profile:profiles(nome, email)), medico:medicos(crm, especialidade, clinica_nome, profile:profiles(nome, email))`; // useConsultas
const PRESCRICOES_SELECT = `*, paciente:pacientes(profile:profiles(nome, email)), medico:medicos(crm, especialidade, clinica_nome, profile:profiles(nome, email))`; // usePrescricoes
const MEDICO_SELECT = "*, profile:profiles(nome, email, avatar_url)"; // usePacientes.useTodosMedicos
const ANAMNESE_PACIENTE_SELECT = "*, medico:medicos(crm, especialidade, profile:profiles(nome))"; // useAnamneses

// ── Elenco ────────────────────────────────────────────────────────────────
const admin = new Agente("Administração E2E", "admin");
const medica = new Agente("Dra. Helena Agente", "medico");
const paciente = new Agente("João Agente Paciente", "paciente");
const medicoIntruso = new Agente("Dr. Otávio Sem Vínculo", "medico");
const pacienteIntrusa = new Agente("Maria Intrusa", "paciente");

const cred = {
  admin: { email: email("admin"), senha: senhaForte() },
  medica: { crm: gerarCRM("SP"), email: email("medica"), temp: "", senha: senhaForte() },
  medicoIntruso: { crm: gerarCRM("RJ"), email: email("medico-intruso"), temp: "", senha: senhaForte() },
  paciente: { cpf: gerarCPF(), email: email("paciente"), temp: "", senha: senhaForte() },
  pacienteIntrusa: { cpf: gerarCPF(), email: email("paciente-intrusa"), temp: "", senha: senhaForte() },
};

const estado = {
  consultaId: "",
  consulta2Id: "",
  anamneseId: "",
  prescricaoId: "",
  docMedicaPath: "",
  docPacientePath: "",
};

async function notificacoes(agente: Agente) {
  const { data, error } = await agente.cliente
    .from("notificacoes")
    .select("*")
    .eq("user_id", agente.id)
    .order("created_at", { ascending: false });
  expect(error).toBeNull();
  return (data ?? []) as { titulo: string; mensagem: string; lida: boolean; tipo: string }[];
}

// ───────────────────────────────────────────────────────────────────────────
describe("1. Administração prepara o hospital", () => {
  it("[Admin] primeiro administrador é criado e entra pelo e-mail", async () => {
    const servico = clienteServico();
    const { error } = await servico.auth.admin.createUser({
      email: cred.admin.email,
      password: cred.admin.senha,
      email_confirm: true,
      app_metadata: { tipo: "admin", provisionado: true },
      user_metadata: { nome: admin.nome },
    });
    expect(error).toBeNull();
    await admin.entrar(cred.admin.email, cred.admin.senha);
    expect((await admin.perfil())?.tipo).toBe("admin");
  });

  it("[Admin] cria a médica, o paciente e os dois intrusos pela Edge Function", async () => {
    const contas = [
      { agente: medica, c: cred.medica, tipo: "medico", documento: cred.medica.crm.mascarado, especialidade: "Clínica Médica" },
      { agente: medicoIntruso, c: cred.medicoIntruso, tipo: "medico", documento: cred.medicoIntruso.crm.mascarado, especialidade: "Ortopedia" },
      { agente: paciente, c: cred.paciente, tipo: "paciente", documento: cred.paciente.cpf.mascarado },
      { agente: pacienteIntrusa, c: cred.pacienteIntrusa, tipo: "paciente", documento: cred.pacienteIntrusa.cpf.mascarado },
    ] as const;

    for (const conta of contas) {
      const r = await admin.admin<{ user_id: string; senha_temporaria: string }>({
        action: "criar",
        tipo: conta.tipo,
        nome: conta.agente.nome,
        email: conta.c.email,
        documento: conta.documento,
        especialidade: "especialidade" in conta ? conta.especialidade : undefined,
      });
      expect(r.erro, `criar ${conta.agente.nome}`).toBeNull();
      expect(r.dados?.senha_temporaria).toMatch(/^.{12,}$/);
      conta.c.temp = r.dados!.senha_temporaria;
    }
  }, 90_000);

  it("[Admin] o sistema recusa CPF inválido, CRM repetido e e-mail repetido", async () => {
    const cpfInvalido = await admin.admin({ action: "criar", tipo: "paciente", nome: "CPF Ruim", email: email("cpf-ruim"), documento: "111.111.111-11" });
    expect(cpfInvalido.status).toBe(400);
    expect(cpfInvalido.erro).toMatch(/CPF inválido/);

    const crmRepetido = await admin.admin({ action: "criar", tipo: "medico", nome: "CRM Repetido", email: email("crm-rep"), documento: cred.medica.crm.mascarado });
    expect(crmRepetido.status).toBe(409);

    const emailRepetido = await admin.admin({ action: "criar", tipo: "paciente", nome: "Email Repetido", email: cred.paciente.email, documento: gerarCPF().mascarado });
    expect(emailRepetido.status).toBe(409);
  });

  it("[Visitante] não consegue se cadastrar sozinho (nem como médico)", async () => {
    const { data, error } = await novoCliente().auth.signUp({
      email: email("autocadastro"),
      password: senhaForte(),
      options: { data: { tipo: "medico", nome: "Falso Médico", documento: "123456SP" } },
    });
    expect(error, "signup deveria estar desligado").not.toBeNull();
    expect(data.user).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("2. Primeiro acesso", () => {
  const casos = [
    { nome: "Médica", agente: medica, id: () => cred.medica.crm.mascarado, c: cred.medica },
    { nome: "Paciente", agente: paciente, id: () => cred.paciente.cpf.mascarado, c: cred.paciente },
    { nome: "Médico intruso", agente: medicoIntruso, id: () => cred.medicoIntruso.crm.mascarado, c: cred.medicoIntruso },
    { nome: "Paciente intrusa", agente: pacienteIntrusa, id: () => cred.pacienteIntrusa.cpf.mascarado, c: cred.pacienteIntrusa },
  ];

  for (const caso of casos) {
    it(`[${caso.nome}] entra com a senha temporária e é obrigado(a) a trocá-la`, async () => {
      await caso.agente.entrar(caso.id(), caso.c.temp);
      expect((await caso.agente.perfil())?.precisa_trocar_senha).toBe(true);
      await caso.agente.trocarSenha(caso.c.senha);
      expect((await caso.agente.perfil())?.precisa_trocar_senha).toBe(false);

      const outro = new Agente(caso.agente.nome, caso.agente.papel);
      await expect(outro.entrar(caso.id(), caso.c.temp), "senha temporária deveria ter deixado de valer").rejects.toThrow();
    });
  }

  it("[Paciente] entra digitando o CPF sem máscara também", async () => {
    const mesmo = new Agente(paciente.nome, "paciente");
    await mesmo.entrar(cred.paciente.cpf.digitos, cred.paciente.senha);
    expect(mesmo.id).toBe(paciente.id);
  });

  it("[Paciente] aceita os termos da LGPD", async () => {
    for (const tipo of ["termos_uso", "politica_privacidade", "tratamento_saude"]) {
      const { error } = await paciente.cliente.rpc("registrar_consentimento", {
        p_tipo: tipo,
        p_versao_termo: "1.0",
        p_aceito: true,
        p_ip_address: null,
        p_user_agent: "agente-e2e",
      });
      expect(error, tipo).toBeNull();
    }
    const { data, error } = await paciente.cliente.rpc("meus_consentimentos");
    expect(error).toBeNull();
    const aceitos = (data as { tipo: string; aceito: boolean }[]).filter((c) => c.aceito).map((c) => c.tipo);
    expect(aceitos).toEqual(expect.arrayContaining(["termos_uso", "politica_privacidade", "tratamento_saude"]));
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("3. Vínculo médico ↔ paciente", () => {
  it("[Paciente] vê o corpo clínico com o nome dos médicos", async () => {
    const { data, error } = await paciente.cliente.from("medicos").select(MEDICO_SELECT).order("especialidade");
    expect(error).toBeNull();
    const helena = data?.find((m) => m.id === medica.id);
    expect(helena, "médica deveria aparecer na lista").toBeTruthy();
    expect(helena?.profile?.nome, "paciente deveria ver o NOME da médica").toBe(medica.nome);
  });

  it("[Paciente] escolhe a Dra. Helena como médica responsável", async () => {
    const { error } = await paciente.cliente.from("pacientes").update({ medico_principal_id: medica.id }).eq("id", paciente.id);
    expect(error).toBeNull();
    const { data } = await paciente.cliente.from("pacientes").select("medico_principal_id").eq("id", paciente.id).single();
    expect(data?.medico_principal_id).toBe(medica.id);
  });

  it("[Paciente] não troca de médico sozinho, não muda o CPF e não vira médico", async () => {
    const troca = await paciente.cliente.from("pacientes").update({ medico_principal_id: medicoIntruso.id }).eq("id", paciente.id);
    expect(troca.error, "trocar médico responsável").not.toBeNull();

    const cpf = await paciente.cliente.from("pacientes").update({ cpf: gerarCPF().digitos }).eq("id", paciente.id);
    expect(cpf.error, "alterar CPF").not.toBeNull();

    const papel = await paciente.cliente.from("profiles").update({ tipo: "medico" }).eq("id", paciente.id);
    expect(papel.error, "virar médico").not.toBeNull();
  });

  it("[Médica] vê o paciente em 'meus pacientes'", async () => {
    const { data, error } = await medica.cliente.rpc("pacientes_do_medico");
    expect(error).toBeNull();
    const joao = (data as { id: string; nome: string }[]).find((p) => p.id === paciente.id);
    expect(joao?.nome).toBe(paciente.nome);
  });

  it("[Médico intruso] não consegue tomar o paciente da médica pelo CPF", async () => {
    const { error } = await medicoIntruso.cliente.rpc("vincular_paciente_por_cpf", { p_cpf: cred.paciente.cpf.digitos });
    expect(error?.message).toMatch(/já acompanhado/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("4. Agendamento", () => {
  it("[Paciente] vê a agenda livre da médica amanhã", async () => {
    const { data, error } = await paciente.cliente.rpc("horarios_ocupados", { p_medico: medica.id, p_dia: diaBrasilia(1) });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("[Paciente] solicita consulta para amanhã às 10:00", async () => {
    const { data, error } = await paciente.cliente
      .from("consultas")
      .insert({
        medico_id: medica.id,
        paciente_id: paciente.id,
        data_hora: horarioBrasilia(1, 10),
        tipo: "Consulta de rotina",
        observacoes: "Dor de cabeça há 5 dias",
        status: "Aguardando",
      })
      .select()
      .single();
    expect(error).toBeNull();
    estado.consultaId = data!.id;
  });

  it("[Paciente] não marca consulta já confirmada, no passado ou em nome de outra pessoa", async () => {
    const base = { medico_id: medica.id, tipo: "Retorno", status: "Aguardando" };
    const confirmada = await paciente.cliente.from("consultas").insert({ ...base, paciente_id: paciente.id, data_hora: horarioBrasilia(3, 9), status: "Confirmado" });
    expect(confirmada.error, "status Confirmado").not.toBeNull();
    const passado = await paciente.cliente.from("consultas").insert({ ...base, paciente_id: paciente.id, data_hora: horarioBrasilia(-1, 9) });
    expect(passado.error, "data no passado").not.toBeNull();
    const outra = await paciente.cliente.from("consultas").insert({ ...base, paciente_id: pacienteIntrusa.id, data_hora: horarioBrasilia(3, 9) });
    expect(outra.error, "em nome de outra pessoa").not.toBeNull();
  });

  it("[Paciente intrusa] não consegue o mesmo horário com a mesma médica", async () => {
    const { error } = await pacienteIntrusa.cliente.from("consultas").insert({
      medico_id: medica.id,
      paciente_id: pacienteIntrusa.id,
      data_hora: horarioBrasilia(1, 10),
      tipo: "Consulta de rotina",
      status: "Aguardando",
    });
    expect(error?.message).toMatch(/Horário indisponível/);
  });

  it("[Paciente] agora vê as 10:00 como ocupadas", async () => {
    const { data } = await paciente.cliente.rpc("horarios_ocupados", { p_medico: medica.id, p_dia: diaBrasilia(1) });
    expect((data as string[]).map((d) => new Date(d).toISOString())).toEqual([horarioBrasilia(1, 10)]);
  });

  it("[Médica] é notificada da solicitação", async () => {
    const n = await notificacoes(medica);
    expect(n.find((x) => x.titulo === "Nova solicitação de consulta")?.mensagem).toContain(paciente.nome);
  });

  it("[Médica] vê a consulta com o nome do paciente e confirma", async () => {
    const { data, error } = await medica.cliente.from("consultas").select(CONSULTAS_SELECT).eq("medico_id", medica.id);
    expect(error).toBeNull();
    const c = data?.find((x) => x.id === estado.consultaId);
    expect(c?.paciente?.profile?.nome).toBe(paciente.nome);
    const upd = await medica.cliente.from("consultas").update({ status: "Confirmado" }).eq("id", estado.consultaId);
    expect(upd.error).toBeNull();
  });

  it("[Paciente] é avisado da confirmação e vê o nome da médica na consulta", async () => {
    const n = await notificacoes(paciente);
    expect(n.some((x) => x.titulo === "Consulta Confirmado")).toBe(true);
    const { data } = await paciente.cliente.from("consultas").select(CONSULTAS_SELECT).eq("paciente_id", paciente.id);
    const c = data?.find((x) => x.id === estado.consultaId);
    expect(c?.status).toBe("Confirmado");
    expect(c?.medico?.profile?.nome, "paciente deveria ver o nome da médica").toBe(medica.nome);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("5. Atendimento e anamnese", () => {
  it("[Médica] abre o prontuário (acesso registrado) e inicia o atendimento", async () => {
    const log = await medica.cliente.rpc("log_audit_event", {
      p_action: "prontuario_visualizado",
      p_resource_type: "paciente",
      p_resource_id: paciente.id,
      p_target_user_id: paciente.id,
      p_metadata: {},
    });
    expect(log.error).toBeNull();
    const { error } = await medica.cliente.from("consultas").update({ status: "Em andamento" }).eq("id", estado.consultaId);
    expect(error).toBeNull();
  });

  it("[Médica] registra a anamnese completa ligada à consulta", async () => {
    const { data, error } = await medica.cliente
      .from("anamneses")
      .insert({
        medico_id: medica.id,
        paciente_id: paciente.id,
        consulta_id: estado.consultaId,
        queixa_principal: "Dor de cabeça há 5 dias",
        historia_doenca: "Cefaleia frontal, pior no fim da tarde, sem febre.",
        antecedentes_pessoais: "Nega cirurgias.",
        antecedentes_familiares: "Mãe hipertensa.",
        medicamentos_uso: "Nenhum.",
        alergias: "Dipirona",
        exame_fisico: "BEG, corado, hidratado.",
        hipotese_diagnostica: "R51 — Cefaleia",
        conduta: "Analgesia e retorno em 15 dias.",
        sinais_vitais: { pressao: "120/80", fc: "72", temp: "36,5" },
        patologias: ["Hipertensão"],
      })
      .select()
      .single();
    expect(error).toBeNull();
    estado.anamneseId = data!.id;
    await medica.cliente.rpc("log_audit_event", {
      p_action: "anamnese_criada",
      p_resource_type: "anamnese",
      p_resource_id: estado.anamneseId,
      p_target_user_id: paciente.id,
      p_metadata: {},
    });
  });

  it("[Médica] finaliza o atendimento", async () => {
    const { error } = await medica.cliente.from("consultas").update({ status: "Finalizado" }).eq("id", estado.consultaId);
    expect(error).toBeNull();
  });

  it("[Médica] corrige a anamnese em até 24h, mas não troca o paciente nem apaga", async () => {
    const corrige = await medica.cliente
      .from("anamneses")
      .update({ conduta: "Paracetamol 750 mg se dor. Retorno em 15 dias." })
      .eq("id", estado.anamneseId)
      .select();
    expect(corrige.error).toBeNull();
    expect(corrige.data).toHaveLength(1);

    const trocaPaciente = await medica.cliente.from("anamneses").update({ paciente_id: pacienteIntrusa.id }).eq("id", estado.anamneseId);
    expect(trocaPaciente.error, "trocar paciente da anamnese").not.toBeNull();

    await medica.cliente.from("anamneses").delete().eq("id", estado.anamneseId);
    const { count } = await medica.cliente.from("anamneses").select("id", { count: "exact", head: true }).eq("id", estado.anamneseId);
    expect(count, "anamnese não pode ser apagada").toBe(1);
  });

  it("[Paciente] vê a anamnese no prontuário, com o nome da médica", async () => {
    const { data, error } = await paciente.cliente.from("anamneses").select(ANAMNESE_PACIENTE_SELECT).eq("paciente_id", paciente.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].consulta_id).toBe(estado.consultaId);
    expect(data?.[0].medico?.profile?.nome, "paciente deveria ver quem o atendeu").toBe(medica.nome);
  });

  it("[Paciente] não consegue alterar nem apagar a própria anamnese", async () => {
    const upd = await paciente.cliente.from("anamneses").update({ queixa_principal: "editado" }).eq("id", estado.anamneseId).select();
    expect(upd.data ?? []).toHaveLength(0);
    const del = await paciente.cliente.from("anamneses").delete().eq("id", estado.anamneseId).select();
    expect(del.data ?? []).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("6. Receita", () => {
  it("[Médica] emite a receita do atendimento", async () => {
    const { data, error } = await medica.cliente
      .from("prescricoes")
      .insert({
        medico_id: medica.id,
        paciente_id: paciente.id,
        consulta_id: estado.consultaId,
        tipo_receita: "simples",
        status: "finalizada",
        medicamentos: [
          { id: randomUUID(), name: "Paracetamol", dosage: "750 mg", quantity: "10 comprimidos", posology: "1 comprimido a cada 6 horas se dor" },
        ],
      })
      .select()
      .single();
    expect(error).toBeNull();
    estado.prescricaoId = data!.id;
  });

  it("[Paciente] é avisado e vê a receita com o nome da médica", async () => {
    const n = await notificacoes(paciente);
    expect(n.some((x) => x.titulo === "Nova receita disponível")).toBe(true);
    const { data, error } = await paciente.cliente.from("prescricoes").select(PRESCRICOES_SELECT).eq("paciente_id", paciente.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].medico?.profile?.nome).toBe(medica.nome);
  });

  it("[Farmácia, sem login] valida a receita pelo QR sem ver dados sensíveis", async () => {
    const { data, error } = await novoCliente().rpc("validar_prescricao", { p_id: estado.prescricaoId });
    expect(error).toBeNull();
    const texto = JSON.stringify(data);
    expect(texto).toContain(medica.nome);
    expect(texto, "CPF do paciente não pode aparecer na validação pública").not.toContain(cred.paciente.cpf.digitos);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("7. Exames e documentos", () => {
  it("[Médica] anexa um exame ao prontuário do paciente", async () => {
    estado.docMedicaPath = `${paciente.id}/${randomUUID()}.pdf`;
    const up = await medica.cliente.storage.from("documentos").upload(estado.docMedicaPath, pdfFicticio("hemograma"), { contentType: "application/pdf" });
    expect(up.error).toBeNull();
    const { error } = await medica.cliente.from("documentos").insert({
      paciente_id: paciente.id,
      uploaded_by: medica.id,
      consulta_id: estado.consultaId,
      nome: "Hemograma completo",
      storage_path: estado.docMedicaPath,
      tipo_arquivo: "pdf",
      tamanho_bytes: 300,
      categoria: "exame_laboratorial",
      data_exame: diaBrasilia(0),
    });
    expect(error).toBeNull();
  });

  it("[Paciente] vê e baixa o exame", async () => {
    const { data, error } = await paciente.cliente.from("documentos").select("*").eq("paciente_id", paciente.id);
    expect(error).toBeNull();
    const doc = data?.find((d) => d.storage_path === estado.docMedicaPath);
    expect(doc?.nome).toBe("Hemograma completo");
    const assinado = await paciente.cliente.storage.from("documentos").createSignedUrl(estado.docMedicaPath, 60);
    expect(assinado.error).toBeNull();
    const resp = await fetch(assinado.data!.signedUrl);
    expect(resp.status).toBe(200);
    expect((await resp.text()).startsWith("%PDF")).toBe(true);
  });

  it("[Paciente] envia um laudo de fora e a médica é avisada", async () => {
    estado.docPacientePath = `${paciente.id}/${randomUUID()}.pdf`;
    const up = await paciente.cliente.storage.from("documentos").upload(estado.docPacientePath, pdfFicticio("laudo"), { contentType: "application/pdf" });
    expect(up.error).toBeNull();
    const { error } = await paciente.cliente.from("documentos").insert({
      paciente_id: paciente.id,
      uploaded_by: paciente.id,
      nome: "Laudo de raio-X",
      storage_path: estado.docPacientePath,
      tipo_arquivo: "pdf",
      tamanho_bytes: 300,
      categoria: "laudo",
    });
    expect(error).toBeNull();

    const { data } = await medica.cliente.from("documentos").select("*").eq("paciente_id", paciente.id);
    expect(data?.some((d) => d.storage_path === estado.docPacientePath)).toBe(true);
    const n = await notificacoes(medica);
    expect(n.some((x) => x.titulo === "Novo documento de paciente")).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("8. Cancelamento", () => {
  it("[Paciente] marca outra consulta, desiste e cancela; a médica é avisada", async () => {
    const { data, error } = await paciente.cliente
      .from("consultas")
      .insert({ medico_id: medica.id, paciente_id: paciente.id, data_hora: horarioBrasilia(2, 15), tipo: "Retorno", status: "Aguardando" })
      .select()
      .single();
    expect(error).toBeNull();
    estado.consulta2Id = data!.id;

    const cancel = await paciente.cliente.rpc("cancelar_consulta_paciente", { p_consulta: estado.consulta2Id });
    expect(cancel.error).toBeNull();

    const { data: c } = await paciente.cliente.from("consultas").select("status").eq("id", estado.consulta2Id).single();
    expect(c?.status).toBe("Cancelado");

    const n = await notificacoes(medica);
    expect(n.find((x) => x.titulo === "Consulta Cancelado")?.mensagem).toContain(paciente.nome);
  });

  it("[Paciente] não cancela uma consulta já realizada", async () => {
    const { error } = await paciente.cliente.rpc("cancelar_consulta_paciente", { p_consulta: estado.consultaId });
    expect(error?.message).toMatch(/não pode mais ser cancelada/);
  });

  it("[Paciente intrusa] não cancela consulta de outra pessoa", async () => {
    const { error } = await pacienteIntrusa.cliente.rpc("cancelar_consulta_paciente", { p_consulta: estado.consultaId });
    expect(error?.message).toMatch(/não encontrada/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("9. Privacidade — médico sem vínculo", () => {
  it("[Médico intruso] não tem o paciente na lista", async () => {
    const { data } = await medicoIntruso.cliente.rpc("pacientes_do_medico");
    expect((data as { id: string }[]).some((p) => p.id === paciente.id)).toBe(false);
  });

  it("[Médico intruso] não lê cadastro, consultas, anamneses, receitas nem documentos do paciente", async () => {
    for (const [tabela, coluna] of [
      ["pacientes", "id"],
      ["consultas", "paciente_id"],
      ["anamneses", "paciente_id"],
      ["prescricoes", "paciente_id"],
      ["documentos", "paciente_id"],
    ] as const) {
      const { data } = await medicoIntruso.cliente.from(tabela).select("id").eq(coluna, paciente.id);
      expect(data ?? [], tabela).toEqual([]);
    }
  });

  it("[Médico intruso] não registra anamnese para paciente que não é dele", async () => {
    const { error } = await medicoIntruso.cliente
      .from("anamneses")
      .insert({ medico_id: medicoIntruso.id, paciente_id: paciente.id, queixa_principal: "acesso indevido" });
    expect(error).not.toBeNull();
  });

  it("[Médico intruso] não vê nome nem e-mail do paciente", async () => {
    const { data } = await medicoIntruso.cliente.from("profiles").select("nome, email").eq("id", paciente.id);
    expect(data ?? [], "perfil de paciente sem vínculo deveria ser invisível").toEqual([]);
  });

  it("[Médico intruso] não abre o exame do paciente no storage", async () => {
    const { data } = await medicoIntruso.cliente.storage.from("documentos").download(estado.docMedicaPath);
    expect(data, "download de exame sem vínculo").toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("10. Privacidade — outra paciente", () => {
  it("[Paciente intrusa] não lê consultas, anamneses, receitas, documentos nem perfil do João", async () => {
    for (const [tabela, coluna] of [
      ["consultas", "paciente_id"],
      ["anamneses", "paciente_id"],
      ["prescricoes", "paciente_id"],
      ["documentos", "paciente_id"],
      ["pacientes", "id"],
      ["profiles", "id"],
    ] as const) {
      const { data } = await pacienteIntrusa.cliente.from(tabela).select("id").eq(coluna, paciente.id);
      expect(data ?? [], tabela).toEqual([]);
    }
  });

  it("[Paciente intrusa] não lista a pasta de arquivos do João", async () => {
    const { data } = await pacienteIntrusa.cliente.storage.from("documentos").list(paciente.id);
    expect(data ?? [], "listagem da pasta de outro paciente").toEqual([]);
  });

  it("[Paciente intrusa] não baixa o exame do João", async () => {
    const { data } = await pacienteIntrusa.cliente.storage.from("documentos").download(estado.docMedicaPath);
    expect(data, "download de arquivo de outro paciente").toBeNull();
  });

  it("[Paciente intrusa] não coloca arquivo na pasta do João", async () => {
    const { error } = await pacienteIntrusa.cliente.storage
      .from("documentos")
      .upload(`${paciente.id}/${randomUUID()}.pdf`, pdfFicticio("intruso"), { contentType: "application/pdf" });
    expect(error, "upload na pasta de outro paciente").not.toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("11. Auditoria LGPD", () => {
  it("[Paciente] vê em 'Meus acessos' que a médica abriu o prontuário e registrou a anamnese", async () => {
    const { data, error } = await paciente.cliente.rpc("meus_acessos", { p_limit: 50, p_offset: 0 });
    expect(error).toBeNull();
    const daMedica = (data as { action: string; actor_nome: string }[]).filter((a) => a.actor_nome === medica.nome).map((a) => a.action);
    expect(daMedica).toEqual(expect.arrayContaining(["prontuario_visualizado", "anamnese_criada"]));
  });

  it("[Admin] vê a criação das contas na trilha geral", async () => {
    const { data, error } = await admin.cliente.from("audit_logs").select("action").eq("action", "usuario_criado");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(4);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("12. Administração de contas", () => {
  it("[Médica] não consegue usar o painel administrativo", async () => {
    const r = await medica.admin({ action: "criar", tipo: "admin", nome: "Golpe", email: email("golpe") });
    expect(r.status).toBe(403);
  });

  it("[Admin] desativa a paciente intrusa e o login dela para de funcionar", async () => {
    const r = await admin.admin({ action: "definir_ativo", user_id: pacienteIntrusa.id, ativo: false });
    expect(r.erro).toBeNull();
    const tentativa = new Agente(pacienteIntrusa.nome, "paciente");
    await expect(tentativa.entrar(cred.pacienteIntrusa.cpf.mascarado, cred.pacienteIntrusa.senha)).rejects.toThrow();
  });

  it("[Admin] reativa e gera senha temporária; ela volta a precisar trocar a senha", async () => {
    expect((await admin.admin({ action: "definir_ativo", user_id: pacienteIntrusa.id, ativo: true })).erro).toBeNull();
    const r = await admin.admin<{ senha_temporaria: string }>({ action: "redefinir_senha", user_id: pacienteIntrusa.id });
    expect(r.erro).toBeNull();
    const volta = new Agente(pacienteIntrusa.nome, "paciente");
    await volta.entrar(cred.pacienteIntrusa.cpf.mascarado, r.dados!.senha_temporaria);
    expect((await volta.perfil())?.precisa_trocar_senha).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("13. Notificações e LGPD do paciente", () => {
  it("[Paciente] marca todas as notificações como lidas", async () => {
    const { error } = await paciente.cliente.rpc("marcar_todas_notificacoes_lidas");
    expect(error).toBeNull();
    expect((await notificacoes(paciente)).filter((n) => !n.lida)).toEqual([]);
  });

  it("[Paciente] pede o encerramento da conta e acompanha o pedido", async () => {
    const { error } = await paciente.cliente.rpc("solicitar_encerramento_conta", { p_motivo: "Teste E2E" });
    expect(error).toBeNull();
    const { data, error: e2 } = await paciente.cliente.rpc("minha_solicitacao_encerramento");
    expect(e2).toBeNull();
    expect(data).toBeTruthy();
  });
});
