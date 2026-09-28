import { z } from "zod";
import { isGroupId, GRUPOS, type GroupId } from "./config";
import { calcularEdad, formatFechaDMY } from "./format";
import type { EnrollmentValues } from "./schemas";
import { mostrarTelefono } from "./telefono";

/**
 * Lo que sale del navegador hacia el servidor.
 *
 * Cada campo de aqui se guarda en una base de datos consultable desde
 * internet. La coordinacion pidio, ademas del aviso, el detalle util de la
 * ficha: participante (con fecha de nacimiento, grado, institucion y
 * contacto), representante (incluido su documento de identidad), contacto de
 * emergencia y personas autorizadas.
 *
 * Datos que hoy NO se guardan: los datos de salud, el bloque de autorizaciones
 * (participacion, actividades externas e imagenes) y las condiciones anotadas.
 */
export const registroSchema = z.object({
  /** Id de este envio. Establece la fila, asi que repetirlo no duplica. */
  envio: z.string().uuid(),
  grupo: z.string().refine(isGroupId, "Grupo desconocido"),
  participante: z.string().trim().min(4, "Falta el nombre").max(120),
  contacto: z.string().trim().max(30).optional(),

  /** Detalle de la ficha. La columna `detalle` de la tabla es jsonb. */
  detalle: z
    .object({
      participante: z.object({
        fechaNacimiento: z.string(),
        grado: z.string(),
        institucion: z.string(),
        telefonoFamiliar: z.string(),
        correoFamiliar: z.string(),
        direccion: z.string().optional(),
      }),
      representante: z.object({
        nombres: z.string(),
        parentesco: z.string(),
        telefonoPrincipal: z.string(),
        telefonoAlternativo: z.string().optional(),
        correo: z.string(),
        documento: z.string().optional(),
      }),
      emergencia: z.object({
        nombres: z.string(),
        parentesco: z.string(),
        telefono: z.string(),
        telefonoAlternativo: z.string().optional(),
      }),
      autorizados: z
        .array(
          z.object({
            nombres: z.string(),
            parentesco: z.string(),
            telefono: z.string(),
            autorizada: z.boolean(),
          }),
        )
        .max(8),
    })
    .optional(),
});

export type Registro = z.infer<typeof registroSchema>;

export type DetalleRegistro = Exclude<Registro["detalle"], undefined>;

export type FilaRegistro = {
  envio: string;
  recibido: string;
  grupo: string;
  participante: string;
  contacto: string | null;
  detalle?: DetalleRegistro | null;
};

export const TABLA = "inscripciones";

/**
 * Unico punto donde se decide que datos se van. Si esto cambia, revisa tambien
 * el texto de privacidad de la portada y de la documentacion.
 */
export function registroDesde(
  valores: EnrollmentValues,
  envio: string,
): Registro {
  return {
    envio,
    grupo: valores.grupo,
    participante: valores.participante.nombres,
    contacto: valores.representante.telefonoPrincipal || undefined,
    detalle: {
      participante: {
        fechaNacimiento: valores.participante.fechaNacimiento,
        grado: valores.participante.grado,
        institucion: valores.participante.institucion,
        telefonoFamiliar: valores.participante.telefonoFamiliar,
        correoFamiliar: valores.participante.correoFamiliar,
        direccion: valores.participante.direccion.trim() || undefined,
      },
      representante: {
        nombres: valores.representante.nombres,
        parentesco: valores.representante.parentesco,
        telefonoPrincipal: valores.representante.telefonoPrincipal,
        telefonoAlternativo:
          valores.representante.telefonoAlternativo.trim() || undefined,
        correo: valores.representante.correo,
        documento: valores.representante.documento.trim() || undefined,
      },
      emergencia: {
        nombres: valores.emergencia.nombres,
        parentesco: valores.emergencia.parentesco,
        telefono: valores.emergencia.telefono,
        telefonoAlternativo:
          valores.emergencia.telefonoAlternativo.trim() || undefined,
      },
      autorizados: valores.autorizados
        .filter(
          (persona) =>
            persona.nombres.trim() !== "" &&
            persona.parentesco.trim() !== "" &&
            persona.telefono.trim() !== "",
        )
        .map((persona) => ({
          nombres: persona.nombres.trim(),
          parentesco: persona.parentesco.trim(),
          telefono: persona.telefono.trim(),
          autorizada: persona.autorizada,
        })),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Excel para la coordinacion                                          */
/* ------------------------------------------------------------------ */

/** Recibe algo opcional y devuelve texto o un guion, sin espacios sueltos. */
function celula(valor: unknown): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return texto.length ? texto : "—";
}

/** Nombre humano del grupo, para que el archivo no use identificadores. */
function nombreGrupo(id: string): string {
  return isGroupId(id) ? GRUPOS[id as GroupId].nombre : id;
}

/** Detalle normalizado a cadenas; las filas antiguas lo tienen vacio. */
function detalleDe(fila: FilaRegistro): DetalleRegistro | null {
  return fila.detalle ?? null;
}

const BORDE = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
} as const;

/** Encabezados negros con texto blanco y centrado, como el tono del PDF. */
const ENCABEZADO: Record<string, unknown> = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF000000" },
  },
  alignment: { vertical: "middle", horizontal: "center", wrapText: true },
};

