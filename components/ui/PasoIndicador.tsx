"use client";

import { useEffect, useRef } from "react";
import { PASOS, type PasoId } from "@/lib/steps";

export function PasoIndicador({
  actual,
  visitados,
  onIr,
}: {
  actual: number;
  visitados: number;
  onIr: (indice: number) => void;
}) {
  const progreso = Math.round(((actual + 1) / PASOS.length) * 100);
  const pasoActual = PASOS[actual];
  const activoRef = useRef<HTMLButtonElement>(null);

  /* En móvil la lista se desliza: el paso actual debe quedar a la vista. */
  useEffect(() => {
    activoRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [actual]);

  return (
    <nav
      aria-label="Progreso de la inscripción"
      className="sticky top-0 z-20 -mx-4 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-ink">
          Paso {actual + 1} de {PASOS.length}
          <span className="text-muted"> · {pasoActual?.corto}</span>
        </p>
        <p className="text-xs text-muted">{progreso}% completado</p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={actual + 1}
        aria-valuemin={1}
        aria-valuemax={PASOS.length}
        aria-label="Progreso de la inscripción"
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${progreso}%` }}
        />
      </div>

      {/* En pantallas pequeñas la lista se desliza en horizontal. */}
      <ol className="mt-2.5 flex snap-x gap-1.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible">
        {PASOS.map((paso, indice) => {
          const activo = indice === actual;
          const completo = indice < visitados;
          const disponible = indice <= visitados;
          return (
            <li
              key={paso.id as PasoId}
              className="w-28 shrink-0 snap-start sm:w-auto sm:shrink"
            >
              <button
                type="button"
                ref={activo ? activoRef : undefined}
                onClick={() => disponible && onIr(indice)}
                disabled={!disponible}
                aria-current={activo ? "step" : undefined}
                className={`flex min-h-11 w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
                  activo
                    ? "border-accent bg-accent-soft font-semibold text-accent-strong"
                    : disponible
                      ? "border-line bg-surface text-ink-soft hover:border-line-strong"
                      : "border-line bg-cream-deep text-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    completo
                      ? "bg-accent text-white"
                      : activo
                        ? "bg-accent-strong text-white"
                        : "bg-line text-muted"
                  }`}
                >
                  {completo ? (
                    <svg viewBox="0 0 12 12" className="size-2.5 fill-current">
                      <path d="M4.6 9.4 1.2 6l1.1-1.1 2.3 2.3 5.1-5.1L10.8 3.2z" />
                    </svg>
                  ) : (
                    paso.numero
                  )}
                </span>
                <span className="truncate">{paso.corto}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
