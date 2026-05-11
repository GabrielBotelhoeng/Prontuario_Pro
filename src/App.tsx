import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageLoader from "@/components/PageLoader";

const Index = lazy(() => import("./pages/Index.tsx"));
const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha.tsx"));
const ResetSenha = lazy(() => import("./pages/ResetSenha.tsx"));
const Cadastro = lazy(() => import("./pages/Cadastro.tsx"));
const ValidarReceita = lazy(() => import("./pages/ValidarReceita.tsx"));
const DashboardMedico = lazy(() => import("./pages/DashboardMedico.tsx"));
const DashboardPaciente = lazy(() => import("./pages/DashboardPaciente.tsx"));
const PrescricaoDigital = lazy(() => import("./pages/PrescricaoDigital.tsx"));
const Anamnese = lazy(() => import("./pages/Anamnese.tsx"));
const Agenda = lazy(() => import("./pages/Agenda.tsx"));
const PainelMonitoramento = lazy(() => import("./pages/PainelMonitoramento.tsx"));
const PainelIA = lazy(() => import("./pages/PainelIA.tsx"));
const MeuProntuario = lazy(() => import("./pages/MeuProntuario.tsx"));
const AgendaPaciente = lazy(() => import("./pages/AgendaPaciente.tsx"));
const ReceitasPaciente = lazy(() => import("./pages/ReceitasPaciente.tsx"));
const Especialistas = lazy(() => import("./pages/Especialistas.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Públicas */}
                <Route path="/" element={<Index />} />
                <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                <Route path="/reset-senha" element={<ResetSenha />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/validar/:id" element={<ValidarReceita />} />

                {/* Médico */}
                <Route path="/medico" element={<ProtectedRoute requiredTipo="medico"><DashboardMedico /></ProtectedRoute>} />
                <Route path="/medico/prescricao" element={<ProtectedRoute requiredTipo="medico"><PrescricaoDigital /></ProtectedRoute>} />
                <Route path="/medico/anamnese" element={<ProtectedRoute requiredTipo="medico"><Anamnese /></ProtectedRoute>} />
                <Route path="/medico/agenda" element={<ProtectedRoute requiredTipo="medico"><Agenda /></ProtectedRoute>} />
                <Route path="/medico/monitoramento" element={<ProtectedRoute requiredTipo="medico"><PainelMonitoramento /></ProtectedRoute>} />
                <Route path="/medico/painel-ia" element={<ProtectedRoute requiredTipo="medico"><PainelIA /></ProtectedRoute>} />

                {/* Paciente */}
                <Route path="/paciente" element={<ProtectedRoute requiredTipo="paciente"><DashboardPaciente /></ProtectedRoute>} />
                <Route path="/paciente/prontuario" element={<ProtectedRoute requiredTipo="paciente"><MeuProntuario /></ProtectedRoute>} />
                <Route path="/paciente/agendamento" element={<ProtectedRoute requiredTipo="paciente"><AgendaPaciente /></ProtectedRoute>} />
                <Route path="/paciente/receitas" element={<ProtectedRoute requiredTipo="paciente"><ReceitasPaciente /></ProtectedRoute>} />
                <Route path="/paciente/especialistas" element={<ProtectedRoute requiredTipo="paciente"><Especialistas /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
