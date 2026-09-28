import { z } from "zod";
import { APP, GRUPOS } from "./config";
import { evaluarReferencia } from "./referencia";
import { ERROR_TELEFONO, telefonoValido } from "./telefono";

/* ------------------------------------------------------------------ */
/* Primitivas reutilizables                                            */
/* ------------------------------------------------------------------ */

const texto = (campo: string, min = 2) =>
  z
    .string()
    .trim()
    .min(min, `Escribe ${campo}`)
    .max(120, `${campo}: máximo 120 caracteres`);

const textoOpcional = (campo: string, max = 300) =>
  z.string().trim().max(max, `${campo}: máximo ${max} caracteres`);

/** Opción obligatoria con estados "sin responder" permitidos por el tipo. */
const opcion = <T extends readonly [string, string]>(
  valores: T,
  mensaje: string,
) =>
  z
    .union([z.literal(valores[0]), z.literal(valores[1]), z.literal("")])
    .refine((valor) => valor !== "", { message: mensaje });

const telefono = z
  .string()
  .trim()
  .min(1, "Escribe el teléfono")
  .refine(telefonoValido, ERROR_TELEFONO);

const correo = z.email("Escribe un correo electrónico válido");

const casilla = (mensaje: string) =>
  z.boolean().refine((valor) => valor === true, { message: mensaje });

/* ------------------------------------------------------------------ */
/* Secciones                                                           */
/* ------------------------------------------------------------------ */

/** Valida que la cadena sea una fecha real del calendario (AAAA-MM-DD). */
export function esFechaReal(valor: string): boolean {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!coincidencia) return false;
  const [, anio, mes, dia] = coincidencia;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  return (
    fecha.getFullYear() === Number(anio) &&
    fecha.getMonth() === Number(mes) - 1 &&
    fecha.getDate() === Number(dia)
  );
}

export const participanteSchema = z.object({
  nombres: texto("los nombres y apellidos", 4),
  fechaNacimiento: z
    .string()
    .trim()
    .min(1, "Selecciona la fecha de nacimiento")
    .refine(esFechaReal, "Revisa la fecha de nacimiento")
    .refine(
      (valor) => new Date(`${valor}T00:00:00`).getTime() < Date.now(),
      "La fecha de nacimiento no puede ser futura",
    ),
  grado: texto("el grado", 1),
  institucion: texto("la institución educativa", 2),
  telefonoFamiliar: telefono,
  correoFamiliar: correo,
  direccion: textoOpcional("la dirección", 200),
});

export const representanteSchema = z.object({
  nombres: texto("el nombre del representante", 4),
  parentesco: texto("el parentesco", 2),
  telefonoPrincipal: telefono,
  telefonoAlternativo: z.union([telefono, z.literal("")]),
  correo: correo,
  documento: z.union([
    z
      .string()
      .trim()
      .max(20, "El documento debe tener máximo 20 caracteres"),
    z.literal(""),
  ]),
});

export const emergenciaSchema = z.object({
  nombres: texto("el nombre del contacto", 4),
  parentesco: texto("el parentesco", 2),
  telefono: telefono,
  telefonoAlternativo: z.union([telefono, z.literal("")]),
});

export const personaAutorizadaSchema = z.object({
  nombres: z.string().trim(),
  parentesco: z.string().trim(),
  telefono: z.string().trim(),
  autorizada: z.boolean(),
});

export const autorizadosSchema = z
  .array(personaAutorizadaSchema)
  .superRefine((personas, ctx) => {
    personas.forEach((persona, indice) => {
      const tieneAlgo = Boolean(
        persona.nombres || persona.parentesco || persona.telefono,
      );
      if (!tieneAlgo && !persona.autorizada) return;

      if (!persona.nombres) {
        ctx.addIssue({
          code: "custom",
          message: "Escribe el nombre",
          path: [indice, "nombres"],
        });
      }
      if (!persona.parentesco) {
        ctx.addIssue({
          code: "custom",
          message: "Escribe el parentesco",
          path: [indice, "parentesco"],
        });
      }
      if (!persona.telefono) {
        ctx.addIssue({
          code: "custom",
          message: "Escribe el teléfono",
          path: [indice, "telefono"],
        });
      } else if (!telefonoValido(persona.telefono)) {
        ctx.addIssue({
          code: "custom",
          message: ERROR_TELEFONO,
          path: [indice, "telefono"],
        });
      }
    });

    if (personas.length < APP.minPersonasAutorizadas) {
      ctx.addIssue({
        code: "custom",
        message: `Se muestran ${APP.minPersonasAutorizadas} filas; puedes dejar en blanco las que no uses.`,
      });
    }
    if (personas.length > APP.maxPersonasAutorizadas) {
      ctx.addIssue({
        code: "custom",
        message: `Máximo ${APP.maxPersonasAutorizadas} personas autorizadas`,
      });
    }
  });

