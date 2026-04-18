import { ReactNode } from "react";
import { Search, Bell, LogOut, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import logoIcon from "@/assets/logo-icon.png";
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

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

function AppSidebar({ items }: { items: NavItem[] }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 [&>div]:bg-transparent"
      style={{
        background:
          "linear-gradient(180deg, hsl(267 45% 24%) 0%, hsl(267 50% 32%) 55%, hsl(270 45% 42%) 100%)",
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 py-5 border-b border-white/10 transition-all duration-300",
          collapsed ? "px-0 justify-center" : "px-4",
        )}
      >
        <img src={logoIcon} alt="Prontuário-Pro" className="w-9 h-9 flex-shrink-0" />
        <span
          className={cn(
            "text-white font-semibold text-[15px] tracking-tight whitespace-nowrap transition-all duration-200",
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
          )}
        >
          Prontuário-Pro
        </span>
      </div>

      <SidebarContent className={cn("pt-5 transition-all duration-300", collapsed ? "px-0" : "px-3")}>
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
                        "flex items-center rounded-xl text-sm font-medium text-white/65 transition-all duration-200 hover:bg-white/10 hover:text-white",
                        collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5",
                      )}
                      activeClassName="!bg-white/15 !text-white font-semibold shadow-[0_2px_10px_-2px_rgba(0,0,0,0.2)]"
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
      <div className={cn("mt-auto pb-4 transition-all duration-300", collapsed ? "px-0" : "px-3")}>
        <button
          onClick={() => signOut().then(() => navigate("/"))}
          className={cn(
            "w-full flex items-center rounded-xl text-sm font-medium text-white/55 transition-all duration-200 hover:bg-red-500/20 hover:text-red-200",
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
  const userRole = userRoleProp ?? (medico ? `CRM ${medico.crm}` : profile?.tipo === "paciente" ? "Paciente" : "");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar items={navItems} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-card border-b border-border">
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

            {/* Search */}
            <div className="hidden sm:flex items-center max-w-md flex-1 mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Buscar pacientes, consultas..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:bg-card"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {userName.charAt(0)}
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-foreground leading-tight">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
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
