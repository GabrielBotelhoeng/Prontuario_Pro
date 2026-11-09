import { ScrollText, Users } from "lucide-react";
import type { NavItem } from "@/components/DashboardLayout";

export const adminNavItems: NavItem[] = [
  { title: "Contas", url: "/admin", icon: Users },
  { title: "Auditoria", url: "/admin/auditoria", icon: ScrollText },
];
