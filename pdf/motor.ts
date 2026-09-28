import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export const A4 = { ancho: 595.28, alto: 841.89 };

export type Tinta = { r: number; g: number; b: number };

export function hex(color: string): Tinta {
  const limpio = color.replace("#", "");
  return {
    r: parseInt(limpio.slice(0, 2), 16) / 255,
    g: parseInt(limpio.slice(2, 4), 16) / 255,
    b: parseInt(limpio.slice(4, 6), 16) / 255,
  };
}

export function pintar(color: Tinta) {
  return rgb(color.r, color.g, color.b);
}

const REEMPLAZOS: Record<string, string> = {
  "–": "-",
  "—": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "→": "->",
  "≤": "<=",
  "≥": ">=",
  "°": "o",
  "•": "·",
  "●": "·",
  "✓": "X",
  "✔": "X",
  "✗": "X",
  "⚠": "!",
  "☎": "Tel.",
  "✚": "+",
  "◉": "·",
  "✦": "*",
  "·": "·",
  "«": '"',
  "»": '"',
  "º": "o",
  "ª": "a",
  "‑": "-",
  " ": " ",
  " ": " ",
  " ": " ",
};

/** Las fuentes estándar de pdf-lib usan WinAnsi: se normaliza el texto. */
export function sanear(texto: string): string {
  let salida = "";
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0) ?? 63;
    if (codigo <= 0xff) {
      salida += REEMPLAZOS[caracter] ?? caracter;
      continue;
    }
    salida += REEMPLAZOS[caracter] ?? "";
  }
  return salida;
}

export type Estilo = {
  size?: number;
  negrita?: boolean;
  cursiva?: boolean;
  color?: Tinta;
  x?: number;
  ancho?: number;
  alineacion?: "izquierda" | "centro" | "derecha";
};

type Lienzo = {
  doc: PDFDocument;
  fuente: PDFFont;
  negrita: PDFFont;
  cursiva: PDFFont;
};

export class Motor {
  readonly doc: PDFDocument;
  readonly fuente: PDFFont;
  readonly negrita: PDFFont;
  readonly cursiva: PDFFont;
  readonly ancho = A4.ancho;
  readonly alto = A4.alto;
  readonly margen = { x: 44, arriba: 38, abajo: 46 };

  pagina!: PDFPage;
  y = 0;
  paginas = 0;

  constructor(
    doc: PDFDocument,
    fuentes: Lienzo,
    readonly alNuevaPagina: (motor: Motor) => void = () => {},
  ) {
    this.doc = doc;
    this.fuente = fuentes.fuente;
    this.negrita = fuentes.negrita;
    this.cursiva = fuentes.cursiva;
    this.nuevaPagina();
  }

  static async crear(
    alNuevaPagina: (motor: Motor) => void = () => {},
  ): Promise<Motor> {
    const doc = await PDFDocument.create();
    doc.setTitle("Ficha de inscripción y autorización");
    doc.setProducer("Herramienta de inscripción Chispita y Antorchita");
    doc.setCreator("Chispita y Antorchita");
    const [fuente, negrita, cursiva] = await Promise.all([
      doc.embedFont(StandardFonts.Helvetica),
      doc.embedFont(StandardFonts.HelveticaBold),
      doc.embedFont(StandardFonts.HelveticaOblique),
    ]);
    return new Motor(
      doc,
      { doc, fuente, negrita, cursiva },
      alNuevaPagina,
    );
  }

  /* ------------------------------------------------------------- */
  /* Páginas y coordenadas                                          */
  /* ------------------------------------------------------------- */

  nuevaPagina(): void {
    this.pagina = this.doc.addPage([this.ancho, this.alto]);
    this.paginas += 1;
    this.y = this.margen.arriba;
  }

  get anchoUtil(): number {
    return this.ancho - this.margen.x * 2;
  }

  get limite(): number {
    return this.alto - this.margen.abajo;
  }

  /** Corta página si el bloque no cabe. */
  asegurar(altoNecesario: number): void {
    if (this.y + altoNecesario > this.limite) {
      this.nuevaPagina();
      this.alNuevaPagina(this);
    }
  }

