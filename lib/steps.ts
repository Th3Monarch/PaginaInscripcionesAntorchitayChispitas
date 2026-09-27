import type { FieldPath } from "react-hook-form";
import {
  emergenciaSchema,
  participanteSchema,
  representanteSchema,
  saludSchema,
  autorizacionesSchema,
} from "./schemas";
import type { EnrollmentValues } from "./schemas";

export type PasoId =
  | "participante"
  | "representante"
  | "emergencia"
  | "informacion"
  | "autorizaciones"
  | "revision"
  | "pdf";

export type Paso = {
  id: PasoId;
  numero: number;
  titulo: string;
  corto: string;
  descripcion: string;
  campos: FieldPath<EnrollmentValues>[];
};

const camposDe = <T extends { shape: Record<string, unknown> }>(
  esquema: T,
  prefijo: string,
) =>
  Object.keys(esquema.shape).map(
    (clave) => `${prefijo}.${clave}`,
  ) as FieldPath<EnrollmentValues>[];

export const PASOS: Paso[] = [
  {
    id: "participante",
    numero: 1,
    titulo: "Datos del participante",
    corto: "Participante",
    descripcion: "Información básica de la niña o el niño que se inscribe.",
    campos: camposDe(participanteSchema, "participante"),
  },
  {
    id: "representante",
    numero: 2,
    titulo: "Padre, madre o representante",
    corto: "Representante",
    descripcion: "Persona responsable que completa y firma la ficha.",
    campos: camposDe(representanteSchema, "representante"),
  },
  {
    id: "emergencia",
    numero: 3,
    titulo: "Contacto de emergencia",
    corto: "Emergencia",
    descripcion:
      "Persona que puede ser localizada durante las actividades del menor.",
    campos: camposDe(emergenciaSchema, "emergencia"),
  },
  {
    id: "informacion",
    numero: 4,
    titulo: "Información relevante",
    corto: "Información",
    descripcion:
      "Personas autorizadas para retirar y datos de salud necesarios para actuar.",
    campos: ["autorizados", ...camposDe(saludSchema, "salud")],
  },
  {
    id: "autorizaciones",
    numero: 5,
    titulo: "Autorizaciones",
    corto: "Autorizaciones",
    descripcion:
      "Participación, actividades externas, imágenes y compromiso del representante.",
    campos: camposDe(autorizacionesSchema, "autorizaciones"),
  },
  {
    id: "revision",
    numero: 6,
    titulo: "Revisión",
    corto: "Revisión",
    descripcion: "Confirma que toda la información esté correcta antes de generar el PDF.",
    campos: [],
  },
  {
    id: "pdf",
    numero: 7,
    titulo: "Ficha en PDF",
    corto: "PDF",
    descripcion: "Descarga la ficha, imprímela y entrégala firmada.",
    campos: [],
  },
];

export const PASOS_FORMULARIO = PASOS.filter((paso) => paso.id !== "pdf");
export const TOTAL_PASOS = PASOS.length;

export function indicePaso(id: PasoId): number {
  return PASOS.findIndex((paso) => paso.id === id);
}
