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
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="h-4 w-4 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            Escolha seu médico responsável
          </p>
          <p className="text-[13px] text-amber-800/90 leading-relaxed mt-0.5">
            Sem um médico vinculado, nenhum profissional consegue acessar seu prontuário,
            seus exames ou suas receitas. Essa é a primeira pessoa que verá seus dados
            ao abrir o sistema.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          className="rounded-xl shrink-0 bg-amber-600 hover:bg-amber-700 text-white gap-2"
        >
          <Stethoscope className="h-3.5 w-3.5" />
          Escolher agora
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Escolher médico responsável</DialogTitle>
            <DialogDescription>
              Este médico passa a ter acesso ao seu prontuário para oferecer um
              atendimento mais completo. Você pode trocar a qualquer momento.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select value={medicoId} onValueChange={setMedicoId} disabled={isLoading}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder={isLoading ? "Carregando médicos..." : "Selecione um médico"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={salvando} className="rounded-xl">
              Agora não
            </Button>
            <Button onClick={salvar} disabled={salvando || !medicoId} className="rounded-xl gap-2">
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
