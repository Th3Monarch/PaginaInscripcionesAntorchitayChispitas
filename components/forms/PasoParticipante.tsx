"use client";

import type { UseFormReturn } from "react-hook-form";
import { Aviso, CampoArea, CampoTexto } from "@/components/ui/Campos";
import { Seccion } from "@/components/ui/Layout";
import { GRUPOS, type GroupId } from "@/lib/config";
import { calcularEdad } from "@/lib/format";
import { msg } from "@/lib/rhf";
import { evaluarReferencia } from "@/lib/referencia";
import type { EnrollmentValues } from "@/lib/schemas";

export function PasoParticipante({
  form,
  grupo,
}: {
  form: UseFormReturn<EnrollmentValues>;
  grupo: GroupId;
}) {
  const { register, formState, watch } = form;
  const errores = formState.errors.participante;
  const config = GRUPOS[grupo];
  const edad = calcularEdad(watch("participante.fechaNacimiento"));
  const desviacion = evaluarReferencia(grupo, {
    edad,
    grado: watch("participante.grado"),
  });

  return (
    <Seccion
      titulo="Datos del participante"
      descripcion="Información básica de la niña o el niño que se inscribe."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CampoTexto
            label="Nombres y apellidos"
            requerido
            autoComplete="name"
            registro={register("participante.nombres")}
            error={msg(errores?.nombres)}
          />
        </div>

        <CampoTexto
          label="Fecha de nacimiento"
          type="date"
          requerido
          registro={register("participante.fechaNacimiento")}
          error={msg(errores?.fechaNacimiento)}
        />

        <CampoTexto
          label="Edad"
          readOnly
          value={edad >= 0 ? String(edad) : ""}
          hint={
            config.edadHint ?? "Se calcula a partir de la fecha de nacimiento."
          }
        />

        <CampoTexto
          label="Grado que cursa"
          requerido
          placeholder="Ej.: 2.º grado"
          registro={register("participante.grado")}
          error={msg(errores?.grado)}
          hint={config.gradoHint ?? undefined}
        />

        <CampoTexto
          label="Institución educativa"
          requerido
          registro={register("participante.institucion")}
          error={msg(errores?.institucion)}
        />

        <CampoTexto
          label="Teléfono familiar"
          type="tel"
          inputMode="tel"
          requerido
          autoComplete="tel"
          tipoTelefono
          registro={register("participante.telefonoFamiliar")}
          error={msg(errores?.telefonoFamiliar)}
        />

        <CampoTexto
          label="Correo electrónico familiar"
          type="email"
          inputMode="email"
          requerido
          autoComplete="email"
          registro={register("participante.correoFamiliar")}
          error={msg(errores?.correoFamiliar)}
        />

        <div className="sm:col-span-2">
          <CampoArea
            label="Dirección o zona de residencia"
            placeholder="Calle, número, sector y ciudad"
            rows={2}
            registro={register("participante.direccion")}
            error={msg(errores?.direccion)}
            hint="Opcional. Ayuda a organizar la logística del grupo."
          />
        </div>
      </div>

      {desviacion.hayDesviacion ? (
        <div className="mt-5" data-referencia="fuera">
          <Aviso tono="alerta">
            <p className="font-semibold">
              No coincide con la referencia de {config.nombre}
            </p>
            <p className="mt-1">
              {config.nombre} es para {config.edadReferencia} y{" "}
              {config.gradosReferencia} grado. Corrige estos datos para poder
              continuar:
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
              {desviacion.detalles.map((detalle) => (
                <li key={detalle}>{detalle}</li>
              ))}
            </ul>
          </Aviso>
        </div>
      ) : null}
    </Seccion>
  );
}
