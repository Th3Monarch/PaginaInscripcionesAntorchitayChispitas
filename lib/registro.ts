import { z } from "zod";
import { isGroupId } from "./config";
import type { EnrollmentValues } from "./schemas";

/**
 * Lo unico que sale del navegador hacia el servidor.
 *
 * Si anades un campo aqui, se guarda en una base de datos consultable desde
 * internet. Anadelo solo si la coordinacion lo pidio por escrito y con un
 * motivo concreto. Datos que hoy NO se guardan: documento de identidad, fecha
 * de nacimiento, salud, direccion, nombre del representante y las personas
 * autorizadas.
 */
export const registroSchema = z.object({
  /** Id de este envio. Establece la fila, asi que repetirlo no duplica. */
  envio: z.string().uuid(),
  grupo: z.string().refine(isGroupId, "Grupo desconocido"),
  participante: z.string().trim().min(4, "Falta el nombre").max(120),
  contacto: z.string().trim().max(30).optional(),
});

export type Registro = z.infer<typeof registroSchema>;

export type FilaRegistro = {
  envio: string;
  recibido: string;
  grupo: string;
  participante: string;
  contacto: string | null;
};

export const TABLA = "inscripciones";

const COLUMNAS = [
  { header: "Recibido", key: "recibido", width: 22 },
  { header: "Grupo", key: "grupo", width: 14 },
  { header: "Participante", key: "participante", width: 34 },
  { header: "Contacto", key: "contacto", width: 18 },
] as const;

/** El archivo que descarga la coordinación. Blanco y negro, como el PDF. */
export async function libroExcel(filas: FilaRegistro[]): Promise<Uint8Array> {
  const { default: ExcelJS } = await import("exceljs");

  const libro = new ExcelJS.Workbook();
  libro.creator = "Inscripciones Chispita y Antorchita";
  libro.created = new Date();

  const hoja = libro.addWorksheet("Inscripciones");
  hoja.columns = [...COLUMNAS];
  hoja.getRow(1).font = { bold: true };
  hoja.views = [{ state: "frozen", ySplit: 1 }];

  for (const fila of filas) {
    hoja.addRow({
      recibido: new Date(fila.recibido).toLocaleString("es-DO"),
      grupo: fila.grupo,
      participante: fila.participante,
      contacto: fila.contacto ?? "",
    });
  }

  return new Uint8Array(await libro.xlsx.writeBuffer());
}

/**
 * Unico punto donde se decide que datos se van. Si esto cambia, revisa tambien
 * el texto de privacidad de la portada y del paso del PDF.
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
  };
}
