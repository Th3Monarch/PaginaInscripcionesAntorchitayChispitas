import { GRUPOS, type GroupId } from "./config";

/**
 * Comprobación de la referencia de edad y grado del grupo.
 *
 * Es una ADVERTENCIA, no un bloqueo: la referencia orienta a la familia, pero
 * la coordinación decide. Por eso la desviación se muestra y se registra, y no
 * impide completar la ficha.
 */

/** Grados escritos con palabras, del 1.º al 6.º. */
const GRADOS_PALABRA: Record<string, number> = {
  primer: 1,
  primera: 1,
  primero: 1,
  primerisimo: 1,
  segundo: 2,
  segunda: 2,
  tercero: 3,
  tercer: 3,
  tercera: 3,
  cuarto: 4,
  cuarta: 4,
  quinto: 5,
  quinta: 5,
  sexto: 6,
  sexta: 6,
  septimo: 7,
  septima: 7,
  octavo: 8,
  octava: 8,
  noveno: 9,
  novena: 9,
  decimo: 10,
  decima: 10,
  diez: 10,
  undecimo: 11,
  undecima: 11,
  once: 11,
  duodecimo: 12,
  duodecima: 12,
  doce: 12,
};

/** Sin acentos y en minúsculas, para comparar sin sorpresas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Extrae el número de grado de un texto libre.
 * Acepta "2.º", "2do", "2", "2 de primaria", "Segundo" o "cuarto de primaria".
 * Devuelve `null` si no se puede deducir (por ejemplo "K" o "Pre-k").
 */
export function numeroGrado(grado: string): number | null {
  const texto = normalizar(grado);
  if (!texto) return null;

  for (const [palabra, numero] of Object.entries(GRADOS_PALABRA)) {
    if (new RegExp(`(^|[^a-z])${palabra}([^a-z]|$)`).test(texto)) return numero;
  }

  const digitos = texto.match(/\d+/);
  if (!digitos) return null;

  const numero = Number(digitos[0]);
  return numero >= 1 && numero <= 12 ? numero : null;
}

export type Desviacion = {
  /** Hay al menos un dato que no coincide con la referencia. */
  hayDesviacion: boolean;
  edadFuera: boolean;
  gradoFuera: boolean;
  /** El grado no se pudo interpretar, así que no se evaluó. */
  gradoIndeterminado: boolean;
  edad: number;
  grado: number | null;
  /** Un renglón por dato que no coincide, para la interfaz. */
  detalles: string[];
  /** Texto de una línea. */
  resumen: string;
};

const FUERA: Desviacion = {
  hayDesviacion: false,
  edadFuera: false,
  gradoFuera: false,
  gradoIndeterminado: false,
  edad: 0,
  grado: null,
  detalles: [],
  resumen: "",
};

/**
 * Evalúa la edad y el grado frente a la referencia del grupo.
 * La edad llega calculada para no depender de la fecha en este módulo.
 */
export function evaluarReferencia(
  grupo: GroupId,
  datos: { edad: number; grado: string },
): Desviacion {
  const config = GRUPOS[grupo];
  const { edad } = datos;
  const grado = numeroGrado(datos.grado);

  const edadFuera =
    edad < 0 || edad < config.edadGrupo.min || edad > config.edadGrupo.max;
  const gradoIndeterminado = grado === null && datos.grado.trim().length > 0;
  const sinReferenciaDeGrado = config.gradosGrupo.length === 0;
  const gradoFuera =
    grado !== null && !sinReferenciaDeGrado && !config.gradosGrupo.includes(grado);

  if (!edadFuera && !gradoFuera) {
    return { ...FUERA, gradoIndeterminado, edad, grado };
  }

  const detalles: string[] = [];
  if (edadFuera) {
    detalles.push(
      `La edad calculada (${edad >= 0 ? `${edad} años` : "sin fecha válida"}) no está en la referencia de ${config.edadReferencia}.`,
    );
  }
  if (gradoFuera) {
    detalles.push(
      `El grado indicado (${grado}.º) no está en la referencia de ${config.gradosReferencia} grado.`,
    );
  }

  return {
    hayDesviacion: true,
    edadFuera,
    gradoFuera,
    gradoIndeterminado,
    edad,
    grado,
    detalles,
    resumen: detalles.join(" "),
  };
}
