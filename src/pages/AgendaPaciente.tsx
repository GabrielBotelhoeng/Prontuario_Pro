import { useState, useMemo } from "react";
import {
  Home,
  FileText,
  FolderHeart,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  Check,
  X,
  RefreshCcw,
  ArrowRight,
  Info
} from "lucide-react";
import DashboardLayout, { NavItem } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const navItems: NavItem[] = [
  { title: "Início", url: "/paciente", icon: Home },
  { title: "Minhas Receitas", url: "/paciente/receitas", icon: FileText },
  { title: "Meu Prontuário", url: "/paciente/prontuario", icon: FolderHeart },
  { title: "Agendamento", url: "/paciente/agendamento", icon: CalendarDays },
];

const doctors = [
  {
    id: "1",
    name: "Dr. Carlos Henrique",
    specialty: "Clínica Geral",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200",
  },
  {
    id: "2",
    name: "Dra. Ana Beatriz",
    specialty: "Ginecologia",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200&h=200",
  },
  {
    id: "3",
    name: "Dr. Marcelo Santos",
    specialty: "Cardiologia",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200&h=200",
  },
];

const timeSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

interface Appointment {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: "scheduled" | "passed";
}

const initialAppointments: Appointment[] = [
  {
    id: "101",
    doctor: "Dr. Carlos Henrique",
    specialty: "Clínica Geral",
    date: "Segunda-Feira, 18 de Abril",
    time: "14:30",
    status: "scheduled",
  },
  {
    id: "102",
    doctor: "Dra. Ana Beatriz",
    specialty: "Ginecologia",
    date: "Sexta-Feira, 26 de Março",
    time: "10:00",
    status: "passed",
  },
];

