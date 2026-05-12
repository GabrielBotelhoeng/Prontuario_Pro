import { Home, FileText, FolderHeart, CalendarDays, ShieldCheck, History, FileCheck2, FileX2 } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useMeusConsentimentos,
  useRegistrarConsentimento,
  TERMOS_VERSAO,
} from "@/hooks/useConsentimentos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ConsentimentoTipo } from "@/lib/database.types";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
  { title: "Privacidade", url: "/paciente/privacidade", icon: ShieldCheck },
  { title: "Acessos", url: "/paciente/acessos", icon: History },
];

interface TermoConfig {
  tipo: ConsentimentoTipo;
  titulo: string;
  descricao: string;
  obrigatorio: boolean;
  resumo: string;
}

const TERMOS: TermoConfig[] = [
  {
    tipo: "termos_uso",
    titulo: "Termos de Uso",
    descricao: "Regras gerais de utilização da plataforma Prontuário-Pro.",
    obrigatorio: true,
    resumo:
      "Define direitos e deveres do usuário ao usar o sistema, limites de responsabilidade e regras de conduta.",
  },
  {
    tipo: "politica_privacidade",
    titulo: "Política de Privacidade",
    descricao:
      "Como coletamos, usamos e protegemos seus dados pessoais (LGPD).",
    obrigatorio: true,
    resumo:
      "Detalha quais dados tratamos, com quais bases legais, por quanto tempo e quais são seus direitos como titular.",
  },
  {
    tipo: "tratamento_saude",
    titulo: "Tratamento de dados de saúde",
    descricao:
      "Autorização para tratamento de dados sensíveis de saúde (LGPD art. 11).",
    obrigatorio: true,
    resumo:
      "Necessário para que médicos vinculados possam registrar prontuários, prescrições e anamneses. Sem isso o sistema não funciona.",
  },
  {
    tipo: "compartilhamento_medicos",
    titulo: "Compartilhamento com médicos vinculados",
    descricao:
      "Permite que médicos com quem você consultou acessem seu histórico.",
    obrigatorio: false,
    resumo:
      "Pode ser revogado a qualquer momento — médicos só verão suas próprias consultas com você se revogar este consentimento.",
  },
  {
    tipo: "comunicacoes_marketing",
    titulo: "Comunicações de marketing",
    descricao:
      "Receber e-mails sobre novidades, dicas de saúde e promoções.",
    obrigatorio: false,
    resumo:
      "Comunicações não essenciais. Você pode aceitar ou recusar sem prejuízo ao uso da plataforma.",
  },
];

export default function Privacidade() {
  const { data: consentimentos = [], isLoading } = useMeusConsentimentos();
  const registrar = useRegistrarConsentimento();
  const { toast } = useToast();

  const indice = new Map(consentimentos.map((c) => [c.tipo, c]));

  const handleAlternar = async (tipo: ConsentimentoTipo, aceitar: boolean) => {
    try {
      await registrar.mutateAsync({ tipo, aceito: aceitar });
      toast({
        title: aceitar ? "Consentimento registrado" : "Consentimento revogado",
        description: aceitar
          ? "Sua autorização foi salva."
          : "Sua revogação foi salva e auditada.",
      });
    } catch (err) {
      toast({
        title: "Não foi possível atualizar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">
            LGPD · Art. 8º
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Privacidade e consentimentos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as autorizações de uso dos seus dados. Você pode revogar
            consentimentos opcionais a qualquer momento.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <ul className="space-y-3">
            {TERMOS.map((termo) => {
              const atual = indice.get(termo.tipo);
              const aceito = !!atual?.aceito;
              const versaoCorrente = TERMOS_VERSAO[termo.tipo];
              const versaoDesatualizada =
                atual && atual.versao_termo !== versaoCorrente;

              return (
                <li
                  key={termo.tipo}
                  className="bg-card border border-border/40 rounded-2xl p-6"
                  style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={
                        aceito
                          ? "w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0"
                          : "w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"
                      }
                    >
                      {aceito ? (
                        <FileCheck2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <FileX2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-foreground font-semibold text-[15px]">
                          {termo.titulo}
                        </h3>
                        {termo.obrigatorio && (
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary rounded-full text-[10px]"
                          >
                            Obrigatório
                          </Badge>
                        )}
                        {aceito ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-700 rounded-full text-[10px]"
                          >
                            Aceito
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground rounded-full text-[10px]"
                          >
                            Não aceito
                          </Badge>
                        )}
                        {versaoDesatualizada && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/10 text-amber-700 rounded-full text-[10px]"
                          >
                            Versão antiga ({atual?.versao_termo})
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {termo.descricao}
                      </p>
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        {termo.resumo}
                      </p>

                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <p className="text-[11px] text-muted-foreground">
                          Versão atual do termo:{" "}
                          <span className="font-medium text-foreground">
                            {versaoCorrente}
                          </span>
                        </p>
                        {atual && (
                          <p className="text-[11px] text-muted-foreground">
                            ·{" "}
                            {aceito ? "Aceito em " : "Revogado em "}
                            {format(
                              new Date(
                                aceito
                                  ? atual.criado_em
                                  : atual.revogado_em ?? atual.criado_em,
                              ),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR },
                            )}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2 flex-wrap">
                        {aceito ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              registrar.isPending ||
                              (termo.obrigatorio && !versaoDesatualizada)
                            }
                            onClick={() => handleAlternar(termo.tipo, false)}
                            className="rounded-lg"
                          >
                            Revogar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={registrar.isPending}
                            onClick={() => handleAlternar(termo.tipo, true)}
                            className="rounded-lg"
                          >
                            Aceitar
                          </Button>
                        )}
                        {versaoDesatualizada && (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={registrar.isPending}
                            onClick={() => handleAlternar(termo.tipo, true)}
                            className="rounded-lg"
                          >
                            Reaceitar versão {versaoCorrente}
                          </Button>
                        )}
                      </div>
                      {termo.obrigatorio && aceito && !versaoDesatualizada && (
                        <p className="text-[11px] text-muted-foreground/70 mt-2 italic">
                          Este consentimento é obrigatório para o funcionamento
                          do sistema e não pode ser revogado sem encerrar a
                          conta.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
