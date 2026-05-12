import { useState } from "react";
import { Home, FileText, FolderHeart, CalendarDays, ShieldCheck, History, FileCheck2, FileX2, AlertTriangle } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useMeusConsentimentos,
  useRegistrarConsentimento,
  TERMOS_VERSAO,
} from "@/hooks/useConsentimentos";
import {
  useMinhaSolicitacaoEncerramento,
  useSolicitarEncerramento,
} from "@/hooks/useEncerramentoConta";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ConsentimentoTipo } from "@/lib/database.types";

const CONFIRMACAO_ENCERRAMENTO = "ENCERRAR";

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
  const { data: solicitacao } = useMinhaSolicitacaoEncerramento();
  const solicitar = useSolicitarEncerramento();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [encerrarOpen, setEncerrarOpen] = useState(false);
  const [motivoEncerrar, setMotivoEncerrar] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const indice = new Map(consentimentos.map((c) => [c.tipo, c]));
  const temPedidoPendente = solicitacao?.status === "pendente";

  const handleEncerrar = async () => {
    if (confirmText.trim() !== CONFIRMACAO_ENCERRAMENTO) return;
    try {
      await solicitar.mutateAsync(motivoEncerrar.trim() || null);
      toast({
        title: "Solicitação registrada",
        description:
          "Seu pedido de encerramento foi enviado. Você será desconectado agora.",
      });
      setEncerrarOpen(false);
      // Aguarda um tick para o toast renderizar antes do signOut redirecionar.
      setTimeout(() => {
        signOut();
      }, 800);
    } catch (err) {
      toast({
        title: "Não foi possível encerrar",
        description:
          err instanceof Error ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

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

        {/* Encerramento de conta — LGPD art. 18 VI */}
        <div
          className="bg-card border border-destructive/30 rounded-2xl p-6 mt-8"
          style={{ boxShadow: "0 1px 12px -4px rgba(220,38,38,0.08)" }}
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground font-semibold text-[15px] mb-1">
                Encerrar minha conta
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Você pode solicitar o encerramento da sua conta a qualquer
                momento (LGPD art. 18, inciso VI). O pedido é registrado e
                processado pela equipe — dados clínicos com retenção legal
                obrigatória (CFM 1.821/2007) podem permanecer anonimizados.
              </p>

              {temPedidoPendente ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-800">
                    Solicitação pendente
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Pedido registrado em{" "}
                    {format(
                      new Date(solicitacao!.criado_em),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR },
                    )}
                    . Aguardando processamento.
                  </p>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setMotivoEncerrar("");
                    setConfirmText("");
                    setEncerrarOpen(true);
                  }}
                  className="rounded-lg"
                >
                  Solicitar encerramento
                </Button>
              )}

              {solicitacao && !temPedidoPendente && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Última solicitação ({solicitacao.status}) em{" "}
                  {format(
                    new Date(solicitacao.criado_em),
                    "dd/MM/yyyy",
                    { locale: ptBR },
                  )}
                  .
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={encerrarOpen} onOpenChange={setEncerrarOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Encerrar conta
            </DialogTitle>
            <DialogDescription>
              Esta ação registrará formalmente seu pedido de encerramento e
              fará logout imediato. Você não conseguirá acessar a conta após
              confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Motivo (opcional)
              </Label>
              <Textarea
                placeholder="Por que está encerrando? Sua resposta nos ajuda a melhorar."
                value={motivoEncerrar}
                onChange={(e) => setMotivoEncerrar(e.target.value)}
                className="min-h-[80px] rounded-xl resize-none"
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Digite{" "}
                <span className="text-destructive font-bold">
                  {CONFIRMACAO_ENCERRAMENTO}
                </span>{" "}
                para confirmar
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRMACAO_ENCERRAMENTO}
                className="h-10 rounded-xl"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEncerrarOpen(false)}
              disabled={solicitar.isPending}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleEncerrar}
              disabled={
                solicitar.isPending ||
                confirmText.trim() !== CONFIRMACAO_ENCERRAMENTO
              }
              className="rounded-xl gap-2"
            >
              {solicitar.isPending && (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {solicitar.isPending ? "Enviando..." : "Confirmar encerramento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
