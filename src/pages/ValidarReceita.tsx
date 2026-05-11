import { useParams, Link } from "react-router-dom";
import { ShieldCheck, ShieldX, Pill, Stethoscope, Calendar, Building2, ArrowLeft, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useValidarPrescricao } from "@/hooks/usePrescricoes";
import logoIcon from "@/assets/logo-icon.png";

const tipoLabel: Record<string, string> = {
  simples: "Receita Simples",
  controle: "Controle Especial",
  branca: "Receituário Comum",
  azul: "Notificação B (Azul)",
  amarela: "Notificação A (Amarela)",
};

export default function ValidarReceita() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useValidarPrescricao(id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-primary/5">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors">
            <img src={logoIcon} alt="Prontuário Pro" className="h-8 w-8" />
            <span className="font-bold tracking-tight">Prontuário Pro</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Início
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Validação Pública</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Verificação de Receita</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Confira a autenticidade desta prescrição médica
          </p>
        </div>

        {isLoading && (
          <div className="bg-card border border-border/40 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Consultando registro...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-card border border-destructive/30 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Erro ao consultar</h2>
            <p className="text-sm text-muted-foreground">Não foi possível consultar este registro no momento. Tente novamente em instantes.</p>
          </div>
        )}

        {!isLoading && !error && !data && (
          <div className="bg-card border border-amber-500/30 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldX className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Receita não encontrada</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nenhuma prescrição finalizada foi localizada com este identificador.
              Verifique se o QR Code está correto ou se a receita ainda não foi finalizada pelo médico.
            </p>
          </div>
        )}

        {!isLoading && data && (
          <div className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-500/20 px-6 py-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Receita autêntica</p>
                <p className="text-sm text-foreground/80 mt-0.5">
                  Registro confirmado no sistema · ID <span className="font-mono text-[11px] text-muted-foreground">{data.id.slice(0, 8)}</span>
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{tipoLabel[data.tipo_receita] ?? data.tipo_receita}</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 rounded-full text-[10px] font-semibold tracking-wide">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  FINALIZADA
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Data de emissão</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(data.data_emissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Paciente</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {data.paciente_primeiro_nome}
                    <span className="text-muted-foreground font-normal"> (primeiro nome)</span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Médico responsável</p>
                </div>
                <p className="text-base font-semibold text-foreground">{data.medico.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.medico.especialidade} · CRM {data.medico.crm}
                </p>
                {data.medico.clinica_nome && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    {data.medico.clinica_nome}
                  </p>
                )}
              </div>

              {Array.isArray(data.medicamentos) && data.medicamentos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Medicamentos prescritos
                  </p>
                  <div className="space-y-2.5">
                    {data.medicamentos.map((m, i) => (
                      <div key={m.id ?? i} className="p-4 rounded-xl border border-border/50 bg-card">
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
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border/40 bg-muted/30">
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Esta página confirma apenas o registro eletrônico no sistema Prontuário Pro.
                A validade jurídica da prescrição depende do certificado digital do profissional emissor.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
