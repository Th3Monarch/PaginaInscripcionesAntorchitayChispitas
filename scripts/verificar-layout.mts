/**
 * Verifica el PDF generado: numero de paginas, margenes y solapamientos.
 * Necesita `pdfjs-dist` (no es dependencia del proyecto):
 *   npm i -D pdfjs-dist    (o indicarlo con PDFJS_PATH)
 *   npm run verificar:pdf
 *   npm run verificar:layout -- %TEMP%\\chispita-tipico.pdf
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { carpetaFuentesPdf, rutaPdfJs } from "./herramientas.mts";

const BASE_FUENTES = carpetaFuentesPdf();

const { getDocument } = await import(pathToFileURL(rutaPdfJs()).href);

const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 44;
const TOLERANCIA = 1.5;

type Trozo = {
  pagina: number;
  texto: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
};

async function analizar(ruta: string): Promise<number> {
  const datos = new Uint8Array(await readFile(ruta));
  const doc = await getDocument({
    data: datos,
    standardFontDataUrl: pathToFileURL(BASE_FUENTES).href,
  }).promise;

  if (doc.numPages > 2) {
    console.log(`[FALLA] ${ruta}: ${doc.numPages} paginas (maximo 2)`);
    return 1;
  }

  const trozos: Trozo[] = [];
  let vacios = 0;

  for (let numero = 1; numero <= doc.numPages; numero += 1) {
    const pagina = await doc.getPage(numero);
    const contenido = await pagina.getTextContent();
    if (contenido.items.length === 0) vacios += 1;

    for (const item of contenido.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      /* transform = [escalaX, sesgoY, sesgoX, escalaY, x, y] */
      const [, , , escalaY, x, y] = item.transform as number[];
      const alto = Math.abs(escalaY) || item.height;
      trozos.push({
        pagina: numero,
        texto: item.str,
        x: x - MARGEN,
        y: ALTO - y,
        ancho: item.width,
        alto,
      });
    }
  }

  let fallos = 0;

  /* 1. Nada fuera de los margenes */
  const fuera = trozos.filter(
    (t) =>
      t.x < -TOLERANCIA ||
      t.x + t.ancho > ANCHO - MARGEN + TOLERANCIA ||
      t.y < 20 ||
      t.y + t.alto > ALTO - 18,
  );
  if (fuera.length) {
    fallos += 1;
    console.log(`[FALLA] ${ruta}: ${fuera.length} texto(s) fuera de margen`);
    fuera.slice(0, 6).forEach((t) => {
      console.log(
        `   p${t.pagina} x=${t.x.toFixed(1)} ancho=${t.ancho.toFixed(1)} y=${t.y.toFixed(1)} "${t.texto.slice(0, 40)}"`,
      );
    });
  }

  /* 2. Sin solapamientos en la misma linea */
  const solapes: string[] = [];
  for (const a of trozos) {
    for (const b of trozos) {
      if (a === b || a.pagina !== b.pagina) continue;
      const solapaX = a.x + 0.5 < b.x + b.ancho && b.x + 0.5 < a.x + a.ancho;
      const solapaY = Math.abs(a.y - b.y) < Math.max(a.alto, b.alto) * 0.55;
      if (solapaX && solapaY) {
        solapes.push(
          `p${a.pagina} "${a.texto.slice(0, 24)}"[${a.x.toFixed(0)}..${(a.x + a.ancho).toFixed(0)}] ~ "${b.texto.slice(0, 24)}"[${b.x.toFixed(0)}..${(b.x + b.ancho).toFixed(0)}] y=${a.y.toFixed(1)}/${b.y.toFixed(1)}`,
        );
      }
    }
  }
  if (solapes.length) {
    fallos += 1;
    console.log(`[FALLA] ${ruta}: ${solapes.length} solapamiento(s)`);
    [...new Set(solapes)].slice(0, 8).forEach((s) => console.log(`   ${s}`));
  }

  if (vacios) {
    fallos += 1;
    console.log(`[FALLA] ${ruta}: ${vacios} pagina(s) sin texto`);
  }

  console.log(
    `${fallos ? "[FALLA]" : "[OK]"} ${ruta.split("\\").pop()}: ${doc.numPages} pagina(s), ${trozos.length} fragmentos de texto`,
  );
  const ocupacion = [...new Set(trozos.map((t) => t.pagina))]
    .sort((a, b) => a - b)
    .map((numero) => {
      const deLaPagina = trozos.filter((t) => t.pagina === numero);
      const usado = Math.max(...deLaPagina.map((t) => t.y + t.alto));
      return `p${numero}: ${((usado / ALTO) * 100).toFixed(0)}%`;
    })
    .join(", ");
  console.log(`   ocupacion vertical -> ${ocupacion}`);
  return fallos;
}

const rutas = process.argv.slice(2);
if (!rutas.length) {
  console.log("Uso: tsx scripts/verificar-layout.mts <pdf> [<pdf> ...]");
  process.exit(1);
}
let total = 0;
for (const ruta of rutas) total += await analizar(ruta);
console.log(total ? `FALLOS: ${total}` : "PDF CORRECTO");
process.exit(total ? 1 : 0);
