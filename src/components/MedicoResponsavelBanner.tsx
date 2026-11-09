import { useState } from "react";
import { Stethoscope, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTodosMedicos } from "@/hooks/usePacientes";
import { supabase } from "@/lib/supabase";

/**
 * Aparece para o paciente quando `paciente.medico_principal_id` é null.
 * Resolve o "buraco negro" da opção "Selecionar depois" no cadastro:
 * sem médico vinculado, nenhum profissional consegue ver o prontuário (RLS).
 *
 * Heurísticas Nielsen tratadas:
 *  H1 — Visibilidade do status (mostra que falta vincular)
 *  H5 — Prevenção de erros (o paciente não fica em estado "órfão" sem perceber)
 *  H6 — Reconhecer ≠ lembrar (CTA persistente, não exige memória)
 */
export default function MedicoResponsavelBanner() {
  const { paciente, user, refreshUserData } = useAuth();
  const { data: medicos = [], isLoading } = useTodosMedicos();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [medicoId, setMedicoId] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!paciente || paciente.medico_principal_id) return null;

  async function salvar() {
    if (!medicoId || !user?.id) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("pacientes")
        .update({ medico_principal_id: medicoId })
        .eq("id", user.id);
      if (error) throw error;
      await refreshUserData();
      toast({
        title: "Médico responsável vinculado",
        description: "Agora ele tem acesso ao seu prontuário.",
      });
      setOpen(false);
    } catch (err: unknown) {
      toast({
        title: "Erro ao vincular",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/5 px-5 py-4 sm:flex-row sm:items-center">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Escolha seu médico responsável</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            Ele acompanha seu prontuário, exames e receitas no hospital.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="shrink-0 gap-2">
          <Stethoscope className="h-3.5 w-3.5" />
          Escolher agora
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px] ">
          <DialogHeader>
            <DialogTitle>Escolher médico responsável</DialogTitle>
            <DialogDescription>
              Este médico passa a ter acesso ao seu prontuário para oferecer um
              atendimento mais completo. Para trocar depois, procure a administração do hospital.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select value={medicoId} onValueChange={setMedicoId} disabled={isLoading}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={isLoading ? "Carregando médicos..." : "Selecione um médico"} />
              </SelectTrigger>
              <SelectContent >
                {medicos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.profile?.nome ?? "Médico"} — CRM {m.crm} · {m.especialidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {medicos.length === 0 && !isLoading && (
              <p className="text-[12px] text-muted-foreground mt-2">
                Nenhum médico cadastrado no sistema no momento.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={salvando} >
              Agora não
            </Button>
            <Button onClick={salvar} disabled={salvando || !medicoId} className="gap-2">
              {salvando ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {salvando ? "Vinculando..." : "Confirmar vínculo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
