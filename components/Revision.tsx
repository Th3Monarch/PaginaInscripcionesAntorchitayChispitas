"use client";

import { Aviso } from "@/components/ui/Campos";
import { Seccion } from "@/components/ui/Layout";
import { APP, GRUPOS, type GroupId } from "@/lib/config";
import { edadLabel, formatFechaDMY, opcionAutorizacion, siNo, vacio } from "@/lib/format";
import type { EnrollmentValues } from "@/lib/schemas";

function Editar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent-strong"
    >
      Editar
      <span className="sr-only"> esta sección</span>
    </button>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-sm break-words text-ink">{valor}</dd>
    </div>
  );
}

export function Revision({
  valores,
  grupo,
  onEditar,
}: {
  valores: EnrollmentValues;
  grupo: GroupId;
  onEditar: (indice: number) => void;
}) {
  const config = GRUPOS[grupo];
  const autorizados = valores.autorizados.filter((p) => p.autorizada);
  const salud = [
    ["Alergia relevante", valores.salud.alergia, valores.salud.alergiaDetalle],
    [
      "Condición relevante",
      valores.salud.condicion,
      valores.salud.condicionDetalle,
    ],
    [
      "Medicamento ante emergencia",
      valores.salud.medicamento,
      valores.salud.medicamentoDetalle,
    ],
    [
      "Otra información de salud",
      valores.salud.otra,
      valores.salud.otraDetalle,
    ],
  ] as const;

  return (
    <div className="space-y-5">
      <Aviso>
        Revisa la información antes de generar la ficha. Puedes editar cualquier
        apartado. El PDF se genera únicamente con {config.nombre}.
      </Aviso>

      <Seccion
        titulo="Participante"
        acciones={<Editar onClick={() => onEditar(0)} />}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <Dato
            etiqueta="Nombres y apellidos"
            valor={vacio(valores.participante.nombres)}
          />
          <Dato
            etiqueta="Fecha de nacimiento"
            valor={`${formatFechaDMY(valores.participante.fechaNacimiento)} · ${edadLabel(valores.participante.fechaNacimiento)}`}
          />
          <Dato etiqueta="Grado" valor={vacio(valores.participante.grado)} />
          <Dato
            etiqueta="Institución educativa"
            valor={vacio(valores.participante.institucion)}
          />
          <Dato
            etiqueta="Teléfono familiar"
            valor={vacio(valores.participante.telefonoFamiliar)}
          />
          <Dato
            etiqueta="Correo electrónico"
            valor={vacio(valores.participante.correoFamiliar)}
          />
          <Dato etiqueta="Dirección" valor={vacio(valores.participante.direccion)} />
        </dl>
      </Seccion>

      <Seccion
        titulo="Representante"
        acciones={<Editar onClick={() => onEditar(1)} />}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <Dato
            etiqueta="Nombre y apellido"
            valor={vacio(valores.representante.nombres)}
          />
          <Dato
            etiqueta="Parentesco"
            valor={vacio(valores.representante.parentesco)}
          />
          <Dato
            etiqueta="Teléfono principal"
            valor={vacio(valores.representante.telefonoPrincipal)}
          />
          <Dato
            etiqueta="Teléfono alternativo"
            valor={vacio(valores.representante.telefonoAlternativo)}
          />
          <Dato
            etiqueta="Correo electrónico"
            valor={vacio(valores.representante.correo)}
          />
          <Dato
            etiqueta="Documento de identidad"
            valor={
              valores.representante.documento.trim()
                ? valores.representante.documento
                : "No se solicitó"
            }
          />
        </dl>
      </Seccion>

      <Seccion
        titulo="Contacto de emergencia"
        acciones={<Editar onClick={() => onEditar(2)} />}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <Dato
            etiqueta="Nombre y apellido"
            valor={vacio(valores.emergencia.nombres)}
          />
          <Dato
            etiqueta="Parentesco"
            valor={vacio(valores.emergencia.parentesco)}
          />
          <Dato
            etiqueta="Teléfono"
            valor={vacio(valores.emergencia.telefono)}
          />
          <Dato
            etiqueta="Teléfono alternativo"
            valor={vacio(valores.emergencia.telefonoAlternativo)}
          />
        </dl>
      </Seccion>

      <Seccion
        titulo="Información relevante"
        acciones={<Editar onClick={() => onEditar(3)} />}
      >
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Personas autorizadas para retirar
          </h3>
          {autorizados.length ? (
            <ul className="mt-2 space-y-1.5">
              {autorizados.map((persona, indice) => (
                <li
                  key={`${persona.nombres}-${indice}`}
                  className="flex flex-wrap gap-x-2 text-sm text-ink"
                >
                  <span className="font-medium">{persona.nombres}</span>
                  <span className="text-muted">
                    {persona.parentesco} · {persona.telefono}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">
              No se autorizó a ninguna persona adicional.
            </p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Salud relevante</h3>
          <ul className="mt-2 space-y-1.5">
            {salud.map(([etiqueta, respuesta, detalle]) => (
              <li key={etiqueta} className="text-sm text-ink">
                <span className="font-medium">{etiqueta}:</span>{" "}
                <span className={respuesta === "si" ? "text-accent-strong" : ""}>
                  {siNo(respuesta)}
                </span>
                {respuesta === "si" && detalle ? (
                  <span className="block text-muted">{detalle}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Seccion>

      <Seccion
        titulo="Autorizaciones"
        acciones={<Editar onClick={() => onEditar(4)} />}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <Dato
            etiqueta="Participación ordinaria"
            valor={opcionAutorizacion(valores.autorizaciones.participacion)}
          />
          <Dato
            etiqueta="Actividades externas"
            valor={
              valores.autorizaciones.externasInformado &&
              valores.autorizaciones.externasRevisa
                ? "Informado y revisión antes de cada salida"
                : "Pendiente"
            }
          />
          <Dato
            etiqueta="Imágenes y videos"
            valor={opcionAutorizacion(valores.autorizaciones.imagenes)}
          />
          <Dato
            etiqueta="Condiciones de uso"
            valor={vacio(valores.autorizaciones.imagenesCondiciones)}
          />
          <Dato
            etiqueta="Compromiso del representante"
            valor={
              valores.autorizaciones.compromiso ? "Aceptado" : "Pendiente"
            }
          />
          <Dato
            etiqueta="Grupo"
            valor={`${config.nombre} · ${config.lema}`}
          />
        </dl>
      </Seccion>

      <Aviso>
        <p className="font-semibold text-ink">Aviso de privacidad</p>
        <p className="mt-1">
          La información suministrada se utilizará únicamente para fines
          relacionados con la inscripción, organización, acompañamiento,
          seguridad y participación del menor en las actividades de{" "}
          {config.nombre}. Su acceso se limitará a las personas responsables que
          necesiten conocerla.
        </p>
        <p className="mt-1.5 text-xs">{APP.notaLegal}</p>
      </Aviso>
    </div>
  );
}