export const COLUMNAS_INSCRIPCIONES = [
  { header: "Recibido", key: "recibido", width: 17 },
  { header: "Grupo", key: "grupo", width: 12 },
  { header: "Participante completo", key: "participante", width: 26 },
  { header: "Edad", key: "edad", width: 8 },
  { header: "Fecha de nacimiento", key: "fechaNacimiento", width: 14 },
  { header: "Grado", key: "grado", width: 10 },
  { header: "Institución educativa", key: "institucion", width: 24 },
  { header: "Teléfono (familia)", key: "telefonoFamilia", width: 15 },
  { header: "Correo (familia)", key: "correoFamilia", width: 24 },
  { header: "Dirección", key: "direccion", width: 26 },
  { header: "Representante", key: "representante", width: 26 },
  { header: "Parentesco", key: "parentescoRepresentante", width: 12 },
  { header: "Teléfono principal", key: "telefonoRepresentante", width: 15 },
  { header: "Teléfono alternativo", key: "telefonoAlternativoRepresentante", width: 18 },
  { header: "Correo", key: "correoRepresentante", width: 24 },
  { header: "Documento de identidad", key: "documento", width: 16 },
  { header: "Contacto de emergencia", key: "emergenciaNombres", width: 26 },
  { header: "Parentesco", key: "emergenciaParentesco", width: 12 },
  { header: "Teléfono principal", key: "telefonoEmergencia", width: 15 },
  { header: "Teléfono alternativo", key: "telefonoAlternativoEmergencia", width: 18 },
] as const;

/** Columna de cada bloque de la tabla del panel (de 1 a N). */
export const BLOQUES_INSCRIPCIONES = [
  { nombre: "Participante", desde: 3, hasta: 10 },
  { nombre: "Representante", desde: 11, hasta: 16 },
  { nombre: "Contacto de emergencia", desde: 17, hasta: 20 },
] as const;

/**
 * Cada ficha convertida a una fila plana, lista para la hoja de Excel y para
 * la tabla del panel. El panel y el archivo comparten esta proyeccion: no hay
 * dos versiones de lo que se ve.
 */
export function filaPlana(fila: FilaRegistro): Record<string, string> {
  const d = detalleDe(fila);
  const edad = d ? calcularEdad(d.participante.fechaNacimiento) : -1;

  return {
    recibido: new Date(fila.recibido).toLocaleString("es-DO"),
    grupo: nombreGrupo(fila.grupo),
    participante: fila.participante,
    edad: edad >= 0 ? `${edad} años` : "—",
    fechaNacimiento: d ? formatFechaDMY(d.participante.fechaNacimiento) : "—",
    grado: d ? celula(d.participante.grado) : "—",
    institucion: d ? celula(d.participante.institucion) : "—",
    telefonoFamilia: d ? celula(mostrarTelefono(d.participante.telefonoFamiliar)) : "—",
    correoFamilia: d ? celula(d.participante.correoFamiliar) : "—",
    direccion: d ? celula(d.participante.direccion) : "—",
    representante: d ? celula(d.representante.nombres) : "—",
    parentescoRepresentante: d ? celula(d.representante.parentesco) : "—",
    telefonoRepresentante: d
      ? celula(mostrarTelefono(d.representante.telefonoPrincipal))
      : "—",
    telefonoAlternativoRepresentante: d
      ? celula(mostrarTelefono(d.representante.telefonoAlternativo ?? ""))
      : "—",
    correoRepresentante: d ? celula(d.representante.correo) : "—",
    documento: d ? celula(d.representante.documento) : "—",
    emergenciaNombres: d ? celula(d.emergencia.nombres) : "—",
    emergenciaParentesco: d ? celula(d.emergencia.parentesco) : "—",
    telefonoEmergencia: d ? celula(mostrarTelefono(d.emergencia.telefono)) : "—",
    telefonoAlternativoEmergencia: d
      ? celula(mostrarTelefono(d.emergencia.telefonoAlternativo ?? ""))
      : "—",
  };
}

