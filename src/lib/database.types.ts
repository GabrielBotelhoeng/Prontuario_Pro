export interface Profile {
  id: string;
  nome: string;
  email: string;
  tipo: "medico" | "paciente";
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Medico {
  id: string;
  crm: string;
  especialidade: string;
  clinica_nome: string | null;
  clinica_endereco: string | null;
  clinica_cnpj: string | null;
  bio: string | null;
  profile?: Profile;
}

export interface Paciente {
  id: string;
  cpf: string;
  data_nascimento: string | null;
  peso: number | null;
  altura: number | null;
  tipo_sanguineo: string | null;
  alergias: string[] | null;
  medico_principal_id: string | null;
  profile?: Profile;
}

export interface Consulta {
  id: string;
  medico_id: string;
  paciente_id: string;
  data_hora: string;
  status: "Confirmado" | "Aguardando" | "Finalizado" | "Em andamento" | "Cancelado";
  tipo: string;
  observacoes: string | null;
  created_at: string;
  medico?: { crm: string; especialidade: string; profile: Profile };
  paciente?: { cpf: string; profile: Profile };
}

export interface MedicamentoItem {
  id: string;
  name: string;
  dosage: string;
  quantity: string;
  posology: string;
}

export interface Prescricao {
  id: string;
  medico_id: string;
  paciente_id: string;
  consulta_id: string | null;
  tipo_receita: "simples" | "controle" | "branca" | "azul" | "amarela";
  medicamentos: MedicamentoItem[];
  status: "rascunho" | "finalizada";
  data_emissao: string;
  created_at: string;
  medico?: { crm: string; especialidade: string; clinica_nome: string | null; profile: Profile };
  paciente?: { profile: Profile };
}

export interface Anamnese {
  id: string;
  medico_id: string;
  paciente_id: string;
  consulta_id: string | null;
  queixa_principal: string | null;
  historia_doenca: string | null;
  antecedentes_pessoais: string | null;
  antecedentes_familiares: string | null;
  medicamentos_uso: string | null;
  alergias: string | null;
  exame_fisico: string | null;
  hipotese_diagnostica: string | null;
  conduta: string | null;
  sinais_vitais: {
    pressao?: string;
    fc?: string;
    temp?: string;
    peso?: string;
  } | null;
  patologias: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Notificacao {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  tipo: "consulta" | "receita" | "alerta" | "sistema";
  created_at: string;
}

export interface Documento {
  id: string;
  paciente_id: string;
  uploaded_by: string;
  consulta_id: string | null;
  nome: string;
  storage_path: string;
  tipo_arquivo: "pdf" | "jpg" | "jpeg" | "png";
  tamanho_bytes: number | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// LGPD — Auditoria e consentimentos (migrations 013/014)
// ─────────────────────────────────────────────────────────────

export type AuditAction =
  | "prontuario_visualizado"
  | "prescricao_criada"
  | "prescricao_visualizada"
  | "anamnese_criada"
  | "anamnese_visualizada"
  | "consulta_visualizada"
  | "documento_baixado"
  | "documento_enviado"
  | "consentimento_aceito"
  | "consentimento_revogado"
  | "login_sucesso"
  | "login_falha";

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_tipo: "medico" | "paciente" | "system" | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Linha retornada pela RPC meus_acessos — inclui nome do ator. */
export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_nome: string;
  actor_tipo: "medico" | "paciente" | "system" | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type ConsentimentoTipo =
  | "termos_uso"
  | "politica_privacidade"
  | "tratamento_saude"
  | "compartilhamento_medicos"
  | "comunicacoes_marketing";

export interface Consentimento {
  id: string;
  user_id: string;
  tipo: ConsentimentoTipo | string;
  versao_termo: string;
  aceito: boolean;
  ip_address: string | null;
  user_agent: string | null;
  criado_em: string;
  revogado_em: string | null;
}

/** Linha retornada pela RPC meus_consentimentos (vigente por tipo). */
export interface ConsentimentoRow {
  id: string;
  tipo: ConsentimentoTipo | string;
  versao_termo: string;
  aceito: boolean;
  criado_em: string;
  revogado_em: string | null;
}
