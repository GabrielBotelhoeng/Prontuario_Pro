import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTipo?: "medico" | "paciente";
}

export default function ProtectedRoute({ children, requiredTipo }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (requiredTipo && profile?.tipo !== requiredTipo) {
    return <Navigate to={profile?.tipo === "medico" ? "/medico" : "/paciente"} replace />;
  }

  return <>{children}</>;
}
