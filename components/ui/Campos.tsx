"use client";

import type { ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

type Base = {
  label: string;
  registro?: UseFormRegisterReturn;
  error?: string;
  hint?: string;
  placeholder?: string;
};

type CampoTextoProps = Base & {
  type?: "text" | "tel" | "email" | "date" | "number";
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  max?: number;
  readOnly?: boolean;
  requerido?: boolean;
  value?: string;
};

function idDe(name: string): string {
  return `campo-${name.replace(/\./g, "-")}`;
}

const clasesInput =
  "w-full min-h-11 rounded-lg border bg-surface px-3 py-2 text-base text-ink shadow-xs transition-colors placeholder:text-muted/60 hover:border-line-strong";

const clasesRotulo = "text-sm font-semibold text-ink-soft";

const clasesError = "text-xs font-medium leading-snug text-[#a3271b]";

function Rotulo({
  htmlFor,
  children,
  requerido,
}: {
  htmlFor: string;
  children: ReactNode;
  requerido?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={clasesRotulo}>
      {children}
      {requerido ? (
        <span className="ml-1 text-accent" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

function Ayuda({ id, hint }: { id: string; hint?: string }) {
  if (!hint) return null;
  return (
    <p id={`${id}-hint`} className="text-xs leading-snug text-muted">
      {hint}
    </p>
  );
}

function Error({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} role="alert" className={clasesError}>
      {error}
    </p>
  );
}

function descritoPor(id: string, hint?: string, error?: string): string | undefined {
  const partes = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(
    Boolean,
  );
  return partes.length ? partes.join(" ") : undefined;
}

export function CampoTexto({
  label,
  registro,
  error,
  hint,
  type = "text",
  autoComplete,
  inputMode,
  max,
  readOnly,
  requerido,
  value,
  placeholder,
}: CampoTextoProps) {
  const id = idDe(registro?.name ?? label);

  return (
    <div className="flex flex-col gap-1.5">
      <Rotulo htmlFor={id} requerido={requerido}>
        {label}
      </Rotulo>
      <input
        id={id}
        type={type}
        name={registro?.name}
        value={registro ? undefined : value}
        onChange={registro?.onChange}
        onBlur={registro?.onBlur}
        ref={registro?.ref}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={max}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor(id, hint, error)}
        className={`${clasesInput} ${
          error ? "border-[#a3271b] bg-[#fdf3f1]" : "border-line"
        } ${readOnly ? "bg-cream-deep text-muted" : ""}`}
      />
      <Ayuda id={id} hint={hint} />
      <Error id={id} error={error} />
    </div>
  );
}

export function CampoArea({
  label,
  registro,
  error,
  hint,
  placeholder,
  rows = 3,
  max = 300,
  requerido,
}: Base & { rows?: number; max?: number; requerido?: boolean }) {
  const id = idDe(registro?.name ?? label);

  return (
    <div className="flex flex-col gap-1.5">
      <Rotulo htmlFor={id} requerido={requerido}>
        {label}
      </Rotulo>
      <textarea
        id={id}
        name={registro?.name}
        onChange={registro?.onChange}
        onBlur={registro?.onBlur}
        ref={registro?.ref}
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor(id, hint, error)}
        className={`${clasesInput} resize-y ${
          error ? "border-[#a3271b] bg-[#fdf3f1]" : "border-line"
        }`}
      />
      <Ayuda id={id} hint={hint} />
      <Error id={id} error={error} />
    </div>
  );
}

type Opcion = { value: string; label: string; descripcion?: string };

export function CampoOpciones({
  label,
  registro,
  error,
  opciones,
  columns = 2,
  hint,
  requerido,
}: Base & {
  registro: UseFormRegisterReturn;
  opciones: Opcion[];
  columns?: 1 | 2;
  requerido?: boolean;
}) {
  const id = idDe(registro.name);

  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={descritoPor(id, hint, error)}
    >
      <legend className={clasesRotulo}>
        {label}
        {requerido ? (
          <span className="ml-1 text-accent" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      <div
        className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}
      >
        {opciones.map((opcion) => {
          const opcionId = `${id}-${opcion.value}`;
          return (
            <label
              key={opcion.value}
              htmlFor={opcionId}
              className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-line-strong has-checked:border-accent has-checked:bg-accent-soft"
            >
              <input
                id={opcionId}
                type="radio"
                value={opcion.value}
                {...registro}
                className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
              />
              <span className="flex flex-col">
                <span className="font-medium leading-snug">{opcion.label}</span>
                {opcion.descripcion ? (
                  <span className="text-xs leading-snug text-muted">
                    {opcion.descripcion}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      <Ayuda id={id} hint={hint} />
      <Error id={id} error={error} />
    </fieldset>
  );
}

export function Casilla({
  registro,
  children,
  error,
  descripcion,
  destacada,
}: {
  registro: UseFormRegisterReturn;
  children: ReactNode;
  error?: string;
  descripcion?: string;
  destacada?: boolean;
}) {
  const id = idDe(registro.name);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        destacada ? "border-accent-line bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={descritoPor(id, descripcion, error)}
          {...registro}
          className="mt-0.5 size-6 shrink-0 accent-[var(--accent)]"
        />
        <label htmlFor={id} className="min-h-6 cursor-pointer text-sm leading-snug">
          <span className="font-medium text-ink">{children}</span>
          {descripcion ? (
            <span id={`${id}-desc`} className="mt-1 block text-xs text-muted">
              {descripcion}
            </span>
          ) : null}
        </label>
      </div>
      <Error id={id} error={error} />
    </div>
  );
}

export function Aviso({
  children,
  tono = "info",
}: {
  children: ReactNode;
  tono?: "info" | "alerta" | "exito";
}) {
  const estilos = {
    info: "border-line bg-cream-deep text-ink-soft",
    alerta: "border-[#e2b4ab] bg-[#fdf3f1] text-[#7d1d12]",
    exito: "border-[#bfd2b4] bg-[#f2f7ec] text-[#3c5320]",
  }[tono];

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${estilos}`}
    >
      {children}
    </div>
  );
}
