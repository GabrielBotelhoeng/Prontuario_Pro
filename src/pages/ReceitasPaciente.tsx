import {
  Home,
  FileText,
  FolderHeart,
  CalendarDays,
  Download,
  QrCode,
  Pill,
  Calendar,
  User,
  ExternalLink,
  Filter,
  Search,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

const prescriptions = [
  {
    id: "1",
    doctor: "Dr. Carlos Henrique",
    specialty: "Clínica Geral",
    date: "10/04/2026",
    expiryDate: "10/05/2026",
    type: "Receita de Controle Especial",
    medications: ["Sertralina 50mg", "Clonazepam 2mg"],
    status: "Ativa",
    isControlled: true,
  },
  {
    id: "2",
    doctor: "Dra. Ana Beatriz",
    specialty: "Ginecologia",
    date: "15/03/2026",
    expiryDate: null,
    type: "Receita Simples",
    medications: ["Ácido Fólico 5mg"],
    status: "Finalizada",
    isControlled: false,
  },
];

export default function ReceitasPaciente() {
  const [selectedRecipe, setSelectedRecipe] = useState<typeof prescriptions[0] | null>(null);

  return (
    <DashboardLayout navItems={navItems} userName="Maria Silva" userRole="Paciente">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-primary text-xs font-semibold tracking-widest uppercase">
              Histórico Médico
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Minhas Receitas
            </h1>
            <p className="text-sm text-muted-foreground">
              Acesse e baixe suas prescrições médicas digitais a qualquer momento.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full gap-2 text-xs font-semibold h-9 bg-card">
              <Filter className="h-3.5 w-3.5" />
              Especialidade
            </Button>
            <Button variant="outline" size="sm" className="rounded-full gap-2 text-xs font-semibold h-9 bg-card">
              <Calendar className="h-3.5 w-3.5" />
              Data
            </Button>
            <div className="relative group ml-auto md:ml-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Pesquisar receitas..."
                className="pl-9 pr-4 py-2 bg-card border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-[200px] md:w-[240px]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prescriptions.map((recipe) => (
            <div
              key={recipe.id}
              className="group bg-card border border-border/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 flex flex-col"
            >
              <div className={recipe.isControlled ? "h-1.5 bg-blue-500" : "h-1.5 bg-primary"} />
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={recipe.isControlled ? "w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center ring-4 ring-blue-50/50" : "w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-4 ring-primary/5"}>
                      <Pill className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {recipe.type}
                        </p>
                        {recipe.isControlled && recipe.expiryDate && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold border-blue-200 text-blue-600 bg-blue-50/50 uppercase tracking-tighter rounded-sm">
                            Válida até {recipe.expiryDate.split('/').slice(0, 2).join('/')}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-foreground font-bold text-xl leading-tight">
                        {recipe.doctor}
                      </h3>
                    </div>
                  </div>
                  <Badge variant={recipe.status === "Ativa" ? "default" : "secondary"} className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    {recipe.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data de Emissão</p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      {recipe.date}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Especialidade</p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <User className="h-4 w-4 text-primary" />
                      {recipe.specialty}
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-2xl p-5 mb-8 flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Medicamentos Prescritos:</p>
                  <ul className="space-y-2">
                    {recipe.medications.map((med, idx) => (
                      <li key={idx} className="text-sm font-bold text-foreground flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                        {med}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-2xl gap-2 text-xs font-bold h-12 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all shadow-sm"
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Visualizar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 rounded-3xl border-none shadow-2xl">
                      <div className="flex flex-col h-[90vh]">
                        <div className="p-6 border-b border-border bg-card">
                          <DialogHeader>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <DialogTitle className="text-xl font-bold">{recipe.type}</DialogTitle>
                                <p className="text-sm text-muted-foreground">Prescrito por {recipe.doctor} em {recipe.date}</p>
                              </div>
                            </div>
                          </DialogHeader>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 bg-muted/20">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* PDF Preview Area */}
                            <div className="lg:col-span-2 space-y-4">
                              <div className="aspect-[1/1.4] bg-white rounded-xl shadow-inner border border-border/50 flex flex-col items-center justify-center p-12 text-center">
                                <FileText className="h-16 w-16 text-muted/30 mb-4" />
                                <p className="text-muted-foreground font-medium">Preview da Receita Digital</p>
                                <p className="text-xs text-muted-foreground/60 max-w-[200px] mt-2">Nesta área seria renderizado o PDF original da prescrição médica.</p>
                              </div>
                            </div>
                            
                            {/* QR Code & Actions Area */}
                            <div className="space-y-6">
                              <div className="bg-card border border-border p-6 rounded-2xl text-center space-y-4 shadow-sm">
                                <div className="mx-auto w-32 h-32 bg-white border-4 border-muted rounded-xl p-2 shadow-sm flex items-center justify-center">
                                  <QrCode className="w-full h-full text-foreground" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-bold">QR Code de Autenticação</p>
                                  <p className="text-[10px] text-muted-foreground">Apresente este código na farmácia para validar sua receita com segurança.</p>
                                </div>
                                <Button className="w-full rounded-xl gap-2 font-bold bg-primary hover:bg-primary/90">
                                  <Download className="h-4 w-4" />
                                  Baixar Receita (PDF)
                                </Button>
                              </div>
                              
                              <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-3">
                                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Informações de Segurança</h4>
                                <ul className="space-y-2">
                                  <li className="text-[11px] text-blue-800 flex gap-2">
                                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                    <span>Assinatura digital padrão ICP-Brasil.</span>
                                  </li>
                                  <li className="text-[11px] text-blue-800 flex gap-2">
                                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                    <span>Válida em todo o território nacional.</span>
                                  </li>
                                  {recipe.isControlled && (
                                    <li className="text-[11px] font-bold text-blue-900 flex gap-2">
                                      <div className="w-1 h-1 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                      <span>Necessário retenção da via digital pela farmácia.</span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    className="rounded-2xl gap-2 text-xs font-bold h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Baixar PDF
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
