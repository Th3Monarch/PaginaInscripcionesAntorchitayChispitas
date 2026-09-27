import { APP, GRUPOS, type GroupConfig } from "@/lib/config";
import {
  edadLabel,
  formatFechaDMY,
  pieDocumento,
  vacio,
} from "@/lib/format";
import type { EnrollmentValues } from "@/lib/schemas";
import { Motor, hex, pintar, sanear, type Tinta } from "./motor";

/**
 * El documento se entrega impreso en blanco y negro: la paleta es
 * exclusivamente gris, sin COLOR. `GRUPOS[].acento` no se usa aquí.
 */
const TINTA = hex("#1a1a1a");
const GRIS = hex("#5c5c5c");
const GRIS_LINEA = hex("#a6a6a6");
const GRIS_FONDO = hex("#efefef");
const NEGRO = hex("#000000");
const BLANCO = hex("#ffffff");

const HUECO = 20;
const LADO_LOGO = 50;

type EstiloParrafo = {
  size?: number;
  color?: Tinta;
  cursiva?: boolean;
  negrita?: boolean;
  ancho?: number;
  x?: number;
};

/* ------------------------------------------------------------------ */
/* Bloques reutilizables                                               */
/* ------------------------------------------------------------------ */

function encabezado(
  m: Motor,
  g: GroupConfig,
  etiqueta: string,
  conLogo: boolean,
) {
  const inset = conLogo ? LADO_LOGO + 12 : 0;
  const anchoTexto = m.anchoUtil - inset;

  m.caja(0, 0, m.anchoUtil, 4, NEGRO);

  m.y += 11;
  m.textoAjustado(APP.comunidad.toUpperCase(), {
    size: 7.4,
    color: GRIS,
    ancho: anchoTexto,
  });
  m.textoAjustado(`${APP.instrumentoPdf} ${g.nombre}`, {
    size: 15,
    negrita: true,
    color: TINTA,
    ancho: anchoTexto,
  });
  m.textoAjustado(APP.tituloDocumento, {
    size: 9.6,
    color: GRIS,
    ancho: anchoTexto,
  });
  m.textoAjustado(`«${g.lema}»`, {
    size: 8.4,
    cursiva: true,
    color: GRIS,
    ancho: anchoTexto,
  });
  m.textoAjustado(etiqueta, {
    size: 7.6,
    negrita: true,
    color: NEGRO,
    alineacion: "derecha",
    ancho: anchoTexto,
  });

  m.lineaHorizontal(0, m.y + 5, m.anchoUtil, GRIS_LINEA, 0.7);
  m.y += 20;
}

function seccion(m: Motor, numero: number, titulo: string) {
  const alto = 17;
  m.asegurar(alto + 12);

  const y = m.y;
  m.caja(0, y - 1, 16, 16, NEGRO);
  m.pagina.drawText(String(numero), {
    x: m.px(4.4),
    y: m.alto - y - 12.6,
    size: 10,
    font: m.negrita,
    color: pintar(BLANCO),
  });
  m.texto(titulo, { x: 23, size: 11.5, negrita: true, color: TINTA });
  m.y = y + alto + 10;
}

/** Rótulo menor para agrupar sub-bloques dentro de una sección. */
function subtitulo(m: Motor, texto: string, x = 0) {
  m.texto(texto.toUpperCase(), { x, size: 7.6, negrita: true, color: GRIS });
  m.y += 4;
}

function parrafoSeguro(
  m: Motor,
  texto: string,
  estilo: EstiloParrafo = {},
  extra = 0,
) {
  const lineas = m.envolver(texto, estilo);
  const alto = m.altoLineas(lineas.length, estilo) + extra;
  m.asegurar(alto);
  const y0 = m.y;
  m.parrafo(texto, estilo);
  m.y = y0 + alto;
}

