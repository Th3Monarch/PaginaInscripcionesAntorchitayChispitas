/**
 * Comprueba el Excel que descarga la coordinacion.
 *
 * No necesita ni servidor ni Supabase: genera el archivo con datos de ejemplo
 * y revisa hojas, encabezados y valores. Asi se puede verificar el Excel sin
 * exponer datos reales.
 *
 *   npm run e2e:excel
 */
import ExcelJS from "exceljs";
import { libroExcel, type FilaRegistro } from "../lib/registro.ts";

const fallos: string[] = [];
function comprobar(ok: boolean, mensaje: string) {
  console.log(`${ok ? "[OK]" : "[FALLA]"} ${mensaje}`);
  if (!ok) fallos.push(mensaje);
}

const fichaActual: FilaRegistro = {
  envio: "11111111-1111-4111-8111-111111111111",
  recibido: "2026-09-27T10:00:00.000Z",
  grupo: "chispita",
  participante: "María del Carmen Pérez",
  contacto: "8095551234",
  detalle: {
    participante: {
      fechaNacimiento: "2018-04-12",
      grado: "2.º",
      institucion: "Colegio Luz del Alba",
      telefonoFamiliar: "8095551234",
      correoFamiliar: "mama@ejemplo.com",
      direccion: "Calle 5, La Romana",
    },
    representante: {
      nombres: "Juana Pérez",
      parentesco: "Madre",
      telefonoPrincipal: "8095551234",
      telefonoAlternativo: "8295555678",
      correo: "mama@ejemplo.com",
      documento: "001-2345678-9",
    },
    emergencia: {
      nombres: "Luis Pérez",
      parentesco: "Padre",
      telefono: "8095559999",
      telefonoAlternativo: "8495551111",
    },
    autorizados: [
      { nombres: "Abuela Luisa", parentesco: "Abuela", telefono: "8295550000", autorizada: true },
      { nombres: "Tía Rosa", parentesco: "Tía", telefono: "8495552222", autorizada: false },
    ],
  },
};

/* Fila guardada antes de la ampliacion: sin detalle. No debe romper el
 * archivo ni inventarse datos. */
const fichaAntigua: FilaRegistro = {
  envio: "22222222-2222-4222-8222-222222222222",
  recibido: "2026-09-20T15:30:00.000Z",
  grupo: "antorchita",
  participante: "Pedro López",
  contacto: null,
};

const bytes = await libroExcel([fichaActual, fichaAntigua]);
const libro = new ExcelJS.Workbook();
await libro.xlsx.load(bytes as unknown as ArrayBuffer);

comprobar(
  libro.worksheets.length === 3,
  `Tiene tres hojas (Inscripciones, Autorizadas, Resumen): ${libro.worksheets
    .map((h) => h.name)
    .join(", ")}`,
);

const fichas = libro.getWorksheet("Inscripciones");
const autorizadas = libro.getWorksheet("Autorizadas");
const resumen = libro.getWorksheet("Resumen");

/* Cabeceras de la hoja principal. */
const cabeceras = ["Recibido", "Grupo", "Participante", "Edad", "Fecha de nacimiento", "Grado", "Institución educativa", "Teléfono (familia)", "Correo (familia)", "Dirección", "Representante", "Parentesco", "Tel. representante", "Tel. alternativo", "Correo representante", "Documento de identidad", "Emergencia", "Parentesco", "Tel. emergencia", "Tel. emergencia alt."];
for (let c = 1; c <= cabeceras.length; c++) {
  comprobar(
    fichas.getCell(1, c).value === cabeceras[c - 1],
    `Columna ${c} se llama "${cabeceras[c - 1]}"`,
  );
}

/* Ficha con detalle: valores del participante y del representante. */
const filaNueva = 2;
const celda = (hoja: ExcelJS.Worksheet, fila: number, columna: number) =>
  String(hoja.getCell(fila, columna).value ?? "");
comprobar(
  celda(fichas, filaNueva, 3) === "María del Carmen Pérez",
  "El nombre del participante se exporta",
);
comprobar(
  celda(fichas, filaNueva, 4).includes("años") &&
    celda(fichas, filaNueva, 4) !== "—",
  `La edad se calcula (${celda(fichas, filaNueva, 4)})`,
);
comprobar(
  celda(fichas, filaNueva, 5) === "12 / 04 / 2018",
  `Fecha de nacimiento formateada (${celda(fichas, filaNueva, 5)})`,
);
comprobar(
  celda(fichas, filaNueva, 7) === "Colegio Luz del Alba",
  "La institución educativa se exporta",
);
comprobar(
  celda(fichas, filaNueva, 11) === "Juana Pérez",
  "El representante se exporta",
);
comprobar(
  celda(fichas, filaNueva, 16) === "001-2345678-9",
  "El documento de identidad del representante se exporta",
);
comprobar(
  celda(fichas, filaNueva, 19) === "8095559999",
  "El teléfono de emergencia se exporta",
);

/* Ficha antigua: sin detalle, los campos se rellenan con guion. */
const filaVieja = 3;
comprobar(
  celda(fichas, filaVieja, 3) === "Pedro López",
  "La fila antigua sigue apareciendo",
);
comprobar(
  celda(fichas, filaVieja, 4) === "—" && celda(fichas, filaVieja, 11) === "—",
  "La fila antigua no inventa datos (edad y representante en guion)",
);

/* Hoja de personas autorizadas: una fila por persona. */
const totalAutorizadas =
  autorizadas.actualRowCount - 1;
comprobar(
  totalAutorizadas === 2,
  `Autorizadas: dos filas para dos personas (${totalAutorizadas})`,
);
comprobar(
  celda(autorizadas, 2, 5) === "Abuela Luisa" &&
    celda(autorizadas, 2, 4) === "Sí",
  "La persona autorizada sale con su nombre y autorizacion",
);
comprobar(
  celda(autorizadas, 3, 5) === "Tía Rosa" && celda(autorizadas, 3, 4) === "No",
  "La segunda persona autorizada sale como No",
);

/* Hoja de resumen: total y por grupo. */
const celdasResumen = new Map<string, string>();
resumen.eachRow((fila) => {
  const concepto = String(fila.getCell(1).value ?? "");
  const valor = String(fila.getCell(2).value ?? "");
  if (concepto) celdasResumen.set(concepto, valor);
});
comprobar(celdasResumen.get("Total de fichas") === "2", "Resumen: total de 2 fichas");
comprobar(
  (celdasResumen.get("Chispita") ?? "").includes("50 %"),
  `Resumen: Chispita con el 50 % (${celdasResumen.get("Chispita")})`,
);
comprobar(
  (celdasResumen.get("Antorchita") ?? "").includes("50 %"),
  `Resumen: Antorchita con el 50 % (${celdasResumen.get("Antorchita")})`,
);

console.log(
  fallos.length === 0 ? "EXCEL CORRECTO" : `EXCEL CON ${fallos.length} FALLA(S)`,
);
process.exit(fallos.length === 0 ? 0 : 1);