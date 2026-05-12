import { Home, FileText, FolderHeart, CalendarDays, ShieldCheck, History, Stethoscope, User, FileSearch, Pill, ClipboardList, Download, Upload, LogIn, AlertCircle } from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { useMeusAcessos } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { AuditLogRow } from "@/lib/database.types";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
  { title: "Privacidade", url: "/paciente/privacidade", icon: ShieldCheck },
  { title: "Acessos", url: "/paciente/acessos", icon: History },
];

const ACTION_LABEL: Record<string, string> = {
  prontuario_visualizado: "Visualizou seu prontuário",
  prescricao_criada: "Emitiu uma prescrição",
  prescricao_visualizada: "Visualizou uma prescrição",
  anamnese_criada: "Registrou uma anamnese",
  anamnese_visualizada: "Visualizou uma anamnese",
  consulta_visualizada: "Visualizou uma consulta",
  documento_baixado: "Baixou um documento",
  documento_enviado: "Enviou um documento",
  consentimento_aceito: "Consentimento registrado",
  consentimento_revogado: "Consentimento revogado",
  login_sucesso: "Login realizado",
  login_falha: "Tentativa de login",
};

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  prontuario_visualizado: FileSearch,
  prescricao_criada: Pill,
  prescricao_visualizada: Pill,
  anamnese_criada: ClipboardList,
  anamnese_visualizada: ClipboardList,
  consulta_visualizada: CalendarDays,
  documento_baixado: Download,
  documento_enviado: Upload,
  consentimento_aceito: ShieldCheck,
  consentimento_revogado: ShieldCheck,
  login_sucesso: LogIn,
  login_falha: AlertCircle,
};

function actorIcon(tipo: AuditLogRow["actor_tipo"]) {
  if (tipo === "medico") return Stethoscope;
  if (tipo === "paciente") return User;
  return AlertCircle;
}

export default function MeusAcessos() {
  const { data: acessos = [], isLoading } = useMeusAcessos(200);

  return (
    <DashboardLayout navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">
            LGPD · Art. 18 II
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Histórico de acessos aos seus dados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Veja quem acessou ou modificou suas informações pessoais e quando.
            A trilha é mantida pelo banco e não pode ser apagada.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : acessos.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
            <History className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-semibold mb-1">
              Nenhum acesso registrado ainda
            </p>
            <p className="text-sm text-muted-foreground">
              À medida que profissionais consultarem seus dados, os eventos
              aparecerão aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {acessos.map((a) => {
              const ActorIcon = actorIcon(a.actor_tipo);
              const ActionIcon = ACTION_ICON[a.action] ?? History;
              const label = ACTION_LABEL[a.action] ?? a.action;
              return (
                <li
                  key={a.id}
                  className="bg-card border border-border/40 rounded-2xl p-5 flex items-start gap-4 hover:border-primary/30 transition-colors"
                  style={{ boxShadow: "0 1px 12px -4px rgba(0,0,0,0.05)" }}
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ActionIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-foreground font-semibold text-[15px]">
                        {label}
                      </p>
                      <Badge
                        variant="secondary"
                        className="bg-muted/60 text-muted-foreground rounded-full text-[10px] inline-flex items-center gap-1"
                      >
                        <ActorIcon className="h-3 w-3" />
                        {a.actor_tipo === "medico"
                          ? "Médico"
                          : a.actor_tipo === "paciente"
                          ? "Você"
                          : "Sistema"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {a.actor_nome}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {format(
                        new Date(a.created_at),
                        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                        { locale: ptBR },
                      )}
                    </p>
                    {a.metadata &&
                      typeof a.metadata === "object" &&
                      Object.keys(a.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-[11px] text-primary cursor-pointer hover:underline">
                            Detalhes técnicos
                          </summary>
                          <pre className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 mt-1 overflow-x-auto">
                            {JSON.stringify(a.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
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