function nota(
  m: Motor,
  texto: string,
  tono: "informativa" | "alerta" = "informativa",
  rotulo?: string,
) {
  const paleta =
    tono === "alerta"
      ? { fondo: BLANCO, borde: NEGRO, tinta: NEGRO }
      : { fondo: GRIS_FONDO, borde: GRIS_LINEA, tinta: TINTA };

  const completo = rotulo ? `${rotulo} ${texto}` : texto;
  const estilo: EstiloParrafo = {
    size: 8,
    color: paleta.tinta,
    ancho: m.anchoUtil - 20,
    x: 8,
  };
  const lineas = m.envolver(completo, estilo);
  const alto = lineas.length * 8 * 1.32 + 14;

  m.asegurar(alto + 4);
  const y = m.y;
  m.caja(0, y, m.anchoUtil, alto, paleta.fondo, paleta.borde, 0.6);
  m.caja(0, y, 2.6, alto, paleta.borde);
  m.y = y + 7;
  m.parrafo(completo, estilo);
  m.y = y + alto + 10;
}

type Celda = { etiqueta: string; valor: string };

/** Fila de campos dentro de un ancho dado (para sub-bloques en columnas). */
function filaEn(m: Motor, x: number, ancho: number, celdas: Celda[], gap = 12) {
  const n = celdas.length;
  const anchoCelda = (ancho - gap * (n - 1)) / n;
  const alto = 25;
  m.asegurar(alto);
  const y = m.y;
  celdas.forEach((celda, indice) => {
    m.campo(
      x + indice * (anchoCelda + gap),
      y,
      anchoCelda,
      celda.etiqueta,
      celda.valor,
      GRIS_LINEA,
      TINTA,
    );
  });
  m.y = y + alto;
}

function fila(m: Motor, celdas: Celda[], gap = HUECO) {
  filaEn(m, 0, m.anchoUtil, celdas, gap);
}

function listaCasillas(
  m: Motor,
  items: Array<{ texto: string; marcado: boolean }>,
  color: Tinta,
  x = 0,
) {
  const alto = items.length * 20 + 6;
  m.asegurar(alto);
  const y = m.y;
  items.forEach((item, indice) => {
    const yItem = y + 3 + indice * 20;
    m.casilla(x, yItem, item.marcado, color, 9);
    m.y = yItem + 1.6;
    m.texto(item.texto, { x: x + 15, size: 8.2, color: TINTA });
  });
  m.y = y + alto;
}

function tablaAutorizados(m: Motor, g: GroupConfig, valores: EnrollmentValues) {
  const columnas = [
    { x: 0, ancho: m.anchoUtil * 0.38, titulo: "Nombre" },
    { x: m.anchoUtil * 0.38, ancho: m.anchoUtil * 0.2, titulo: "Parentesco" },
    { x: m.anchoUtil * 0.58, ancho: m.anchoUtil * 0.29, titulo: "Teléfono" },
    { x: m.anchoUtil * 0.87, ancho: m.anchoUtil * 0.13, titulo: "Autorizado" },
  ];
  const altoFila = 19;
  const filas = Math.max(2, valores.autorizados.length);
  const alto = altoFila * filas + 17;

  m.asegurar(alto + 6);
  const y = m.y;

  m.caja(0, y, m.anchoUtil, 16, NEGRO);
  const cursor = m.y;
  columnas.forEach((columna) => {
    m.y = cursor;
    m.texto(columna.titulo, {
      x: columna.x + 4,
      size: 7,
      negrita: true,
      color: BLANCO,
      ancho: columna.ancho - 6,
    });
  });

  for (let indice = 0; indice < filas; indice += 1) {
    const persona = valores.autorizados[indice];
    const yFila = y + 16 + indice * altoFila;
    if (indice % 2 === 0) m.caja(0, yFila, m.anchoUtil, altoFila, GRIS_FONDO);
    m.lineaHorizontal(0, yFila + altoFila, m.anchoUtil, GRIS_LINEA, 0.4);
    const tinta = persona?.autorizada ? TINTA : GRIS;
    const textos: Array<[number, string, number]> = [
      [4, persona?.nombres ?? "", columnas[0].ancho - 8],
      [columnas[1].x + 4, persona?.parentesco ?? "", columnas[1].ancho - 8],
      [columnas[2].x + 4, persona?.telefono ?? "", columnas[2].ancho - 8],
    ];
    textos.forEach(([x, texto, ancho]) => {
      m.y = yFila + 4;
      m.texto(texto || "-", { x, size: 8.2, color: tinta, ancho });
    });
    if (persona) {
      m.casilla(columnas[3].x + 2, yFila + 5, persona.autorizada, NEGRO, 9);
    }
  }

  m.y = y + alto;
  parrafoSeguro(
    m,
    "Solo las personas autorizadas por el representante podrán retirar al menor cuando corresponda.",
    { size: 7.2, cursiva: true, color: GRIS },
    4,
  );
}

