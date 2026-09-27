import Link from "next/link";
import type { ReactNode } from "react";
import { APP, GRUPOS, type GroupId } from "@/lib/config";
import { PASOS } from "@/lib/steps";

export function Marca({ grupo }: { grupo: GroupId | "inicio" }) {
  const nombre = grupo === "inicio" ? "Chispita y Antorchita" : GRUPOS[grupo].nombre;
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={APP.logoPath}
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0 object-contain"
      />
      <span className="text-sm font-semibold tracking-wide text-ink uppercase">
        {nombre}
      </span>
    </span>
  );
}

export function Encabezado({
  grupo,
  titulo,
  pasoActual,
  accionSalir,
}: {
  grupo: GroupId;
  titulo: string;
  pasoActual?: number;
  accionSalir?: ReactNode;
}) {
  return (
    <header
      className="border-b border-line bg-cream-deep/70"
      data-paso={pasoActual ?? undefined}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Marca grupo={grupo} />
          {accionSalir ?? (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-accent-strong"
            >
              Volver al inicio
            </Link>
          )}
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {titulo}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {GRUPOS[grupo].tituloLargo} · {APP.tituloDocumento}
            {pasoActual ? ` · Paso ${pasoActual} de ${PASOS.length}` : null}
          </p>
        </div>
      </div>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="mt-auto bg-ink text-white/70">
      <div className="mx-auto max-w-4xl px-4 py-5 text-xs leading-relaxed sm:px-6">
        {APP.pieWeb}
      </div>
    </footer>
  );
}