const SALUD_CAMPOS = [
  ["alergia", "alergiaDetalle", "la alergia"],
  ["condicion", "condicionDetalle", "la condición relevante"],
  ["medicamento", "medicamentoDetalle", "el medicamento"],
  ["otra", "otraDetalle", "la información"],
] as const;

export const saludSchema = z
  .object({
    alergia: opcion(["si", "no"] as const, "Responde Sí o No"),
    alergiaDetalle: textoOpcional("la alergia", 200),
    condicion: opcion(["si", "no"] as const, "Responde Sí o No"),
    condicionDetalle: textoOpcional("la condición", 200),
    medicamento: opcion(["si", "no"] as const, "Responde Sí o No"),
    medicamentoDetalle: textoOpcional("el medicamento", 200),
    otra: opcion(["si", "no"] as const, "Responde Sí o No"),
    otraDetalle: textoOpcional("la información", 200),
  })
  .superRefine((salud, ctx) => {
    for (const [opcionKey, detalleKey, etiqueta] of SALUD_CAMPOS) {
      if (salud[opcionKey] === "si" && !salud[detalleKey].trim()) {
        ctx.addIssue({
          code: "custom",
          message: `Indica ${etiqueta}`,
          path: [detalleKey],
        });
      }
    }
  });

export const autorizacionesSchema = z.object({
  participacion: opcion(
    ["autorizo", "no_autorizo"] as const,
    "Marca una de las dos opciones",
  ),
  externasInformado: casilla(
    "Confirma que has sido informado de las actividades externas",
  ),
  externasRevisa: casilla(
    "Confirma que recibirás y revisarás la información antes de cada salida",
  ),
  imagenes: opcion(
    ["autorizo", "no_autorizo"] as const,
    "Marca una de las dos opciones",
  ),
  imagenesCondiciones: textoOpcional("las condiciones", 300),
  compromiso: casilla("Debes aceptar el compromiso del representante para continuar"),
});

/* ------------------------------------------------------------------ */
/* Documento completo                                                  */
/* ------------------------------------------------------------------ */

export const enrollmentSchema = z
  .object({
    grupo: z.enum(["chispita", "antorchita"], {
      error: "Selecciona el grupo",
    }),
    participante: participanteSchema,
    representante: representanteSchema,
    emergencia: emergenciaSchema,
    autorizados: z
      .array(personaAutorizadaSchema)
      .min(APP.minPersonasAutorizadas, "Indica al menos las filas disponibles")
      .max(APP.maxPersonasAutorizadas, "Máximo de personas autorizadas"),
    salud: saludSchema,
    autorizaciones: autorizacionesSchema,
  })
  .superRefine((valores, ctx) => {
    autorizadosSchema.safeParse(valores.autorizados).error?.issues.forEach((issue) => {
      ctx.addIssue({ code: "custom", message: issue.message, path: ["autorizados", ...issue.path] });
    });

    if (APP.idRepresentanteRequerido && !valores.representante.documento.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Escribe el documento de identidad del Representante",
        path: ["representante", "documento"],
      });
    }

    const edad = calcularEdad(valores.participante.fechaNacimiento);
    if (edad < APP.edadMinima || edad > APP.edadMaxima) {
      ctx.addIssue({
        code: "custom",
        message: `Revisa la fecha de nacimiento: la edad calculada (${edad} años) parece incorrecta`,
        path: ["participante", "fechaNacimiento"],
      });
    }

    /* Bloqueo por referencia de edad y grado: hay que corregir el dato. */
    const config = GRUPOS[valores.grupo];
    const referencia = evaluarReferencia(valores.grupo, {
      edad,
      grado: valores.participante.grado,
    });

    if (referencia.edadFuera) {
      ctx.addIssue({
        code: "custom",
        message: `${config.nombre} es para ${config.edadReferencia}. Corrige la fecha de nacimiento (edad calculada: ${edad} años)`,
        path: ["participante", "fechaNacimiento"],
      });
    }

    if (referencia.gradoFuera) {
      ctx.addIssue({
        code: "custom",
        message: `${config.nombre} es para ${config.gradosReferencia} grado. Corrige el grado indicado (${referencia.grado}.º)`,
        path: ["participante", "grado"],
      });
    }
  });

export type EnrollmentValues = z.infer<typeof enrollmentSchema>;
export type SaludValues = z.infer<typeof saludSchema>;
export type AutorizacionesValues = z.infer<typeof autorizacionesSchema>;
export type PersonaAutorizada = z.infer<typeof personaAutorizadaSchema>;
export type SiNo = "" | "si" | "no";
export type OpcionAutorizacion = "" | "autorizo" | "no_autorizo";

/* ------------------------------------------------------------------ */
/* Utilidades compartidas                                              */
/* ------------------------------------------------------------------ */

export function calcularEdad(fechaNacimiento: string): number {
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return -1;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return edad;
}

export const mensajes = {
  requerido: "Este dato es obligatorio",
  revisar: "Revisa este dato",
};
