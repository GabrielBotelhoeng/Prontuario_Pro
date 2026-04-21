import { z } from "zod";

function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  const calc = (len: number) =>
    digits
      .slice(0, len)
      .split("")
      .reduce((acc, d, i) => acc + Number(d) * (len + 1 - i), 0);
  const mod = (n: number) => ((n * 10) % 11) % 10;
  return mod(calc(9)) === Number(digits[9]) && mod(calc(10)) === Number(digits[10]);
}

export const patientSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z
    .string()
    .min(14, "CPF inválido")
    .refine((v) => validarCPF(v), "CPF inválido"),
  birth_date: z.string().min(1, "Data de nascimento obrigatória"),
  phone: z.string().min(14, "Telefone inválido"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
});

export const doctorSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  crm: z
    .string()
    .regex(
      /^(\d{4,6}\/[A-Z]{2}|[A-Z]{2}-\d{4,6})$/,
      "CRM inválido. Use 123456/GO ou GO-123456"
    ),
  specialty: z.string().min(2, "Especialidade obrigatória"),
});

export type PatientFormData = z.infer<typeof patientSchema>;
export type DoctorFormData = z.infer<typeof doctorSchema>;
