import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/medico" element={<DashboardMedico />} />
          <Route path="/medico/prescricao" element={<PrescricaoDigital />} />
          <Route path="/medico/anamnese" element={<Anamnese />} />
          <Route path="/medico/agenda" element={<Agenda />} />
          <Route path="/medico/monitoramento" element={<PainelMonitoramento />} />
          <Route path="/medico/painel-ia" element={<PainelIA />} />
          <Route path="/paciente" element={<DashboardPaciente />} />
          <Route path="/paciente/prontuario" element={<MeuProntuario />} />
          <Route path="/paciente/agendamento" element={<AgendaPaciente />} />
          <Route path="/paciente/receitas" element={<ReceitasPaciente />} />
          <Route path="/paciente/especialistas" element={<Especialistas />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
