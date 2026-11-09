import type { Profile } from "@/lib/database.types";

/** Página inicial de cada papel. */
export function homeFor(tipo: Profile["tipo"] | undefined): string {
  if (tipo === "admin") return "/admin";
  if (tipo === "medico") return "/medico";
  return "/paciente";
}