function bloqueSalud(m: Motor, g: GroupConfig, valores: EnrollmentValues) {
  const preguntas: Array<[string, string, string]> = [
    [
      "¿Presenta alguna alergia relevante?",
      valores.salud.alergia,
      valores.salud.alergiaDetalle,
    ],
    [
      "¿Existe alguna condición o necesidad relevante?",
      valores.salud.condicion,
      valores.salud.condicionDetalle,
    ],
    [
      "¿Existe algún medicamento ante una emergencia?",
      valores.salud.medicamento,
      valores.salud.medicamentoDetalle,
    ],
    ["Otra información importante de salud", valores.salud.otra, valores.salud.otraDetalle],
  ];

  const anchoCelda = (m.anchoUtil - HUECO) / 2;
  const anchoTexto = anchoCelda - 16;
  const estiloDetalle: EstiloParrafo = { size: 8, ancho: anchoTexto, x: 8 };

  const lineasPie = (respuesta: string, detalle: string) => {
    if (respuesta === "si" && detalle.trim()) {
      return m.envolver(detalle, estiloDetalle).length;
    }
    return respuesta === "no" ? 1 : 0;
  };

  const alturas = preguntas.map(([titulo, respuesta, detalle]) => {
    const lineasTitulo = m.envolver(titulo, {
      size: 8,
      negrita: true,
      ancho: anchoTexto,
    }).length;
    return 8 + lineasTitulo * 8 * 1.32 + 15 + lineasPie(respuesta, detalle) * 8 * 1.32 + 8;
  });

  for (let indice = 0; indice < preguntas.length; indice += 2) {
    const altoFila = Math.max(alturas[indice], alturas[indice + 1] ?? 0);
    m.asegurar(altoFila + 8);
    const y = m.y;

    for (let offset = 0; offset < 2; offset += 1) {
      const actual = indice + offset;
      if (actual >= preguntas.length) continue;
      const [titulo, respuesta, detalle] = preguntas[actual];
      const x = offset * (anchoCelda + HUECO);

      m.caja(x, y, anchoCelda, altoFila, GRIS_FONDO, GRIS_LINEA, 0.5);

      m.y = y + 8;
      m.texto(titulo, {
        x: x + 8,
        size: 8,
        negrita: true,
        color: TINTA,
        ancho: anchoTexto,
      });

      const yOpciones = m.y + 1;
      (["si", "no"] as const).forEach((opcion, indiceOpcion) => {
        const xOpcion = x + 8 + indiceOpcion * 40;
        m.casilla(xOpcion, yOpciones, respuesta === opcion, NEGRO, 9);
        m.y = yOpciones + 0.8;
        m.texto(opcion === "si" ? "Sí" : "No", {
          x: xOpcion + 12.5,
          size: 8,
          color: TINTA,
        });
      });

      m.y = yOpciones + 15;
      if (respuesta === "si" && detalle.trim()) {
        m.parrafo(detalle, { ...estiloDetalle, x: x + 8, cursiva: true, color: GRIS });
      } else if (respuesta === "no") {
        m.parrafo("No requiere información adicional.", {
          ...estiloDetalle,
          x: x + 8,
          cursiva: true,
          color: GRIS,
        });
      }
    }
    m.y = y + altoFila + 8;
  }
}