  px(x: number): number {
    return this.margen.x + x;
  }

  py(): number {
    return this.alto - this.y;
  }

  /* ------------------------------------------------------------- */
  /* Medición                                                       */
  /* ------------------------------------------------------------- */

  elegir(estilo: Estilo = {}): PDFFont {
    if (estilo.negrita) return this.negrita;
    if (estilo.cursiva) return this.cursiva;
    return this.fuente;
  }

  medir(texto: string, estilo: Estilo = {}): number {
    const size = estilo.size ?? 9;
    return this.elegir(estilo).widthOfTextAtSize(sanear(texto), size);
  }

  envolver(texto: string, estilo: Estilo = {}): string[] {
    const size = estilo.size ?? 9;
    const ancho = estilo.ancho ?? this.anchoUtil;
    const fuente = this.elegir(estilo);
    const salida: string[] = [];

    for (const parrafoCrudo of sanear(texto).split("\n")) {
      const palabras = parrafoCrudo.split(/\s+/).filter(Boolean);
      if (!palabras.length) {
        salida.push("");
        continue;
      }
      let actual = "";
      for (const palabra of palabras) {
        const tentativa = actual ? `${actual} ${palabra}` : palabra;
        if (fuente.widthOfTextAtSize(tentativa, size) <= ancho) {
          actual = tentativa;
          continue;
        }
        if (actual) salida.push(actual);
        actual = palabra;
      }
      if (actual) salida.push(actual);
    }
    return salida;
  }

  altoLineas(cantidad: number, estilo: Estilo = {}): number {
    const size = estilo.size ?? 9;
    return Math.max(0, cantidad) * size * 1.32;
  }

  altoParrafo(texto: string, estilo: Estilo = {}): number {
    return this.altoLineas(this.envolver(texto, estilo).length, estilo);
  }

  /* ------------------------------------------------------------- */
  /* Dibujo                                                         */
  /* ------------------------------------------------------------- */

  texto(linea: string, estilo: Estilo = {}): void {
    const size = estilo.size ?? 9;
    const fuente = this.elegir(estilo);
    const x = this.px(estilo.x ?? 0);
    const ancho = estilo.ancho ?? this.anchoUtil;
    const anchoTexto = fuente.widthOfTextAtSize(sanear(linea), size);
    let xFinal = x;
    if (estilo.alineacion === "centro") xFinal = x + (ancho - anchoTexto) / 2;
    if (estilo.alineacion === "derecha") xFinal = x + ancho - anchoTexto;
    this.pagina.drawText(sanear(linea), {
      x: xFinal,
      y: this.py() - size,
      size,
      font: fuente,
      color: pintar(estilo.color ?? { r: 0, g: 0, b: 0 }),
    });
    this.y += size * 1.32;
  }

  /** Igual que `texto`, pero reduce o recorta la línea si excede el ancho. */
  textoAjustado(linea: string, estilo: Estilo = {}): void {
    const ancho = estilo.ancho ?? this.anchoUtil;
    const ajuste = this.ajustar(linea, ancho, estilo);
    this.texto(ajuste.texto, { ...estilo, size: ajuste.size });
  }

  parrafo(texto: string, estilo: Estilo = {}): void {
    for (const linea of this.envolver(texto, estilo)) this.texto(linea, estilo);
  }

  caja(
    x: number,
    y: number,
    ancho: number,
    alto: number,
    relleno?: Tinta,
    borde?: Tinta,
    grosor = 0.6,
  ): void {
    /* Las cajas se dibujan a mano: avisa si alguna se sale de la hoja. */
    if (x < -0.5 || x + ancho > this.anchoUtil + 0.5) {
      console.error(
        `[ficha] caja fuera del ancho imprimible: x=${x.toFixed(1)} ancho=${ancho.toFixed(1)} (max ${this.anchoUtil.toFixed(1)})`,
      );
    }
    this.pagina.drawRectangle({
      x: this.px(x),
      y: this.alto - y - alto,
      width: ancho,
      height: alto,
      color: relleno ? pintar(relleno) : undefined,
      borderColor: borde ? pintar(borde) : undefined,
      borderWidth: borde ? grosor : 0,
    });
  }

