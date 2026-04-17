import {
  Home,
  FileText,
  FolderHeart,
  CalendarDays,
  Search,
  UserCheck,
  Star,
  MapPin,
  Clock,
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

const specialists = [
  {
    name: "Dr. Carlos Henrique",
    specialty: "Clínica Geral",
    rating: 4.9,
    reviews: 124,
    location: "Sala 502 - Prédio Central",
    availability: "Hoje",
    initials: "CH",
    color: "bg-primary/10 text-primary",
  },
  {
    name: "Dra. Ana Beatriz",
    specialty: "Ginecologia",
    rating: 4.8,
    reviews: 89,
    location: "Sala 304 - Ala Norte",
    availability: "Amanhã",
    initials: "AB",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    name: "Dr. Ricardo Mendes",
    specialty: "Cardiologia",
    rating: 5.0,
    reviews: 210,
    location: "Sala 101 - Ala Sul",
    availability: "Segunda, 22 Abr",
    initials: "RM",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    name: "Dra. Juliana Lopes",
    specialty: "Dermatologia",
    rating: 4.7,
    reviews: 67,
    location: "Sala 405 - Prédio Central",
    availability: "Quarta, 24 Abr",
    initials: "JL",
    color: "bg-purple-500/10 text-purple-600",
  },
];

export default function Especialistas() {
  return (
    <DashboardLayout navItems={navItems} userName="Maria Silva" userRole="Paciente">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">
            Agendamento
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Escolha um Especialista
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Encontre o médico ideal para seu atendimento e agende sua consulta em segundos.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input 
            id="searchSpecialist"
            name="searchSpecialist"
            placeholder="Buscar por nome, especialidade ou sintoma..." 
            className="h-14 pl-12 rounded-2xl border-border/60 bg-white shadow-sm focus-visible:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {specialists.map((doc) => (
            <div
              key={doc.name}
              className="bg-card border border-border/40 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-20 h-20 rounded-2xl ${doc.color} flex items-center justify-center text-2xl font-black flex-shrink-0 shadow-sm`}>
                {doc.initials}
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{doc.name}</h3>
                    <p className="text-primary font-semibold text-sm">{doc.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold">
                    <Star className="h-3 w-3 fill-current" />
                    {doc.rating}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {doc.location}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Próxima disponibilidade: <span className="text-foreground font-bold">{doc.availability}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => { /* TODO: Implementar lógica no Cursor - Agendar com {doc.name} */ }}
                    className="flex-1 rounded-xl h-10 text-xs font-bold gap-2"
                  >
                    <UserCheck className="h-4 w-4" />
                    Agendar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { /* TODO: Implementar lógica no Cursor - Ver Perfil de {doc.name} */ }}
                    className="flex-1 rounded-xl h-10 text-xs font-bold"
                  >
                    Ver Perfil
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
