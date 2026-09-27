"use client";

import { useEffect, useState } from "react";
import { Aviso } from "@/components/ui/Campos";
import { Boton, Seccion } from "@/components/ui/Layout";
import { GRUPOS, type GroupId } from "@/lib/config";
import { idEnvio, olvidarEnvio, registrarInscripcion } from "@/lib/envio";
import type { EnrollmentValues } from "@/lib/schemas";
import {
  abrirParaImprimir,
  descargarPDF,
  generarPDF,
  type ResultadoPdf,
} from "@/pdf";

export function PasoPdf({
  valores,
  grupo,
  onSalir,
  registroActivo = false,
}: {
  valores: EnrollmentValues;
  grupo: GroupId;
  onSalir: () => void;
  registroActivo?: boolean;
}) {
  const [pdf, setPdf] = useState<ResultadoPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentido, setConsentido] = useState(false);
  const [envio, setEnvio] = useState<
    "pendiente" | "guardado" | "no-configurado" | "fallo"
  >("pendiente");
  const config = GRUPOS[grupo];

  /* El aviso a la coordinacion sale solo despues de que la familia marque la
   * casilla, y una unica vez por envio. */
  useEffect(() => {
    if (!consentido || envio !== "pendiente") return;

    let vigente = true;
    const id = idEnvio(grupo);
    registrarInscripcion(valores, id).then((resultado) => {
      if (!vigente) return;
      if (resultado.estado === "fallo") {
        setEnvio("fallo");
        return;
      }
      setEnvio(
        resultado.estado === "no-configurado" ? "no-configurado" : "guardado",
      );
    });

    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentido, envio, grupo]);

  useEffect(() => {
    let vigente = true;
    generarPDF(valores)
      .then((resultado) => {
        if (!vigente) return;
        if (resultado.paginas > 2) {
          console.error(
            `[ficha] la ficha de ${grupo} ocupa ${resultado.paginas} páginas; el máximo es 2`,
          );
        }
        setPdf(resultado);
      })
      .catch((fallo: unknown) => {
        if (!vigente) return;
        setError(
          fallo instanceof Error
            ? fallo.message
            : "No se pudo generar la ficha. Intenta de nuevo.",
        );
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <Seccion
        titulo="Ficha lista"
        descripcion={`${config.tituloLargo} · ${config.lema}`}
      >
        {error ? (
          <Aviso tono="alerta">{error}</Aviso>
        ) : pdf ? (
          <>
            <Aviso tono="exito">
              La ficha se generó correctamente con los datos de{" "}
              <strong>{valores.participante.nombres}</strong> para{" "}
              {config.nombre}. Descárgala, imprímela y entrégala firmada a la
              coordinación.
            </Aviso>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Archivo
                </dt>
                <dd className="mt-0.5 break-all text-ink">{pdf.archivo}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Páginas
                </dt>
                <dd className="mt-0.5 text-ink">
                  {pdf.paginas} {pdf.paginas === 1 ? "página" : "páginas"}
                </dd>
              </div>
            </dl>

            <div
              className="flex flex-wrap gap-3"
              data-pdf-listo
              data-pdf-paginas={pdf.paginas}
              data-pdf-archivo={pdf.archivo}
            >
              <Boton
                type="button"
                onClick={() => descargarPDF(pdf.blob, pdf.archivo)}
              >
                Descargar PDF
              </Boton>
              <Boton
                type="button"
                variante="secundario"
                onClick={() => {
                  const abierto = abrirParaImprimir(pdf.blob);
                  if (!abierto) {
                    setError(
                      "El navegador bloqueó la ventana de impresión. Usa «Descargar PDF» y ábrelo manualmente.",
                    );
                  }
                }}
              >
                Abrir para imprimir
              </Boton>
              <Boton
                type="button"
                variante="fantasma"
                onClick={() => {
                  olvidarEnvio(grupo);
                  onSalir();
                }}
              >
                Volver al inicio y borrar el borrador
              </Boton>
            </div>

            {registroActivo ? (
              <div
                className="rounded-lg border border-line bg-cream-deep p-3"
                data-registro={envio}
              >
                <label
                  htmlFor="casilla-registro"
                  className="flex cursor-pointer items-start gap-3"
                >
                  <input
                    id="casilla-registro"
                    type="checkbox"
                    checked={consentido}
                    disabled={envio !== "pendiente"}
                    onChange={(e) => setConsentido(e.target.checked)}
                    className="mt-0.5 size-6 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="text-sm leading-snug">
                    <span className="font-medium text-ink">
                      Avisar a la coordinación de que hay una ficha nueva
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      Al marcar esto se envía a la coordinación el nombre de{" "}
                      {valores.participante.nombres}, el grupo y un teléfono de
                      contacto. No se envía el documento de identidad, la fecha
                      de nacimiento ni los datos de salud: eso solo viaja en el
                      papel que entregas firmado.
                    </span>
                  </span>
                </label>

                {envio === "guardado" ? (
                  <p
                    className="mt-2 text-xs font-medium text-[#3c5320]"
                    role="status"
                  >
                    Aviso enviado. La coordinación ya sabe que hay una ficha
                    lista para recoger.
                  </p>
                ) : null}
                {envio === "no-configurado" ? (
                  <p className="mt-2 text-xs text-muted" role="status">
                    En este entorno no hay registro configurado, así que no se
                    envió nada. Tu ficha está igual.
                  </p>
                ) : null}
                {envio === "fallo" ? (
                  <p
                    className="mt-2 text-xs font-medium text-[#7d1d12]"
                    role="alert"
                  >
                    No pudimos avisar a la coordinación, pero tu ficha está
                    lista. Entrégala firmada y avisa a la coordinación.
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted" role="status">
            Generando la ficha en PDF…
          </p>
        )}
      </Seccion>

      <Aviso>
        <p className="font-semibold text-ink">Antes de imprimir</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>
            La firma del representante y la fecha se completan a mano en el
            papel.
          </li>
          <li>
            El bloque «Uso exclusivo de la coordinación» lo completa el equipo
            responsable, no la familia.
          </li>
          <li>
            El bloque de imágenes es independiente: la inscripción no depende
            de esa autorización.
          </li>
        </ul>
      </Aviso>
    </div>
  );
}
