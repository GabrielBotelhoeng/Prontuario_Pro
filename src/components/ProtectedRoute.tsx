import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/lib/database.types";
import PageLoader from "@/components/PageLoader";
import { homeFor } from "@/lib/rotas";

type Tipo = Profile["tipo"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTipo?: Tipo;
}

export default function ProtectedRoute({ children, requiredTipo }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (user && !profile)) return <PageLoader />;

  if (!user) return <Navigate to="/" replace />;

  // Conta provisionada pela administração: troca de senha obrigatória antes de tudo.
  if (profile?.precisa_trocar_senha && location.pathname !== "/primeiro-acesso") {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  if (requiredTipo && profile?.tipo !== requiredTipo) {
    return <Navigate to={homeFor(profile?.tipo)} replace />;
  }

  return <>{children}</>;
}
