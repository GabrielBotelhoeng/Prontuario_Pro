import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import EsqueciSenha from "./pages/EsqueciSenha.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import DashboardMedico from "./pages/DashboardMedico.tsx";
import DashboardPaciente from "./pages/DashboardPaciente.tsx";
import PrescricaoDigital from "./pages/PrescricaoDigital.tsx";
import Anamnese from "./pages/Anamnese.tsx";
import Agenda from "./pages/Agenda.tsx";
import PainelMonitoramento from "./pages/PainelMonitoramento.tsx";
import PainelIA from "./pages/PainelIA.tsx";
import MeuProntuario from "./pages/MeuProntuario.tsx";
import AgendaPaciente from "./pages/AgendaPaciente.tsx";
import ReceitasPaciente from "./pages/ReceitasPaciente.tsx";
import Especialistas from "./pages/Especialistas.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Index />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/cadastro" element={<Cadastro />} />

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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