  lineaHorizontal(x: number, y: number, ancho: number, color: Tinta, grosor = 0.6): void {
    this.pagina.drawLine({
      start: { x: this.px(x), y: this.alto - y },
      end: { x: this.px(x + ancho), y: this.alto - y },
      thickness: grosor,
      color: pintar(color),
    });
  }

  /** Cuadro de verificación; dibuja una X cuando está marcado. */
  casilla(x: number, y: number, marcado: boolean, color: Tinta, lado = 9): void {
    this.caja(x, y, lado, lado, undefined, color, 0.7);
    if (!marcado) return;
    const d = lado - 3.4;
    this.pagina.drawLine({
      start: { x: this.px(x + 1.2), y: this.alto - y - 1.6 },
      end: { x: this.px(x + 1.2 + d), y: this.alto - y - 1.6 - d },
      thickness: 1.1,
      color: pintar(color),
    });
    this.pagina.drawLine({
      start: { x: this.px(x + 1.2 + d), y: this.alto - y - 1.6 },
      end: { x: this.px(x + 1.2), y: this.alto - y - 1.6 - d },
      thickness: 1.1,
      color: pintar(color),
    });
  }

  /** Reduce el tamaño y, si no cabe, recorta con puntos suspensivos. */
  ajustar(
    texto: string,
    ancho: number,
    estilo: Estilo,
    minimo = 5.5,
  ): { texto: string; size: number } {
    const size = estilo.size ?? 9;
    if (this.medir(texto, estilo) <= ancho) return { texto, size };

    const nuevo = Math.max(minimo, (size * ancho) / this.medir(texto, estilo));
    if (this.medir(texto, { ...estilo, size: nuevo }) <= ancho) {
      return { texto, size: nuevo };
    }

    let recorte = sanear(texto).trimEnd();
    while (recorte.length > 1) {
      recorte = recorte.slice(0, -1).trimEnd();
      if (this.medir(`${recorte}...`, { ...estilo, size: nuevo }) <= ancho) {
        return { texto: `${recorte}...`, size: nuevo };
      }
    }
    return { texto: recorte, size: nuevo };
  }

  /** Etiqueta pequeña + valor en negrita, con línea de base. Si el valor
   *  está vacío y se pasa `guia`, se dibuja esa plantilla en gris cursiva
   *  para ayudar a llenar la ficha a mano. */
  campo(
    x: number,
    y: number,
    ancho: number,
    etiqueta: string,
    valor: string,
    color: Tinta,
    tintaValor: Tinta,
    guia?: string,
  ): void {
    const cursor = this.y;
    this.y = y;
    const ajusteEtiqueta = this.ajustar(etiqueta, ancho, { size: 7.2 });
    this.texto(ajusteEtiqueta.texto, {
      x,
      size: ajusteEtiqueta.size,
      color,
    });
    const valorLimpio = sanear(valor);
    if (valorLimpio || !guia) {
      const ajusteValor = this.ajustar(valor, ancho, { size: 10, negrita: true });
      this.pagina.drawText(ajusteValor.texto, {
        x: this.px(x),
        y: this.alto - (y + 8.4) - ajusteValor.size,
        size: ajusteValor.size,
        font: this.negrita,
        color: pintar(tintaValor),
      });
    } else {
      const ajusteGuia = this.ajustar(guia, ancho, { size: 8, cursiva: true });
      this.pagina.drawText(ajusteGuia.texto, {
        x: this.px(x),
        y: this.alto - (y + 8.4) - ajusteGuia.size,
        size: ajusteGuia.size,
        font: this.cursiva,
        color: pintar({ r: 0.45, g: 0.45, b: 0.45 }),
      });
    }
    this.lineaHorizontal(x, y + 22, ancho, color, 0.5);
    this.y = cursor;
  }
}
