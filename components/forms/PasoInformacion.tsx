"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Aviso, CampoArea, CampoOpciones, CampoTexto, Casilla } from "@/components/ui/Campos";
import { Boton, Seccion } from "@/components/ui/Layout";
import { APP } from "@/lib/config";
import { msgAnidado } from "@/lib/rhf";
import type { EnrollmentValues } from "@/lib/schemas";

type ClaveOpcion = "alergia" | "condicion" | "medicamento" | "otra";
type ClaveDetalle =
  | "alergiaDetalle"
  | "condicionDetalle"
  | "medicamentoDetalle"
  | "otraDetalle";

const PREGUNTAS: Array<{
  opcion: ClaveOpcion;
  detalle: ClaveDetalle;
  titulo: string;
  placeholder: string;
}> = [
  {
    opcion: "alergia",
    detalle: "alergiaDetalle",
    titulo: "¿Presenta alguna alergia relevante?",
    placeholder: "Ej.: penicilina, alimentos, picaduras",
  },
  {
    opcion: "condicion",
    detalle: "condicionDetalle",
    titulo: "¿Existe alguna condición o necesidad relevante que el equipo deba conocer?",
    placeholder: "Ej.: asma, convulsiones, necesidades de movilidad",
  },
  {
    opcion: "medicamento",
    detalle: "medicamentoDetalle",
    titulo: "¿Existe algún medicamento o consideración especial necesaria ante una emergencia?",
    placeholder: "Ej.: medicamento, dosis y horario",
  },
  {
    opcion: "otra",
    detalle: "otraDetalle",
    titulo: "Otra información importante de salud",
    placeholder: "Lo que considere necesario",
  },
];

function PreguntaSalud({
  form,
  opcion,
  detalle,
  titulo,
  placeholder,
}: {
  form: UseFormReturn<EnrollmentValues>;
  opcion: ClaveOpcion;
  detalle: ClaveDetalle;
  titulo: string;
  placeholder: string;
}) {
  const { register, formState, watch } = form;
  const errores = formState.errors.salud;
  const respuesta = watch(`salud.${opcion}`) as unknown as string;
  const mostrarDetalle = respuesta === "si";
  const errorOpcion = (errores as Record<string, unknown> | undefined)?.[opcion];
  const errorDetalle = (errores as Record<string, unknown> | undefined)?.[detalle];

  return (
    <div className="space-y-3 rounded-lg border border-line bg-cream-deep/50 p-3.5">
      <CampoOpciones
        label={titulo}
        requerido
        registro={register(`salud.${opcion}`)}
        error={msgAnidado(errorOpcion)}
        opciones={[
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ]}
      />
      {mostrarDetalle ? (
        <CampoArea
          label="Indique el detalle"
          rows={2}
          placeholder={placeholder}
          registro={register(`salud.${detalle}`)}
          error={msgAnidado(errorDetalle)}
        />
      ) : null}
    </div>
  );
}

export function PasoInformacion({
  form,
}: {
  form: UseFormReturn<EnrollmentValues>;
}) {
  const { register, formState, control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "autorizados",
  });
  const erroresAutorizados = formState.errors.autorizados;

  const anadir = () => {
    if (fields.length < APP.maxPersonasAutorizadas) {
      append({ nombres: "", parentesco: "", telefono: "", autorizada: false });
    }
  };

  return (
    <div className="space-y-5">
      <Seccion
        titulo="Personas autorizadas para retirar al menor"
        descripcion="Solo las personas autorizadas por el representante podrán retirar al menor cuando corresponda."
      >
        <ul className="space-y-3">
          {fields.map((campo, indice) => {
            const errorFila = Array.isArray(erroresAutorizados)
              ? erroresAutorizados[indice]
              : undefined;
            return (
              <li
                key={campo.id}
                className="rounded-lg border border-line bg-surface p-3.5"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-soft">
                    Persona {indice + 1}
                  </p>
                  {fields.length > APP.minPersonasAutorizadas ? (
                    <button
                      type="button"
                      onClick={() => remove(indice)}
                      className="min-h-11 rounded-lg px-2 text-sm font-medium text-muted transition-colors hover:bg-cream-deep hover:text-accent-strong"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <CampoTexto
                    label="Nombre"
                    registro={register(`autorizados.${indice}.nombres` as const)}
                    error={msgAnidado(errorFila?.nombres)}
                  />
                  <CampoTexto
                    label="Parentesco"
                    registro={register(`autorizados.${indice}.parentesco` as const)}
                    error={msgAnidado(errorFila?.parentesco)}
                  />
                  <CampoTexto
                    label="Teléfono"
                    type="tel"
                    inputMode="tel"
                    registro={register(`autorizados.${indice}.telefono` as const)}
                    error={msgAnidado(errorFila?.telefono)}
                  />
                </div>

                <div className="mt-3">
                  <Casilla
                    registro={register(
                      `autorizados.${indice}.autorizada` as const,
                    )}
                    destacada
                  >
                    Autorizo a esta persona a retirar al menor
                  </Casilla>
                </div>
              </li>
            );
          })}
        </ul>

        {fields.length < APP.maxPersonasAutorizadas ? (
          <Boton type="button" variante="secundario" onClick={anadir}>
            Añadir otra persona autorizada
          </Boton>
        ) : null}

        {msgAnidado(erroresAutorizados?.root) ? (
          <p role="alert" className="text-xs font-medium text-[#a3271b]">
            {msgAnidado(erroresAutorizados?.root)}
          </p>
        ) : null}
      </Seccion>

      <Seccion
        titulo="Información de salud relevante"
        descripcion="Indique únicamente lo que los responsables necesiten conocer para actuar adecuadamente durante las actividades. No se solicita un historial médico completo."
      >
        <div className="space-y-3">
          {PREGUNTAS.map((pregunta) => (
            <PreguntaSalud key={pregunta.opcion} form={form} {...pregunta} />
          ))}
        </div>

        <Aviso tono="info">
          Si una respuesta es «Sí», el detalle es obligatorio. La información
          se utiliza únicamente para actuar de forma segura.
        </Aviso>
      </Seccion>
    </div>
  );
}
