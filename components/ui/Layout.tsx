import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primario" | "secundario" | "fantasma";

const estilos: Record<Variante, string> = {
  primario:
    "bg-accent text-white border border-accent hover:bg-accent-strong hover:border-accent-strong shadow-xs",
  secundario:
    "bg-surface text-ink border border-line-strong hover:border-accent hover:text-accent-strong",
  fantasma:
    "bg-transparent text-ink-soft border border-transparent hover:bg-cream-deep hover:text-ink",
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export function Boton({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={`${base} ${estilos[variante]} ${className}`}
    />
  );
}

export function BotonEnlace({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return (
    <Link {...props} className={`${base} ${estilos[variante]} ${className}`} />
  );
}

export function Seccion({
  titulo,
  descripcion,
  children,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-base font-semibold text-ink">{titulo}</h2>
          {descripcion ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {descripcion}
            </p>
          ) : null}
        </div>
        {acciones}
      </div>
      <div className="space-y-5 px-4 py-5 sm:px-6">{children}</div>
    </section>
  );
}
