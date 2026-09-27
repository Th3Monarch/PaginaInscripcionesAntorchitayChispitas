/**
 * Comprueba la parte de la lista de fichas sin tocar Supabase:
 *   1. Que el esquema del servidor acepta lo justo y rechaza lo demas.
 *   2. Que de una ficha solo sale lo minimo. Este es el test mas importante
 *      del archivo: si alguien anade un campo a registroDesde(), falla aqui.
 *   3. Que el .xlsx generado se puede volver a abrir y trae lo esperado.
 *
 *   npm run verificar:registro
 */
import { registroDesde, registroSchema, libroExcel, type FilaRegistro } from "../lib/registro";
import type { EnrollmentValues } from "../lib/schemas";

const fallos: string[] = [];
function comprobar(ok: boolean, mensaje: string) {
  console.log(`${ok ? "[OK]" : "[FALLA]"} ${mensaje}`);
  if (!ok) fallos.push(mensaje);
}

/* ---------------------------------------------------------------- */
/* 1. Esquema                                                       */
/* ---------------------------------------------------------------- */

const bueno = {
  envio: crypto.randomUUID(),
  grupo: "chispita",
  participante: "Ana Lucía Pérez",
  contacto: "8095559876",
};

comprobar(registroSchema.safeParse(bueno).success, "Acepta un registro bien formado");

for (const [nombre, caso] of Object.entries({
  "sin envio": { ...bueno, envio: undefined },
  "envio que no es uuid": { ...bueno, envio: "abc" },
  "grupo desconocido": { ...bueno, grupo: "inventado" },
  "participante cortisimo": { ...bueno, participante: "Ana" },
  "contacto enorme": { ...bueno, contacto: "8".repeat(31) },
})) {
  comprobar(!registroSchema.safeParse(caso).success, `Rechaza ${nombre}`);
}

/* ---------------------------------------------------------------- */
/* 2. Minimizacion de datos                                         */
/* ---------------------------------------------------------------- */

const valores = {
  grupo: "antorchita",
  participante: {
    nombres: "Ana Lucía Pérez",
    fechaNacimiento: "2014-03-02",
    grado: "4.º",
    institucion: "Colegio X",
    telefonoFamiliar: "8091112222",
    correoFamiliar: "familia@correo.do",
    direccion: "Calle 1 #2",
  },
  representante: {
    nombres: "María Pérez",
    parentesco: "Madre",
    telefonoPrincipal: "8095559876",
    telefonoAlternativo: "",
    correo: "ana@correo.do",
    documento: "001-1234567-8",
  },
  emergencia: { nombres: "José Pérez", parentesco: "Abuelo", telefono: "8093334444", telefonoAlternativo: "" },
  autorizados: [],
  salud: { alergias: "Ninguna", medicamentos: "", notas: "" },
  autorizaciones: {
    participacion: "autorizo",
    externasInformado: true,
    externasRevisa: true,
    imagenes: "autorizo",
    imagenesCondiciones: "",
    compromiso: true,
  },
} as unknown as EnrollmentValues;

const enviado = registroDesde(valores, crypto.randomUUID());
const claves = Object.keys(enviado).sort();

comprobar(
  claves.join(",") === "contacto,envio,grupo,participante",
  `Solo salen las cuatro columnas acordadas (${claves.join(", ")})`,
);

const serializado = JSON.stringify(enviado);
for (const prohibido of ["001-1234567-8", "2014-03-02", "María Pérez", "Colegio X", "alergias", "Calle 1"]) {
  comprobar(
    !serializado.includes(prohibido),
    `El registro no contiene «${prohibido}»`,
  );
}

/* ---------------------------------------------------------------- */
/* 3. Libro de Excel                                                */
/* ---------------------------------------------------------------- */

const filas: FilaRegistro[] = [
  {
    envio: crypto.randomUUID(),
    recibido: new Date("2026-03-01T15:04:00Z").toISOString(),
    grupo: "chispita",
    participante: "Ana Lucía Pérez",
    contacto: "8095559876",
  },
  {
    envio: crypto.randomUUID(),
    recibido: new Date("2026-03-02T18:30:00Z").toISOString(),
    grupo: "antorchita",
    participante: "Luis Martínez",
    contacto: null,
  },
];

const bytes = await libroExcel(filas);
comprobar(bytes.length > 2000, `El .xlsx tiene contenido (${bytes.length} bytes)`);
comprobar(
  bytes[0] === 0x50 && bytes[1] === 0x4b,
  "El archivo empieza como ZIP, que es lo que espera Excel",
);

const { default: ExcelJS } = await import("exceljs");
const abierto = new ExcelJS.Workbook();
await abierto.xlsx.load(bytes);
const hoja = abierto.getWorksheet("Inscripciones");

comprobar(hoja !== undefined, "El libro se puede volver a abrir");
if (hoja) {
  const cabeceras = (hoja.getRow(1).values as unknown[]).slice(1).map(String);
  comprobar(
    cabeceras.join(",") === "Recibido,Grupo,Participante,Contacto",
    `Las columnas son las acordadas (${cabeceras.join(", ")})`,
  );
  comprobar(hoja.rowCount === filas.length + 1, `Hay ${filas.length} filas de datos`);
  comprobar(
    String((hoja.getRow(3).values as unknown[])[3] ?? "") === "Luis Martínez",
    "La segunda fila conserva al participante",
  );
}

console.log(
  fallos.length === 0
    ? "REGISTRO CORRECTO"
    : `REGISTRO CON ${fallos.length} FALLA(S)`,
);
process.exit(fallos.length === 0 ? 0 : 1);