export default function AgendaPaciente() {
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<typeof doctors[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointments, setAppointments] = useState(initialAppointments);

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const handleConfirm = () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    const newApp: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      doctor: selectedDoctor.name,
      specialty: selectedDoctor.specialty,
      date: `${selectedDate} de ${monthNames[month]} de ${year}`,
      time: selectedTime,
      status: "scheduled",
    };

    setAppointments([newApp, ...appointments]);
    toast.success("Agendamento realizado com sucesso!");
    setStep(1);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const steps = [
    { id: 1, label: "Médico" },
    { id: 2, label: "Data" },
    { id: 3, label: "Confirmar" },
  ];

  return (
    <DashboardLayout navItems={navItems} userName="Maria Silva" userRole="Paciente">
      <div className="absolute inset-0 bg-[#F8F7FF] -z-10 pointer-events-none" /> {/* Soft lilac background */}
      <div className="max-w-6xl mx-auto space-y-8 pb-12 relative z-0">
        
        {/* Header with Visual Refinement */}
        <div className="relative overflow-hidden bg-primary rounded-3xl p-8 mb-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <h1 className="text-3xl font-bold mb-2">Sua saúde em boas mãos</h1>
              <p className="text-primary-foreground/90 font-medium">
                Agende sua consulta em poucos cliques com os melhores especialistas.
              </p>
            </div>
            <div className="flex -space-x-3">
              {doctors.map((doc) => (
                <img 
                  key={doc.id}
                  src={doc.image} 
                  alt={doc.name}
                  className="w-12 h-12 rounded-full border-2 border-white object-cover"
                />
              ))}
              <div className="w-12 h-12 rounded-full border-2 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs font-bold">
                +15
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-20 -mb-20 blur-2xl" />
        </div>

        {/* Stepper */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center w-full max-w-md">
            {steps.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center relative">
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
                      step >= s.id 
                        ? "bg-primary border-primary text-white" 
                        : "bg-background border-border text-muted-foreground"
                    )}
                  >
                    {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={cn(
                    "absolute -bottom-6 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                    step >= s.id ? "text-primary" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 transition-all duration-500",
                    step > s.id ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 pt-4">
          <div className="space-y-6">
            {/* STEP 1: DOCTOR SELECTION */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Selecione o Profissional
                </h3>
                <div className="grid gap-4">
                  {doctors.map((doc) => (
                    <Card 
                      key={doc.id}
                      className={cn(
                        "p-4 flex items-center justify-between group transition-all duration-300 hover:shadow-md cursor-pointer border-2",
                        selectedDoctor?.id === doc.id ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/50"
                      )}
                      onClick={() => setSelectedDoctor(doc)}
                    >
                      <div className="flex items-center gap-4">
                        <img 
                          src={doc.image} 
                          alt={doc.name} 
                          className="w-16 h-16 rounded-xl object-cover shadow-sm"
                        />
                        <div>
                          <h4 className="font-bold text-lg text-foreground">{doc.name}</h4>
                          <p className="text-muted-foreground text-sm">{doc.specialty}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">(42 avaliações)</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant={selectedDoctor?.id === doc.id ? "default" : "outline"}
                        className="rounded-xl px-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDoctor(doc);
                          setStep(2);
                        }}
                      >
                        {selectedDoctor?.id === doc.id ? "Selecionado" : "Selecionar"}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: CALENDAR AND TIME */}
            {step === 2 && (
              <Card className="overflow-hidden border-border/40 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] divide-x divide-border/40">
                  {/* Calendar Side */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-foreground">
                        {monthNames[month]} <span className="text-muted-foreground font-normal">{year}</span>
                      </h3>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-xl h-8 w-8"
                          onClick={() => setViewDate(new Date(year, month - 1, 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-xl h-8 w-8"
                          onClick={() => setViewDate(new Date(year, month + 1, 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {weekDays.map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest py-2">
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarCells.map((day, idx) => {
                        if (day === null) return <div key={idx} className="aspect-square" />;
                        const isSelected = day === selectedDate;
                        const isToday = day === today.getDate() && month === today.getMonth();
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedDate(day)}
                            className={cn(
                              "aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-200",
                              isSelected
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : isToday
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Grid Side */}
                  <div className="p-6 bg-muted/20">
                    <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Horários
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 border",
                            selectedTime === time
                              ? "bg-primary border-primary text-white shadow-sm"
                              : "bg-background border-border hover:border-primary/50 text-foreground"
                          )}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 3: CONFIRMATION (Visualized in Summary) */}
            {step === 3 && (
              <Card className="p-8 text-center space-y-6 border-dashed border-2 border-primary/30 bg-primary/[0.02]">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Info className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Quase lá!</h3>
                  <p className="text-muted-foreground">
                    Confira os detalhes ao lado e confirme seu agendamento.
                  </p>
                </div>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => setStep(2)}>
                    Revisar Data
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* SIDEBAR SUMMARY */}
          <div className="space-y-6">
            <Card className="p-6 border-border/40 shadow-lg sticky top-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Resumo
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Médico</span>
                  <span className="text-sm font-semibold">{selectedDoctor?.name || "Não selecionado"}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Data</span>
                  <span className="text-sm font-semibold">
                    {selectedDate ? `${selectedDate} de ${monthNames[month]}` : "Não selecionado"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Horário</span>
                  <span className="text-sm font-semibold">{selectedTime || "Não selecionado"}</span>
                </div>
              </div>

              <Button 
                className="w-full rounded-xl h-12 text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                disabled={!selectedDoctor || !selectedDate || !selectedTime}
                onClick={() => {
                  if (step < 3) setStep(3);
                  else {
                    /* TODO: Implementar lógica no Cursor - Salvar agendamento no Banco de Dados */
                    handleConfirm();
                  }
                }}
              >
                {step === 3 ? "Confirmar Agendamento" : "Próximo Passo"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              
              {step > 1 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-2 rounded-xl text-muted-foreground"
                  onClick={() => setStep(step - 1)}
                >
                  Voltar
                </Button>
              )}
            </Card>
          </div>
        </div>

        {/* MY APPOINTMENTS SECTION */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              Meus Agendamentos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Próximos (Confirmed) */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1">Próximas Consultas</h3>
              <div className="space-y-4">
                {appointments.filter(a => a.status === "scheduled").map((apt) => (
                  <Card key={apt.id} className="p-5 border-2 border-primary/20 hover:border-primary transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full transition-all group-hover:bg-primary/10" />
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight">{apt.doctor}</p>
                          <p className="text-muted-foreground text-sm">{apt.specialty}</p>
                          <div className="flex items-center gap-2 mt-2 text-primary">
                            <CalendarDays className="w-4 h-4" />
                            <span className="text-sm font-bold">{apt.date} • {apt.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-6 pt-4 border-t border-border/40">
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs font-bold h-9">
                        <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                        Reagendar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs font-bold h-9 text-destructive border-destructive/20 hover:bg-destructive/5 hover:border-destructive/40">
                        <X className="w-3.5 h-3.5 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Histórico (Past) */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1">Histórico</h3>
              <div className="space-y-4">
                {appointments.filter(a => a.status === "passed").map((apt) => (
                  <Card key={apt.id} className="p-5 opacity-60 grayscale-[0.3] hover:opacity-100 hover:grayscale-0 transition-all border-border/40 bg-muted/20">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight">{apt.doctor}</p>
                          <p className="text-muted-foreground text-sm">{apt.specialty}</p>
                          <p className="text-xs font-medium text-muted-foreground mt-1">{apt.date}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1 bg-muted rounded-full">
                        Finalizada
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
