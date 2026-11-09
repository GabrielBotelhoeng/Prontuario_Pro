import { BrandMark } from "@/components/Brand";

export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="h-10 w-10 text-primary animate-pulse" />
        <p className="eyebrow">Carregando</p>
      </div>
    </div>
  );
}