function opcionesAutorizacion(
  m: Motor,
  g: GroupConfig,
  eleccion: string,
  etiquetas: [string, string] = ["AUTORIZO", "NO AUTORIZO"],
  x0 = 0,
  ancho = m.anchoUtil,
) {
  const hueco = 8;
  const anchoCaja = (ancho - hueco) / 2;
  m.asegurar(26);
  const y = m.y;
  etiquetas.forEach((etiqueta, indice) => {
    const x = x0 + indice * (anchoCaja + hueco);
    const marcado = eleccion === (indice === 0 ? "autorizo" : "no_autorizo");
    m.caja(
      x,
      y,
      anchoCaja,
      18,
      marcado ? GRIS_FONDO : undefined,
      marcado ? NEGRO : GRIS_LINEA,
      0.6,
    );
    m.casilla(x + 6, y + 4.5, marcado, NEGRO, 9);
    m.y = y + 4;
    m.textoAjustado(etiqueta, { x: x + 19, size: 8.2, negrita: true, color: TINTA, ancho: anchoCaja - 25 });
  });
  m.y = y + 26;
}

function firmas(m: Motor, g: GroupConfig, valores: EnrollmentValues) {
  fila(m, [
    {
      etiqueta: "Nombre del representante",
      valor: vacio(valores.representante.nombres),
    },
    {
      etiqueta: "Teléfono de contacto confirmado",
      valor: vacio(valores.representante.telefonoPrincipal),
    },
  ]);

  m.asegurar(62);
  const y = m.y + 8;
  const anchoFirma = m.anchoUtil * 0.62;
  const xFecha = anchoFirma + HUECO;
  const anchoFecha = m.anchoUtil - xFecha;

  m.caja(0, y, m.anchoUtil, 46, undefined, NEGRO, 0.9);
  m.y = y + 4;
  m.texto("Firma del representante", { x: 8, size: 7.2, color: GRIS });
  m.lineaHorizontal(8, y + 33, anchoFirma - 24, TINTA, 0.6);
  m.y = y + 35;
  m.texto("Firma legible", { x: 8, size: 6.6, cursiva: true, color: GRIS });
  m.y = y + 4;
  m.texto("Fecha de inscripción", { x: xFecha + 8, size: 7.2, color: GRIS });
  m.lineaHorizontal(xFecha + 8, y + 33, anchoFecha - 16, TINTA, 0.6);
  m.y = y + 35;
  m.texto("día / mes / año", { x: xFecha + 8, size: 6.6, cursiva: true, color: GRIS });
  m.y = y + 54;
}

