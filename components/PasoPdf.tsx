"use client";

import { useEffect, useState } from "react";
import { Aviso } from "@/components/ui/Campos";
import { Boton, Seccion } from "@/components/ui/Layout";
import { GRUPOS, type GroupId } from "@/lib/config";
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
}: {
  valores: EnrollmentValues;
  grupo: GroupId;
  onSalir: () => void;
}) {
  const [pdf, setPdf] = useState<ResultadoPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const config = GRUPOS[grupo];

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
              <Boton type="button" variante="fantasma" onClick={onSalir}>
                Volver al inicio y borrar el borrador
              </Boton>
            </div>
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
