import type { Metadata } from "next";
import Link from "next/link";
import { PanelRegistros } from "@/components/PanelRegistros";

export const metadata: Metadata = {
  title: "Fichas nuevas",
  robots: { index: false, follow: false },
};

export default function PaginaRegistros() {
  return (
    <div className="flex min-h-full flex-col bg-cream">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <span className="inline-flex items-center gap-2.5">
            <span className="text-sm font-semibold tracking-wide uppercase">
              Chispita y Antorchita
            </span>
          </span>
          <Link
            href="/"
            className="text-xs font-semibold text-white/70 underline hover:text-white"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Fichas nuevas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Aviso de cada ficha de inscripción generada en el sitio. Sirve para
          saber que hay un papel que recoger; el detalle está en la ficha que
          entrega la familia.
        </p>

        <div className="mt-8">
          <PanelRegistros />
        </div>
      </main>
    </div>
  );
}
