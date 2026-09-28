"use client";

import type { UseFormReturn } from "react-hook-form";
import { Aviso, CampoTexto } from "@/components/ui/Campos";
import { Seccion } from "@/components/ui/Layout";
import { msg } from "@/lib/rhf";
import type { EnrollmentValues } from "@/lib/schemas";

export function PasoEmergencia({
  form,
}: {
  form: UseFormReturn<EnrollmentValues>;
}) {
  const { register, formState } = form;
  const errores = formState.errors.emergencia;

  return (
    <Seccion
      titulo="Contacto de emergencia"
      descripcion="Persona que puede ser localizada durante las actividades del menor, en caso de necesidad."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CampoTexto
            label="Nombre y apellido"
            requerido
            registro={register("emergencia.nombres")}
            error={msg(errores?.nombres)}
          />
        </div>

        <CampoTexto
          label="Parentesco"
          requerido
          registro={register("emergencia.parentesco")}
          error={msg(errores?.parentesco)}
        />

        <CampoTexto
          label="Teléfono"
          type="tel"
          inputMode="tel"
          requerido
          tipoTelefono
          registro={register("emergencia.telefono")}
          error={msg(errores?.telefono)}
        />

        <div className="sm:col-span-2">
          <CampoTexto
            label="Teléfono alternativo"
            type="tel"
            inputMode="tel"
            tipoTelefono
            registro={register("emergencia.telefonoAlternativo")}
            error={msg(errores?.telefonoAlternativo)}
          />
        </div>

        <div className="sm:col-span-2">
          <Aviso>
            Esta persona debe poder ser localizada rápidamente. Puede ser
            distinta del representante o de las personas autorizadas a retirar.
          </Aviso>
        </div>
      </div>
    </Seccion>
  );
}
