/**
 * Comprueba que el PDF generado no usa operadores de color.
 * Necesita `pdfjs-dist` (no es dependencia del proyecto):
 *   npm i -D pdfjs-dist    (o indicarlo con PDFJS_PATH)
 *   npm run verificar:pdf
 *   npm run verificar:gris -- %TEMP%\\chispita-tipico.pdf
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { carpetaFuentesPdf, rutaPdfJs } from "./herramientas.mts";

const STANDARD_FONTS = carpetaFuentesPdf();

const { getDocument, OPS } = await import(pathToFileURL(rutaPdfJs()).href);

const arch = process.argv.slice(2);
let fallos = 0;
const comprobar = (ok: boolean, texto: string) => {
  console.log(`${ok ? "[OK]  " : "[FALLA]"} ${texto}`);
  if (!ok) fallos += 1;
};

for (const ruta of arch) {
  const datos = await readFile(ruta);
  const doc = await getDocument({
    data: new Uint8Array(datos),
    standardFontDataUrl: pathToFileURL(STANDARD_FONTS).href,
  }).promise;

  /* 1. Todo el color debe ser gris (r === g === b). */
  const colores: Array<{ r: number; g: number; b: number }> = [];
  let texto = "";
  for (let n = 1; n <= doc.numPages; n += 1) {
    const pagina = await doc.getPage(n);
    const ops = await pagina.getOperatorList();
    for (let i = 0; i < ops.fnArray.length; i += 1) {
      const fn = ops.fnArray[i];
      if (
        fn === OPS.setFillRGBColor ||
        fn === OPS.setStrokeRGBColor ||
        fn === OPS.setFillGray ||
        fn === OPS.setStrokeGray
      ) {
        colores.push({ r: ops.argsArray[i][0], g: ops.argsArray[i][1], b: ops.argsArray[i][2] });
      }
    }
    const contenido = await pagina.getTextContent();
    texto += contenido.items
      .map((i) => ("str" in i ? i.str : ""))
      .join(" ") + "\n";
  }

  const conColor = colores.filter(
    (c) => Math.abs(c.r - c.g) > 0.001 || Math.abs(c.g - c.b) > 0.001,
  );
  const nombre = ruta.split(/[\\/]/).pop();
  comprobar(
    conColor.length === 0,
    `${nombre}: ${colores.length} operadores de color, ${conColor.length} con color (0 = solo gris)` +
      (conColor.length ? ` -> ${JSON.stringify(conColor.slice(0, 3))}` : ""),
  );

  const plano = texto.replace(/\s+/g, " ");
  const esperaChispita = /chispita/i.test(plano);
  comprobar(
    plano.includes("COMUNIDAD DOMINICANA"),
    `${nombre}: aparece "COMUNIDAD DOMINICANA"`,
  );
  comprobar(
    !/IGLESIA/i.test(plano),
    `${nombre}: ya NO aparece "IGLESIA"`,
  );
  const grupo = esperaChispita ? "Chispita" : "Antorchita";
  comprobar(
    plano.includes(`Grupo Juvenil Dominicano ${grupo}`),
    `${nombre}: aparece "Grupo Juvenil Dominicano ${grupo}"`,
  );
  comprobar(
    !/Grupos Infantiles/i.test(plano),
    `${nombre}: ya NO aparece "Grupos Infantiles Dominicanos"`,
  );
  console.log(
    `        portadas: ${plano.slice(0, 150).trim()}`,
  );
  console.log("");
}

console.log(fallos === 0 ? "PDF EN BLANCO Y NEGRO CORRECTO" : `FALLOS: ${fallos}`);
process.exit(fallos === 0 ? 0 : 1);
