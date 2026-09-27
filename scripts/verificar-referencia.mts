/**
 * Comprueba la lógica de referencia de edad y grado: lectura de grados escritos
 * de cualquier forma y evaluación de la desviación por grupo.
 * Uso: npx tsx scripts/verificar-referencia.mts
 */
import { evaluarReferencia, numeroGrado } from "../lib/referencia";

let fallos = 0;

function igual(etiqueta: string, obtenido: unknown, esperado: unknown) {
  if (obtenido !== esperado) {
    fallos += 1;
    console.error(
      `FALLA ${etiqueta}: obtenido ${JSON.stringify(obtenido)}, esperado ${JSON.stringify(esperado)}`,
    );
  }
}

const GRADOS: [string, number | null][] = [
  ["2.º", 2],
  ["4to", 4],
  ["1.er", 1],
  ["3°", 3],
  ["6", 6],
  ["cuarto", 4],
  ["Quinto de primaria", 5],
  ["SEXTO", 6],
  ["2do de secundaria", 2],
  ["1.º grado", 1],
  ["  5  ", 5],
  ["once", 11],
  ["K", null],
  ["Pre-k", null],
  ["", null],
  ["sin definir", null],
];

for (const [texto, esperado] of GRADOS) {
  igual(`grado ${JSON.stringify(texto)}`, numeroGrado(texto), esperado);
}

const CASOS: [("chispita" | "antorchita"), number, string, boolean][] = [
  ["chispita", 7, "2.º", false],
  ["chispita", 6, "1.º", false],
  ["chispita", 9, "3.º", false],
  ["chispita", 10, "2.º", true],
  ["chispita", 7, "4.º", true],
  ["chispita", 7, "", false],
  ["chispita", 5, "K", true],
  ["antorchita", 10, "4.º", false],
  ["antorchita", 13, "6.º", false],
  ["antorchita", 9, "5.º", true],
  ["antorchita", 14, "7.º", true],
  ["antorchita", 11, "3.er", true],
  ["antorchita", 11, "Cuarto", false],
];

for (const [grupo, edad, grado, esperado] of CASOS) {
  const resultado = evaluarReferencia(grupo, { edad, grado });
  igual(`${grupo} ${edad} "${grado}"`, resultado.hayDesviacion, esperado);
}

const doble = evaluarReferencia("antorchita", { edad: 14, grado: "7.º" });
igual("marca edad fuera", doble.edadFuera, true);
igual("marca grado fuera", doble.gradoFuera, true);
igual("un detalle por dato", doble.detalles.length, 2);
igual("texto resumen menciona edad", doble.resumen.includes("14 años"), true);
igual("texto resumen menciona grado", doble.resumen.includes("7.º"), true);
igual("texto resumen menciona la referencia", doble.resumen.includes("10 a 13 años"), true);
igual(
  "cada detalle termina en punto",
  doble.detalles.every((detalle) => detalle.endsWith(".")),
  true,
);

const indeterminable = evaluarReferencia("chispita", { edad: 7, grado: "K" });
igual("grado indeterminado no bloquea", indeterminable.hayDesviacion, false);
igual("marca indeterminado", indeterminable.gradoIndeterminado, true);

console.log(`Caso mostrado: ${doble.resumen}`);

if (fallos > 0) {
  console.error(`\n${fallos} FALLAS en la referencia de edad y grado`);
  process.exit(1);
}
console.log("\nREFERENCIA CORRECTA");
