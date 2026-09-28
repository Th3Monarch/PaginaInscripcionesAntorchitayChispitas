/**
 * Comprueba la parte de la lista de fichas sin tocar Supabase:
 *   1. Que el esquema del servidor acepta lo justo y rechaza lo demas.
 *   2. Que de una ficha sale el detalle acordado (participante, representante
 *      con su documento, emergencia y autorizados) y NADA de salud ni de
 *      autorizaciones. Este es el test mas importante del archivo.
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

const conDetalle = {
  ...bueno,
  detalle: {
    participante: {
      fechaNacimiento: "2014-03-02",
      grado: "4.º",
      institucion: "Colegio X",
      telefonoFamiliar: "8091112222",
      correoFamiliar: "familia@correo.do",
    },
    representante: {
      nombres: "María Pérez",
      parentesco: "Madre",
      telefonoPrincipal: "8095559876",
      correo: "ana@correo.do",
    },
    emergencia: {
      nombres: "José Pérez",
      parentesco: "Abuelo",
      telefono: "8093334444",
    },
    autorizados: [],
  },
};
comprobar(
  registroSchema.safeParse(conDetalle).success,
  "Acepta un registro con el detalle completo",
);

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
/* 2. Que sale de una ficha                                          */
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
  autorizados: [
    {
      nombres: "Tía Rosa",
      parentesco: "Tía",
      telefono: "8295554321",
      autorizada: true,
    },
  ],
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
  claves.join(",") === "contacto,detalle,envio,grupo,participante",
  `Salen las cinco columnas acordadas (${claves.join(", ")})`,
);

const serializado = JSON.stringify(enviado);
for (const pedido of ["001-1234567-8", "2014-03-02", "María Pérez", "Colegio X", "Calle 1", "8093334444", "Tía Rosa"]) {
  comprobar(
    serializado.includes(pedido),
    `El registro incluye lo que pidio la coordinacion: «${pedido}»`,
  );
}
for (const fuera of ["alergias", "externasInformado", "participacion", "imagenes", "compromiso"]) {
  comprobar(
    !serializado.includes(fuera),
    `El registro NO contiene datos de salud ni autorizaciones («${fuera}»)`,
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

const CABECERAS = "Recibido,Grupo,Participante completo,Edad,Fecha de nacimiento,Grado,Institución educativa,Teléfono (familia),Correo (familia),Dirección,Representante,Parentesco,Teléfono principal,Teléfono alternativo,Correo,Documento de identidad,Contacto de emergencia,Parentesco,Teléfono principal,Teléfono alternativo";

comprobar(hoja !== undefined, "El libro se puede volver a abrir");
if (hoja) {
  const cabeceras = (hoja.getRow(1).values as unknown[]).slice(1).map(String);
  comprobar(
    cabeceras.join(",") === CABECERAS,
    `Las columnas son las acordadas (${cabeceras.join(", ")})`,
  );
  comprobar(
    hoja.getCell(1, 3).value === "Participante completo" &&
      hoja.getCell(1, 11).value === "Representante" &&
      hoja.getCell(1, 17).value === "Contacto de emergencia" &&
      (hoja.model.merges ?? []).length === 0,
    "La primera fila trae los 20 encabezados, sin agrupar por bloques",
  );
  comprobar(hoja.rowCount === filas.length + 1, `Hay ${filas.length} filas de datos`);
  comprobar(
    String((hoja.getRow(2).values as unknown[])[4] ?? "") === "—",
    "Una fila sin detalle rellena la edad con guion",
  );
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