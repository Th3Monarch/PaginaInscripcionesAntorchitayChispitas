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
 * El logo oficial tiene color, pero la ficha se imprime en blanco y negro:
 * se convierte a escala de grises antes de incrustarlo. Si la conversión
 * falla, el logo se omite en lugar de risking un PDF con color.
 */
async function logoEnGris(bytes: Uint8Array): Promise<Uint8Array | undefined> {
  try {
    const bitmap = await createImageBitmap(
      new Blob([bytes as BlobPart], { type: "image/png" }),
    );
    const lienzo = document.createElement("canvas");
    lienzo.width = bitmap.width;
    lienzo.height = bitmap.height;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imagen = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
    const px = imagen.data;
    for (let i = 0; i < px.length; i += 4) {
      const y = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      px[i] = y;
      px[i + 1] = y;
      px[i + 2] = y;
    }
    ctx.putImageData(imagen, 0, 0);
    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, "image/png"),
    );
    if (!blob) return undefined;
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    return undefined;
  }
}

export async function generarPDF(
  valores: EnrollmentValues,
): Promise<ResultadoPdf> {
  const original = await cargarLogo();
  const logo = original ? await logoEnGris(original) : undefined;
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
