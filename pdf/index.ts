"use client";

import { APP } from "@/lib/config";
import { nombreArchivo } from "@/lib/format";
import type { EnrollmentValues } from "@/lib/schemas";
import { construirFicha } from "./ficha";

export type ResultadoPdf = {
  blob: Blob;
  archivo: string;
  paginas: number;
};

async function cargarLogo(): Promise<Uint8Array | undefined> {
  try {
    const respuesta = await fetch(APP.logoPath, { cache: "no-store" });
    if (!respuesta.ok) return undefined;
    const tipo = respuesta.headers.get("content-type") ?? "";
    if (!tipo.includes("png")) return undefined;
    return new Uint8Array(await respuesta.arrayBuffer());
  } catch {
    return undefined;
  }
}

/**
 * El logo oficial lleva color y asi se incrusta: en la ficha lo unico que va a
 * color es el logo; el resto del documento es estrictamente blanco y negro. Si
 * el logo no esta disponible, la ficha se genera sin el.
 */
export async function generarPDF(
  valores: EnrollmentValues,
): Promise<ResultadoPdf> {
  const logo = await cargarLogo();
  const { bytes, paginas } = await construirFicha(valores, logo);
  const archivo = nombreArchivo(valores.grupo, valores.participante.nombres);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return { blob: new Blob([buffer], { type: "application/pdf" }), archivo, paginas };
}

export function descargarPDF(blob: Blob, archivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  enlace.rel = "noopener";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function abrirParaImprimir(blob: Blob): boolean {
  const url = URL.createObjectURL(blob);
  const ventana = window.open(url, "_blank", "noopener");
  if (!ventana) return false;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
