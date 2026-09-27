/**
 * Localiza las herramientas de verificación sin imponerlas como dependencias
 * del proyecto (así el despliegue de Vercel no las arrastra).
 *
 * Busca en este orden, y el primer sitio que exista gana:
 *   1. la variable de entorno indicada
 *   2. ./node_modules del proyecto            (npm i -D <paquete>)
 *   3. ../tools/node_modules junto al repo    (instalación local de la casa)
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const RUTAS = [
  process.cwd(),
  resolve(process.cwd(), "..", "tools"),
  resolve(process.cwd(), "..", "..", "tools"),
];

function buscar(nombrePaquete: string, archivoRelativo: string): string {
  for (const raiz of RUTAS) {
    const candidato = join(raiz, "node_modules", nombrePaquete, archivoRelativo);
    if (existsSync(candidato)) return candidato;
  }
  throw new Error(
    `No se encuentra ${nombrePaquete}. Instálalo con "npm i -D ${nombrePaquete}" o ` +
      `indica la ruta en la variable de entorno correspondiente.`,
  );
}

function conRaiz(valor: string | undefined, sufijo: string): string {
  if (!valor) return "";
  const completa = valor.endsWith(sufijo) ? valor : valor + sufijo;
  return existsSync(completa) ? completa : "";
}

export function rutaPuppeteer(): string {
  if (process.env.PUPPETEER_PATH && existsSync(process.env.PUPPETEER_PATH)) {
    return process.env.PUPPETEER_PATH;
  }
  return buscar("puppeteer-core", join("lib", "puppeteer", "puppeteer-core.js"));
}

export function rutaPdfJs(): string {
  if (process.env.PDFJS_PATH) {
    const directa = join(process.env.PDFJS_PATH, "legacy", "build", "pdf.mjs");
    if (existsSync(directa)) return directa;
  }
  return buscar("pdfjs-dist", join("legacy", "build", "pdf.mjs"));
}

export function carpetaFuentesPdf(): string {
  const indicada = conRaiz(process.env.PDFJS_FONTS, "\\");
  if (indicada) return indicada;
  return buscar("pdfjs-dist", join("standard_fonts", "")) + "\\";
}
