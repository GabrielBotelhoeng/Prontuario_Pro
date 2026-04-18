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
