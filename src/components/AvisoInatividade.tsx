import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { INATIVIDADE_LIMITE_MS, estadoSessao, segundosRestantes } from "@/lib/inatividade";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Compartilhado entre abas: atividade em qualquer aba mantém a sessão.
const CHAVE = "prontuario:ultimaAtividade";
const EVENTOS = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;

function lerUltima(padrao: number) {
  try {
    const v = Number(localStorage.getItem(CHAVE));
    return Number.isFinite(v) && v > 0 ? v : padrao;
  } catch {
    return padrao;
  }
}

function gravarUltima(t: number) {
  try {
    localStorage.setItem(CHAVE, String(t));
  } catch {
    /* sem storage: a contagem vale só para esta aba */
  }
}

/** Encerra a sessão após 15 min sem uso, avisando 2 min antes. */
export default function AvisoInatividade() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const ultimaRef = useRef(Date.now());
  const encerrandoRef = useRef(false);
  const [agora, setAgora] = useState(Date.now());

  const registrar = useCallback(() => {
    const t = Date.now();
    if (t - ultimaRef.current < 5000) return; // mousemove dispara demais
    ultimaRef.current = t;
    gravarUltima(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    encerrandoRef.current = false;
    ultimaRef.current = Date.now();
    gravarUltima(ultimaRef.current);
    EVENTOS.forEach((e) => window.addEventListener(e, registrar, { passive: true }));
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, registrar));
      window.clearInterval(id);
    };
  }, [user, registrar]);

  const ultima = Math.max(ultimaRef.current, lerUltima(ultimaRef.current));
  const estado = user ? estadoSessao(ultima, agora) : "ativa";

  useEffect(() => {
    if (estado !== "expirada" || encerrandoRef.current) return;
    encerrandoRef.current = true;
    signOut().finally(() => navigate("/", { replace: true, state: { motivo: "inatividade" } }));
  }, [estado, signOut, navigate]);

  const restante = segundosRestantes(ultima, agora);

  return (
    <AlertDialog open={estado === "aviso"}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-3xl font-normal">Ainda está aí?</AlertDialogTitle>
          <AlertDialogDescription>
            Por segurança, o prontuário fecha após {INATIVIDADE_LIMITE_MS / 60_000} minutos sem uso. Saída automática em{" "}
            <span className="font-mono text-foreground">
              {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              ultimaRef.current = 0;
              registrar();
            }}
          >
            Continuar conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