function bloquePersonas(m: Motor, g: GroupConfig, valores: EnrollmentValues) {
  const anchoColumna = (m.anchoUtil - HUECO) / 2;
  const xDerecha = anchoColumna + HUECO;
  const r = valores.representante;
  const e = valores.emergencia;
  const ALTO = 124;

  m.asegurar(ALTO + 8);
  const y = m.y;

  /* Columna izquierda: representante */
  m.y = y;
  subtitulo(m, "Padre, madre o representante");
  filaEn(m, 0, anchoColumna, [
    { etiqueta: "Nombre y apellido", valor: vacio(r.nombres) },
  ]);
  filaEn(m, 0, anchoColumna, [
    { etiqueta: "Parentesco", valor: vacio(r.parentesco) },
    { etiqueta: "Teléfono principal", valor: vacio(r.telefonoPrincipal) },
  ]);
  filaEn(m, 0, anchoColumna, [
    {
      etiqueta: "Teléfono alternativo",
      valor: r.telefonoAlternativo.trim() || "No indicado",
    },
    { etiqueta: "Correo electrónico", valor: vacio(r.correo) },
  ]);
  filaEn(m, 0, anchoColumna, [
    {
      etiqueta: "Documento de identidad",
      valor: r.documento.trim() ? r.documento : "No se solicitó (opcional)",
    },
  ]);

  /* Columna derecha: emergencia */
  m.y = y;
  subtitulo(m, "Contacto de emergencia", xDerecha);
  filaEn(m, xDerecha, anchoColumna, [
    { etiqueta: "Nombre y apellido", valor: vacio(e.nombres) },
  ]);
  filaEn(m, xDerecha, anchoColumna, [
    { etiqueta: "Parentesco", valor: vacio(e.parentesco) },
    { etiqueta: "Teléfono", valor: vacio(e.telefono) },
  ]);
  filaEn(m, xDerecha, anchoColumna, [
    {
      etiqueta: "Teléfono alternativo",
      valor: e.telefonoAlternativo.trim() || "No indicado",
    },
  ]);

  m.pagina.drawLine({
    start: { x: m.px(anchoColumna + HUECO / 2), y: m.alto - y - 2 },
    end: { x: m.px(anchoColumna + HUECO / 2), y: m.alto - y - ALTO },
    thickness: 0.5,
    color: pintar(GRIS_LINEA),
  });

  m.y = y + ALTO;
}

function bloqueAutorizaciones(m: Motor, g: GroupConfig, valores: EnrollmentValues) {
  const a = valores.autorizaciones;

  /* Participación */
  subtitulo(m, "Participación en actividades ordinarias");
  parrafoSeguro(
    m,
    `Yo, como padre, madre o representante legal del menor identificado, autorizo su participación en las actividades ordinarias de ${g.nombre}, de acuerdo con las orientaciones de los responsables del grupo.`,
    { size: 8, color: TINTA },
    4,
  );
  opcionesAutorizacion(m, g, a.participacion);
  m.y += 6;

  /* Actividades externas e imágenes, en dos columnas */
  const ALTO = 152;
  m.asegurar(ALTO + 8);
  const y = m.y;
  const anchoColumna = (m.anchoUtil - HUECO) / 2;
  const xDerecha = anchoColumna + HUECO;
  const estiloNota: EstiloParrafo = {
    size: 7.2,
    cursiva: true,
    color: NEGRO,
  };

  m.y = y;
  subtitulo(m, "Actividades externas");
  parrafoSeguro(
    m,
    "Comprendo que algunas actividades podrán realizarse fuera del espacio habitual del grupo. La coordinación informará con antelación el lugar, el horario, el acompañamiento y las medidas de seguridad.",
    { size: 8, color: TINTA, ancho: anchoColumna, x: 0 },
    4,
  );
  listaCasillas(
    m,
    [
      { texto: "He sido informado.", marcado: a.externasInformado },
      { texto: "Revisaré la información antes de cada salida.", marcado: a.externasRevisa },
    ],
    NEGRO,
  );
  m.y += 4;
  m.parrafo(
    "No constituye una autorización universal: cada actividad externa se informa y se autoriza por separado.",
    { ...estiloNota, ancho: anchoColumna, x: 0 },
  );

  m.y = y;
  subtitulo(m, "Fotografías y videos", xDerecha);
  parrafoSeguro(
    m,
    "Durante algunas actividades podrían realizarse fotografías o videos con fines de documentación, memoria o comunicación del grupo.",
    { size: 8, color: TINTA, ancho: anchoColumna, x: xDerecha },
    4,
  );
  opcionesAutorizacion(m, g, a.imagenes, ["AUTORIZO", "NO AUTORIZO"], xDerecha, anchoColumna);
  filaEn(m, xDerecha, anchoColumna, [
    {
      etiqueta: "Condiciones informadas y forma de uso",
      valor: a.imagenesCondiciones.trim() || "Sin condiciones adicionales",
    },
  ]);
  m.y += 4;
  m.parrafo(
    `La inscripción en ${g.nombre} no depende de autorizar imágenes. No se solicitan redes sociales del menor.`,
    { ...estiloNota, ancho: anchoColumna, x: xDerecha },
  );

  m.pagina.drawLine({
    start: { x: m.px(anchoColumna + HUECO / 2), y: m.alto - y - 2 },
    end: { x: m.px(anchoColumna + HUECO / 2), y: m.alto - y - ALTO },
    thickness: 0.5,
    color: pintar(GRIS_LINEA),
  });

  m.y = y + ALTO;
}

