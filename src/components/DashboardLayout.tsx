import { ReactNode } from "react";
import { Bell, LogOut, ChevronLeft, Check, Calendar, FileText, AlertTriangle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLockup, BrandMark } from "@/components/Brand";
import AvisoInatividade from "@/components/AvisoInatividade";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useNotificacoes,
  useMarcarNotificacaoLida,
  useMarcarTodasLidas,
} from "@/hooks/useNotificacoes";
import type { Notificacao } from "@/lib/database.types";

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

function AppSidebar({ items, onLogout }: { items: NavItem[]; onLogout: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-0 [&>div]:bg-sidebar">
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border transition-all duration-300",
          collapsed ? "px-0 justify-center" : "px-5",
        )}
      >
        {collapsed ? <BrandMark className="h-7 w-7 text-white" /> : <BrandLockup inverted />}
      </div>
      {!collapsed && <p className="eyebrow px-5 pt-6 text-sidebar-foreground/45">Navegação</p>}

      <SidebarContent className={cn("pt-3 transition-all duration-300", collapsed ? "px-0 pt-5" : "px-3")}>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-auto p-0 hover:bg-transparent active:bg-transparent">
                    <NavLink
                      to={item.url}
                      end
                      className={cn(
                        "relative flex items-center rounded-md text-sm font-medium text-sidebar-foreground/70 transition-colors duration-200 hover:bg-sidebar-accent hover:text-white",
                        "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-brass before:opacity-0 before:transition-opacity",
                        collapsed ? "justify-center w-10 h-10 mx-auto before:hidden" : "gap-3 px-3 py-2.5",
                      )}
                      activeClassName="!bg-sidebar-accent !text-white before:!opacity-100"
                    >
                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      <span
                        className={cn(
                          "transition-all duration-200 whitespace-nowrap",
                          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
                        )}
                      >
                        {item.title}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Logout at bottom */}
      <div className={cn("mt-auto border-t border-sidebar-border pb-4 pt-3 transition-all duration-300", collapsed ? "px-0" : "px-3")}>
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center rounded-md text-sm font-medium text-sidebar-foreground/55 transition-colors duration-200 hover:bg-destructive/20 hover:text-white",
            collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5",
          )}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          <span
            className={cn(
              "transition-all duration-200 whitespace-nowrap",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
            )}
          >
            Sair
          </span>
        </button>
      </div>
    </Sidebar>
  );
}

function NotificacaoIcon({ tipo }: { tipo: Notificacao["tipo"] }) {
  const map = {
    consulta: Calendar,
    receita: FileText,
    alerta: AlertTriangle,
    sistema: Info,
  } as const;
  const Icon = map[tipo] ?? Info;
  return <Icon className="h-4 w-4 text-primary flex-shrink-0" />;
}

function formatRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function NotificacoesBell() {
  const { data: notificacoes = [], isLoading } = useNotificacoes(10);
  const marcarLida = useMarcarNotificacaoLida();
  const marcarTodas = useMarcarTodasLidas();
  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const navigate = useNavigate();
  const { profile } = useAuth();

  // H1 (visibilidade) + H7 (eficiência): ao clicar, leva ao destino certo
  // baseado no tipo, papel do usuário e — quando aplicável — no título
  // (ex.: alerta "Novo documento de paciente" vai pra /medico/documentos
  // em vez do Painel de IA genérico).
  function destinoNotificacao(n: Notificacao): string | null {
    const isMedico = profile?.tipo === "medico";
    switch (n.tipo) {
      case "consulta":
        return isMedico ? "/medico/agenda" : "/paciente/agendamento";
      case "receita":
        return isMedico ? "/medico/prescricao" : "/paciente/receitas";
      case "alerta":
        if (isMedico && /documento/i.test(n.titulo)) return "/medico/documentos";
        return isMedico ? "/medico/painel-ia" : "/paciente/prontuario";
      case "sistema":
      default:
        return null;
    }
  }

  function handleClickNotificacao(n: Notificacao) {
    if (!n.lida) marcarLida.mutate(n.id);
    const destino = destinoNotificacao(n);
    if (destino) navigate(destino);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Notificações">
          <Bell className="h-[18px] w-[18px]" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            <p className="text-[11px] text-muted-foreground">
              {naoLidas === 0 ? "Tudo em dia" : `${naoLidas} não lida(s)`}
            </p>
          </div>
          {naoLidas > 0 && (
            <button
              onClick={() => marcarTodas.mutate()}
              disabled={marcarTodas.isPending}
              className="text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity inline-flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              Marcar todas
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma notificação ainda</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notificacoes.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClickNotificacao(n)}
                    className={cn(
                      "w-full flex gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                      !n.lida && "bg-primary/[0.03]",
                    )}
                  >
                    <div className="mt-0.5 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <NotificacaoIcon tipo={n.tipo} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-sm truncate",
                            n.lida ? "text-foreground/80 font-medium" : "text-foreground font-semibold",
                          )}
                        >
                          {n.titulo}
                        </p>
                        {!n.lida && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                        {n.mensagem}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatRelativo(n.created_at)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  userName?: string;
  userRole?: string;
}

export default function DashboardLayout({
  children,
  navItems,
  userName: userNameProp,
  userRole: userRoleProp,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { profile, medico, signOut } = useAuth();

  const userName = userNameProp ?? profile?.nome ?? "Usuário";
  const userRole =
    userRoleProp ??
    (medico ? `CRM ${medico.crm}` : profile?.tipo === "admin" ? "Administração" : profile?.tipo === "paciente" ? "Paciente" : "");
  const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar items={navItems} onLogout={handleLogout} />
        <AvisoInatividade />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 lg:px-8 bg-background/85 backdrop-blur-md border-b border-border">
            <div className="flex items-center gap-1.5">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                title="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            <p className="eyebrow hidden flex-1 px-6 sm:block">{dataHoje}</p>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <NotificacoesBell />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono text-xs font-medium tracking-wide">
                  {iniciais(userName)}
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-foreground leading-tight">{userName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{userRole}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
