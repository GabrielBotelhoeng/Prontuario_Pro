import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// Sem as variáveis do Supabase o client lança erro na importação e a página
// fica em branco. Mostramos o motivo em vez disso (ex.: preview sem env vars).
const faltando = (["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const).filter(
  (k) => !import.meta.env[k],
);

if (faltando.length > 0) {
  root.render(
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md">
        <p className="eyebrow mb-3">Configuração incompleta</p>
        <h1 className="font-display text-4xl leading-tight text-foreground">
          O sistema não consegue se conectar ao <em>banco de dados</em>.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Variáveis de ambiente ausentes neste deploy:
        </p>
        <ul className="mt-2 space-y-1 font-mono text-sm text-foreground">
          {faltando.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </div>
    </main>,
  );
} else {
  import("./App.tsx").then(({ default: App }) => root.render(<App />));
}