const COLUMNAS_AUTORIZADAS = [
  { header: "Recibido", key: "recibido", width: 17 },
  { header: "Grupo", key: "grupo", width: 12 },
  { header: "Participante", key: "participante", width: 26 },
  { header: "Autorizada", key: "autorizada", width: 10 },
  { header: "Nombre", key: "nombre", width: 26 },
  { header: "Parentesco", key: "parentesco", width: 12 },
  { header: "Teléfono", key: "telefono", width: 15 },
] as const;

/**
 * Borde fino a todo y encabezado negro (las `filasEncabezado` primeras) con
 * texto blanco y centrado. Las celdas de datos quedan con texto envuelto.
 */
function estilar(hoja: import("exceljs").Worksheet, filasEncabezado: number): void {
  hoja.eachRow((fila, numero) => {
    fila.eachCell((celda) => {
      celda.border = BORDE;
      if (numero > filasEncabezado) {
        celda.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        return;
      }
      Object.assign(celda, ENCABEZADO);
    });
  });
}

/** El archivo que descarga la coordinación. Blanco y negro, como el PDF. */
export async function libroExcel(filas: FilaRegistro[]): Promise<Uint8Array> {
  const { default: ExcelJS } = await import("exceljs");

  const libro = new ExcelJS.Workbook();
  libro.creator = "Inscripciones Chispita y Antorchita";
  libro.created = new Date();

  /* Hoja 1: una fila por ficha, con todos los datos del detalle. Los 20
   * encabezados van en una sola fila, sin agrupar por bloques. */
  const fichas = libro.addWorksheet("Inscripciones");
  fichas.columns = [...COLUMNAS_INSCRIPCIONES];
  for (const fila of filas) fichas.addRow(filaPlana(fila));

  fichas.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1 + filas.length, column: COLUMNAS_INSCRIPCIONES.length },
  };
  fichas.views = [{ state: "frozen", ySplit: 1 }];
  estilar(fichas, 1);

  /* Hoja 2: una fila por persona autorizada, en formato largo, para poder
   * filtrar u ordenar sin girar la hoja. */
  const autorizadas = libro.addWorksheet("Autorizadas");
  autorizadas.columns = [...COLUMNAS_AUTORIZADAS];
  for (const fila of filas) {
    const d = detalleDe(fila);
    if (!d) continue;
    for (const persona of d.autorizados) {
      autorizadas.addRow({
        recibido: new Date(fila.recibido).toLocaleString("es-DO"),
        grupo: nombreGrupo(fila.grupo),
        participante: fila.participante,
        autorizada: persona.autorizada ? "Sí" : "No",
        nombre: celula(persona.nombres),
        parentesco: celula(persona.parentesco),
        telefono: celula(mostrarTelefono(persona.telefono)),
      });
    }
  }
  autorizadas.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNAS_AUTORIZADAS.length },
  };
  autorizadas.views = [{ state: "frozen", ySplit: 1 }];
  estilar(autorizadas, 1);

  /* Hoja 3: resumen. Totales por grupo y por dia de recepcion. */
  const resumen = libro.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Concepto", key: "concepto", width: 22 },
    { header: "Valor", key: "valor", width: 14 },
  ] as const;

  const porGrupo = new Map<string, number>();
  const porDia = new Map<string, number>();
  for (const fila of filas) {
    porGrupo.set(fila.grupo, (porGrupo.get(fila.grupo) ?? 0) + 1);
    const dia = (fila.recibido ?? "").slice(0, 10);
    if (dia) porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }

  const total = filas.length;

  resumen.getCell("A1").value = "Inscripciones · Resumen";
  resumen.getCell("A1").font = { bold: true, size: 14 };
  resumen.getCell("A2").value =
    `Generado el ${new Date().toLocaleString("es-DO")}`;
  resumen.getCell("A2").font = { italic: true };

  resumen.addRow({ concepto: "" });
  resumen.addRow({ concepto: "Total de fichas", valor: total });

  resumen.addRow({ concepto: "" });
  resumen.addRow({ concepto: "Por grupo" });
  resumen.addRow({ concepto: "Grupo", valor: "Fichas" });
  for (const [id, cantidad] of porGrupo) {
    resumen.addRow({
      concepto: nombreGrupo(id),
      valor: `${cantidad}  (${total ? Math.round((cantidad / total) * 100) : 0} %)`,
    });
  }

  resumen.addRow({ concepto: "" });
  resumen.addRow({ concepto: "Por día de recepción" });
  resumen.addRow({ concepto: "Fecha", valor: "Fichas" });
  for (const [dia, cantidad] of [...porDia.entries()].sort((a, b) =>
    b[0].localeCompare(a[0]),
  )) {
    resumen.addRow({ concepto: formatFechaDMY(dia), valor: cantidad });
  }

  return new Uint8Array(await libro.xlsx.writeBuffer());
}