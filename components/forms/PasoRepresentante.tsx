"use client";

import type { UseFormReturn } from "react-hook-form";
import { Aviso, CampoTexto } from "@/components/ui/Campos";
import { Seccion } from "@/components/ui/Layout";
import { APP, GRUPOS, type GroupId } from "@/lib/config";
import { msg } from "@/lib/rhf";
import type { EnrollmentValues } from "@/lib/schemas";

export function PasoRepresentante({
  form,
  grupo,
}: {
  form: UseFormReturn<EnrollmentValues>;
  grupo: GroupId;
}) {
  const { register, formState } = form;
  const errores = formState.errors.representante;
  const nombreGrupo = GRUPOS[grupo].nombre;

  return (
    <Seccion
      titulo="Padre, madre o representante"
      descripcion={`Quien completa y firma la ficha de ${nombreGrupo}.`}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CampoTexto
            label="Nombre y apellido"
            requerido
            autoComplete="name"
            registro={register("representante.nombres")}
            error={msg(errores?.nombres)}
          />
        </div>

        <CampoTexto
          label="Parentesco"
          requerido
          placeholder="Ej.: madre, padre, abuela"
          registro={register("representante.parentesco")}
          error={msg(errores?.parentesco)}
        />

        <CampoTexto
          label="Teléfono principal"
          type="tel"
          inputMode="tel"
          requerido
          autoComplete="tel"
          placeholder="809 000 0000"
          registro={register("representante.telefonoPrincipal")}
          error={msg(errores?.telefonoPrincipal)}
        />

        <CampoTexto
          label="Teléfono alternativo"
          type="tel"
          inputMode="tel"
          placeholder="Opcional"
          registro={register("representante.telefonoAlternativo")}
          error={msg(errores?.telefonoAlternativo)}
        />

        <CampoTexto
          label="Correo electrónico"
          type="email"
          inputMode="email"
          requerido
          autoComplete="email"
          registro={register("representante.correo")}
          error={msg(errores?.correo)}
        />

        <div className="sm:col-span-2">
          <CampoTexto
            label="Documento de identidad"
            registro={register("representante.documento")}
            error={msg(errores?.documento)}
            hint="Solo si lo requieren las normas administrativas de la comunidad. Opcional por defecto."
          />
        </div>

        {APP.idRepresentanteRequerido ? (
          <div className="sm:col-span-2">
            <Aviso tono="alerta">
              La comunidad exige el documento de identidad del representante.
            </Aviso>
          </div>
        ) : null}
      </div>
    </Seccion>
  );
}
