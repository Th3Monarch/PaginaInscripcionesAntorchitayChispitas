"use client";

import type { UseFormReturn } from "react-hook-form";
import { Aviso, CampoArea, CampoOpciones, Casilla } from "@/components/ui/Campos";
import { Seccion } from "@/components/ui/Layout";
import { GRUPOS, type GroupId } from "@/lib/config";
import { msg } from "@/lib/rhf";
import type { EnrollmentValues } from "@/lib/schemas";

export function PasoAutorizaciones({
  form,
  grupo,
}: {
  form: UseFormReturn<EnrollmentValues>;
  grupo: GroupId;
}) {
  const { register, formState } = form;
  const errores = formState.errors.autorizaciones;
  const nombreGrupo = GRUPOS[grupo].nombre;

  const opcionesAutorizacion = [
    {
      value: "autorizo",
      label: "AUTORIZO",
      descripcion: "Sí autorizo",
    },
    {
      value: "no_autorizo",
      label: "NO AUTORIZO",
      descripcion: "No autorizo",
    },
  ];

  return (
    <div className="space-y-5">
      <Seccion
        titulo="Autorización de participación"
        descripcion={`Yo, como padre, madre o representante legal del menor identificado, autorizo su participación en las actividades ordinarias de ${nombreGrupo}, de acuerdo con las orientaciones de los responsables del grupo.`}
      >
        <CampoOpciones
          label="Participación en actividades ordinarias"
          requerido
          registro={register("autorizaciones.participacion")}
          error={msg(errores?.participacion)}
          opciones={opcionesAutorizacion}
        />
        <Aviso>
          Esta autorización se refiere a las actividades ordinarias del grupo.
          Las actividades externas se tratan por separado.
        </Aviso>
      </Seccion>

      <Seccion
        titulo="Autorización para actividades externas"
        descripcion="Algunas actividades podrán realizarse fuera del espacio habitual del grupo. La coordinación informará con antelación el lugar, el horario, el acompañamiento y las medidas de seguridad."
      >
        <div className="space-y-3">
          <Casilla
            registro={register("autorizaciones.externasInformado")}
            error={msg(errores?.externasInformado)}
          >
            He sido informado de las actividades externas.
          </Casilla>
          <Casilla
            registro={register("autorizaciones.externasRevisa")}
            error={msg(errores?.externasRevisa)}
          >
            Recibiré y revisaré la información correspondiente antes de cada salida.
          </Casilla>
        </div>
        <Aviso tono="alerta">
          Este apartado no constituye una autorización universal para cualquier
          salida. Cada actividad externa se informa y se autoriza por separado.
        </Aviso>
      </Seccion>

      <Seccion
        titulo="Autorización de fotografías y videos"
        descripcion="Durante algunas actividades podrían realizarse fotografías o videos con fines de documentación, memoria o comunicación del grupo."
      >
        <CampoOpciones
          label="Uso de imágenes del menor"
          requerido
          registro={register("autorizaciones.imagenes")}
          error={msg(errores?.imagenes)}
          opciones={opcionesAutorizacion}
        />
        <CampoArea
          label="Condiciones informadas y forma de uso"
          rows={2}
          placeholder="Opcional: indique condiciones o restricciones."
          registro={register("autorizaciones.imagenesCondiciones")}
          error={msg(errores?.imagenesCondiciones)}
        />
        <Aviso tono="alerta">
          La inscripción en {nombreGrupo} no depende de autorizar fotografías
          o videos. Este apartado es independiente de la inscripción. No se
          solicitan redes sociales personales del menor.
        </Aviso>
      </Seccion>

      <Seccion
        titulo="Compromiso del representante"
        descripcion="Me comprometo a mantener actualizada la información suministrada y a comunicar oportunamente cualquier cambio que pueda afectar la participación o la seguridad del menor. Reconozco que las actividades deberán desarrollarse de acuerdo con las normas de convivencia, seguridad, organización y acompañamiento establecidas por los responsables correspondientes."
      >
        <Casilla
          registro={register("autorizaciones.compromiso")}
          error={msg(errores?.compromiso)}
          destacada
        >
          Confirmo el compromiso descrito y la veracidad de la información
          suministrada.
        </Casilla>
      </Seccion>
    </div>
  );
}