/* ------------------------------------------------------------------ */
/* Documento                                                           */
/* ------------------------------------------------------------------ */

export async function construirFicha(
  valores: EnrollmentValues,
  logo?: Uint8Array,
): Promise<{ bytes: Uint8Array; paginas: number }> {
  const g = GRUPOS[valores.grupo];

  const m = await Motor.crear((motor) => {
    encabezado(motor, g, "Continuación de la ficha", false);
  });

  encabezado(m, g, `Grupo: ${g.nombre}`, Boolean(logo?.length));

  if (logo?.length) {
    try {
      const imagen = await m.doc.embedPng(logo);
      const escala = Math.min(LADO_LOGO / imagen.width, LADO_LOGO / imagen.height);
      m.pagina.drawImage(imagen, {
        x: m.px(m.anchoUtil - imagen.width * escala),
        y: m.alto - (m.margen.arriba + 11) - imagen.height * escala,
        width: imagen.width * escala,
        height: imagen.height * escala,
      });
    } catch {
      /* logo no disponible: la ficha se genera sin él */
    }
  }

  /* Banda de identificación */
  const altoBanda = 36;
  const yBanda = m.y;
  m.caja(0, yBanda, m.anchoUtil, altoBanda, GRIS_FONDO, NEGRO, 0.7);
  m.caja(0, yBanda, 3, altoBanda, NEGRO);
  const anchoTerc = m.anchoUtil / 3;
  const banda: Array<[string, string]> = [
    ["Grupo al que se inscribe", g.nombre],
    ["Participante", vacio(valores.participante.nombres)],
    ["Fecha de nacimiento", formatFechaDMY(valores.participante.fechaNacimiento)],
  ];
  const anchoCelda = anchoTerc - 14;
  banda.forEach(([etiqueta, valor], indice) => {
    const x = 10 + indice * anchoTerc;
    m.textoAjustado(etiqueta.toUpperCase(), {
      x,
      size: 6.6,
      color: GRIS,
      ancho: anchoCelda,
    });
    m.textoAjustado(vacio(valor), {
      x,
      size: 10,
      negrita: true,
      color: TINTA,
      ancho: anchoCelda,
    });
    m.y = yBanda + 5;
  });
  m.y = yBanda + altoBanda + 10;

  if (g.edadReferencia) {
    parrafoSeguro(
      m,
      `Referencia del grupo: ${g.edadReferencia}; grados ${g.gradosReferencia}. La edad se calcula a partir de la fecha de nacimiento.`,
      { size: 7.4, cursiva: true, color: GRIS },
      6,
    );
  }

  /* 1. Nota inicial */
  seccion(m, 1, "Nota inicial");
  nota(
    m,
    `Esta ficha recopila la información básica necesaria para la inscripción y el acompañamiento de los menores de ${g.nombre}. Está dirigida al representante y debe completarse con información veraz. Corresponde únicamente a ${g.nombre} y no constituye el proceso de incorporación al Grupo Juvenil Dominicano Antorcha. No se solicita información personal adicional.`,
    "alerta",
    "Importante.",
  );

  /* 2. Participante */
  seccion(m, 2, "Datos del participante");
  fila(m, [
    { etiqueta: "Nombres y apellidos", valor: vacio(valores.participante.nombres) },
    {
      etiqueta: "Fecha de nacimiento",
      valor: formatFechaDMY(valores.participante.fechaNacimiento),
    },
    { etiqueta: "Edad", valor: edadLabel(valores.participante.fechaNacimiento) },
  ]);
  fila(m, [
    { etiqueta: "Grado que cursa", valor: vacio(valores.participante.grado) },
    { etiqueta: "Institución educativa", valor: vacio(valores.participante.institucion) },
    { etiqueta: "Teléfono familiar", valor: vacio(valores.participante.telefonoFamiliar) },
  ]);
  fila(m, [
    {
      etiqueta: "Correo electrónico familiar",
      valor: vacio(valores.participante.correoFamiliar),
    },
    {
      etiqueta: "Dirección o zona de residencia",
      valor: valores.participante.direccion.trim() || "No indicada",
    },
  ]);

  /* 3. Representante y contacto de emergencia */
  seccion(m, 3, "Representante y contacto de emergencia");
  bloquePersonas(m, g, valores);

  /* 4. Autorizados */
  seccion(m, 4, "Personas autorizadas para retirar al menor");
  tablaAutorizados(m, g, valores);

  /* 5. Salud */
  seccion(m, 5, "Información de salud relevante");
  bloqueSalud(m, g, valores);

  /* 6. Autorizaciones */
  seccion(m, 6, "Autorizaciones del representante");
  bloqueAutorizaciones(m, g, valores);

  /* 7. Compromiso y firma */
  seccion(m, 7, "Compromiso y firma del representante");
  parrafoSeguro(
    m,
    "Me comprometo a mantener actualizada la información suministrada y a comunicar oportunamente cualquier cambio que pueda afectar la participación o la seguridad del menor. Quien firma confirma la veracidad de los datos y los apartados marcados en esta ficha.",
    { size: 8, color: TINTA },
    6,
  );
  listaCasillas(
    m,
    [
      {
        texto:
          "Confirmo el compromiso descrito y la veracidad de la información suministrada.",
        marcado: valores.autorizaciones.compromiso,
      },
    ],
    NEGRO,
  );
  firmas(m, g, valores);

  /* 8. Privacidad */
  seccion(m, 8, "Aviso de privacidad y manejo de información");
  nota(
    m,
    `La información suministrada en esta ficha se utilizará únicamente para fines relacionados con la inscripción, organización, acompañamiento, seguridad y participación del menor en las actividades de ${g.nombre}. Su acceso se limitará a las personas responsables que necesiten conocerla para el cumplimiento de sus funciones. ${APP.notaLegal}`,
  );

  /* Pie de todas las páginas */
  const total = m.doc.getPageCount();
  m.doc.getPages().forEach((pagina, indice) => {
    const yPie = m.limite + 8;
    pagina.drawLine({
      start: { x: m.px(0), y: m.alto - yPie },
      end: { x: m.px(m.anchoUtil), y: m.alto - yPie },
      thickness: 0.5,
      color: pintar(GRIS_LINEA),
    });
    const izquierda = `${pieDocumento(valores.grupo)} - Pagina ${indice + 1} de ${total}`;
    pagina.drawText(sanear(izquierda), {
      x: m.px(0),
      y: m.alto - yPie - 10,
      size: 7,
      font: m.fuente,
      color: pintar(GRIS),
    });
    const derecha = sanear(`${APP.instrumentoPdf} ${g.nombre}`);
    pagina.drawText(derecha, {
      x: m.px(m.anchoUtil) - m.medir(derecha, { size: 7 }),
      y: m.alto - yPie - 10,
      size: 7,
      font: m.fuente,
      color: pintar(GRIS),
    });
  });

  m.doc.setTitle(`${APP.instrumentoPdf} ${g.nombre} · ${APP.tituloDocumento}`);
  m.doc.setSubject(
    `Inscripción de ${vacio(valores.participante.nombres)} en ${g.nombre}`,
  );

  const bytes = await m.doc.save();
  return { bytes, paginas: total };
}
