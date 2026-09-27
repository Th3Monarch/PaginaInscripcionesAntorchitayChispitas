export const APP = {
  comunidad: "Comunidad Dominicana",
  instrumento: "Grupos Infantiles Dominicanos",
  /** Encabezado y pie del PDF; se completa con el nombre del grupo. */
  instrumentoPdf: "Grupo Juvenil Dominicano",
  tituloDocumento: "Ficha de inscripción y autorización",
  storageKey: "inscripcion:chispita-antorchita:v1",
  /**
   * El documento de identidad del representante es obligatorio.
   * Desactívalo aquí si las normas administrativas de la comunidad lo
   * dispensan; el campo queda como texto libre y la validación se relaja.
   */
  idRepresentanteRequerido: true,
  maxPersonasAutorizadas: 4,
  minPersonasAutorizadas: 2,
  /**
   * Solo detectan errores de captura: la edad se calcula, no se elige.
   * No son un requisito de admisión del grupo.
   */
  edadMinima: 3,
  edadMaxima: 25,
  logoPath: "/logo-antorcha.png",
  pieWeb:
    "Herramienta de inscripción para Chispita y Antorchita · Propuesta de gestión local",
  notaLegal:
    "Este documento no constituye una declaración legal ni un requisito legal. Adáptese a los criterios de la coordinación del grupo.",
} as const;

export type GroupId = "chispita" | "antorchita";

export type RangoEdad = { min: number; max: number };

/**
 * Referencias de edad y grado de cada grupo. Es la única fuente de verdad:
 * los textos visibles se derivan de aquí, así que no pueden quedar
 * desincronizados con la comprobación.
 */
const REFERENCIAS: Record<GroupId, { edad: RangoEdad; grados: number[] }> = {
  chispita: { edad: { min: 6, max: 9 }, grados: [1, 2, 3] },
  antorchita: { edad: { min: 10, max: 13 }, grados: [4, 5, 6] },
};

function textoGrados(grados: number[]): string {
  const lista = grados.map((grado) => `${grado}.º`);
  if (lista.length < 2) return lista.join("");
  return `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
}

function textoEdad({ min, max }: RangoEdad): string {
  return `${min} a ${max} años`;
}

function referencias(id: GroupId) {
  const { edad, grados } = REFERENCIAS[id];
  return {
    edadGrupo: edad,
    gradosGrupo: grados,
    edadReferencia: textoEdad(edad),
    gradosReferencia: textoGrados(grados),
    edadHint: `Referencia del grupo: ${textoEdad(edad)}`,
    gradoHint: `Referencia del grupo: ${textoGrados(grados)} grado`,
  };
}

export type GroupConfig = {
  id: GroupId;
  nombre: string;
  tituloLargo: string;
  lema: string;
  lemaCorto: string;
  /** Rango de edad de referencia del grupo. */
  edadGrupo: RangoEdad;
  /** Grados de referencia; lista vacía si el grupo no publica grados. */
  gradosGrupo: number[];
  edadReferencia: string;
  gradosReferencia: string;
  edadHint: string;
  gradoHint: string;
  descripcion: string;
  bullet: string;
  acento: string;
  acentoFuerte: string;
  acentoSuave: string;
  marca: string;
};

export const GRUPOS: Record<GroupId, GroupConfig> = {
  chispita: {
    id: "chispita",
    nombre: "Chispita",
    tituloLargo: "Grupo Infantil Dominicano Chispita",
    lema: "Descubrir la luz",
    lemaCorto: "Encendiendo la chispa de la Verdad",
    ...referencias("chispita"),
    descripcion:
      "Para niñas y niños de 6 a 9 años que inician su recorrido en 1.º, 2.º o 3.º grado.",
    bullet: "Inicia y acompaña los primeros años de fe y comunidad.",
    acento: "#b3121b",
    acentoFuerte: "#7c0c12",
    acentoSuave: "#fdecee",
    marca: "#0a0a0c",
  },
  antorchita: {
    id: "antorchita",
    nombre: "Antorchita",
    tituloLargo: "Grupo Infantil Dominicano Antorchita",
    lema: "Hacer crecer la luz",
    lemaCorto: "Haciendo crecer la luz",
    ...referencias("antorchita"),
    descripcion:
      "Para niñas y niños que ya recorrieron Chispita y ahora crecen en el camino de servicio y formación.",
    bullet: "Continúa el proceso de crecimiento y servicio en comunidad.",
    acento: "#9c0f16",
    acentoFuerte: "#66090d",
    acentoSuave: "#fbe8ea",
    marca: "#0a0a0c",
  },
};

export const GROUP_LIST: GroupConfig[] = [GRUPOS.chispita, GRUPOS.antorchita];

export function isGroupId(value: unknown): value is GroupId {
  return value === "chispita" || value === "antorchita";
}
