import { useState } from "react";
import { Home, FileText, FolderHeart, CalendarDays, Pill, ChevronRight, ShieldCheck, Copy, Stethoscope } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { usePrescricoesPaciente } from "@/hooks/usePrescricoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Prescricao, MedicamentoItem } from "@/lib/database.types";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

const tipoLabel: Record<string, string> = {
  simples: "Receita Simples",
  controle: "Controle Especial",
  branca: "Receituário Comum",
  azul: "Notificação B (Azul)",
  amarela: "Notificação A (Amarela)",
};

const BASE_VALIDACAO = "https://prontuario-pro.app/validar";

export default function ReceitasPaciente() {
  const { data: prescricoes = [], isLoading } = usePrescricoesPaciente();
  const { toast } = useToast();
  const [selecionada, setSelecionada] = useState<Prescricao | null>(null);

  const linkValidacao = selecionada ? `${BASE_VALIDACAO}/${selecionada.id}` : "";

  const handleCopiarLink = async () => {
    if (!linkValidacao) return;
    try {
      await navigator.clipboard.writeText(linkValidacao);
      toast({
        title: "Link copiado",
        description: "O link de validação foi copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Tente novamente ou copie manualmente.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Saúde</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Minhas Receitas</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico completo de prescrições médicas</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : prescricoes.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
            <Pill className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-1">Nenhuma receita ainda</p>
            <p className="text-sm text-muted-foreground">Suas receitas médicas aparecerão aqui após as consultas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prescricoes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelecionada(p)}
                className="w-full text-left bg-card border border-border/40 rounded-2xl p-5 flex items-center gap-5 hover:shadow-md hover:border-primary/30 transition-all duration-300"
                style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-foreground font-semibold text-[15px]">{tipoLabel[p.tipo_receita] ?? p.tipo_receita}</p>
                    {p.status === "finalizada" && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 rounded-full text-[10px]">Finalizada</Badge>}
                    {p.status === "rascunho" && <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 rounded-full text-[10px]">Rascunho</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.medico?.profile?.nome ?? "Médico"} · {p.medico?.especialidade}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Emitida em {format(new Date(p.data_emissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  {Array.isArray(p.medicamentos) && p.medicamentos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(p.medicamentos as MedicamentoItem[]).slice(0, 3).map((m, i) => (
                        <span key={i} className="text-[11px] bg-muted/60 border border-border/40 rounded-lg px-2 py-0.5 text-muted-foreground">{m.name} {m.dosage}</span>
                      ))}
                      {p.medicamentos.length > 3 && <span className="text-[11px] text-primary font-medium">+{p.medicamentos.length - 3} mais</span>}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selecionada} onOpenChange={(open) => !open && setSelecionada(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden">
          {selecionada && (
            <div className="flex flex-col max-h-[90vh]">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                      {tipoLabel[selecionada.tipo_receita] ?? selecionada.tipo_receita}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Emitida em {format(new Date(selecionada.data_emissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </DialogDescription>
                    <div className="mt-2">
                      <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 rounded-full text-[10px] font-semibold tracking-wide">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        ASSINADO DIGITALMENTE
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="overflow-y-auto px-6 py-5 space-y-5">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {selecionada.medico?.profile?.nome ?? "Médico"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selecionada.medico?.especialidade}
                      {selecionada.medico?.crm ? ` · CRM ${selecionada.medico.crm}` : ""}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Medicamentos prescritos
                  </p>
                  {Array.isArray(selecionada.medicamentos) && selecionada.medicamentos.length > 0 ? (
                    <div className="space-y-2.5">
                      {(selecionada.medicamentos as MedicamentoItem[]).map((m, i) => (
                        <div
                          key={m.id ?? i}
                          className="p-4 rounded-xl border border-border/50 bg-card"
                        >
                          <div className="flex items-baseline justify-between gap-3 mb-1.5">
                            <p className="text-sm font-semibold text-foreground">{m.name}</p>
                            <span className="text-xs font-medium text-primary tabular-nums">{m.dosage}</span>
                          </div>
                          {m.quantity && (
                            <p className="text-xs text-muted-foreground">Quantidade: {m.quantity}</p>
                          )}
                          {m.posology && (
                            <p className="text-xs text-foreground/70 mt-1 leading-relaxed">
                              <span className="font-medium text-foreground">Posologia: </span>
                              {m.posology}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum medicamento registrado.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
                  <div className="flex flex-col sm:flex-row gap-5 items-center">
                    <div className="bg-white p-3 rounded-xl border border-border/40 flex-shrink-0">
                      <QRCodeSVG
                        value={linkValidacao}
                        size={128}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                        Validação digital
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                        Escaneie o QR Code ou use o link para verificar a autenticidade desta receita.
                      </p>
                      <Button
                        onClick={handleCopiarLink}
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        Copiar link de validação
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
