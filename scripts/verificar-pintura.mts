/**
 * Comprueba que el boton del panel se VE, no solo que existe.
 *
 * El fallo que motivó esta prueba era silencioso: el boton era correcto en el
 * HTML pero salia blanco sobre blanco, porque `bg-accent` no resolvia fuera de
 * un [data-group]. Un test que solo busca el texto no lo pilla; hay que mirar
 * el color pintar de verdad.
 *
 *   npm run verificar:pintura      (con el servidor levantado)
 */
import { pathToFileURL } from "node:url";
import { rutaPuppeteer } from "./herramientas.mts";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PUPPETEER = rutaPuppeteer();
const CHROME =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const fallos: string[] = [];
function comprobar(ok: boolean, mensaje: string) {
  console.log(`${ok ? "[OK]" : "[FALLA]"} ${mensaje}`);
  if (!ok) fallos.push(mensaje);
}

/* Contraste de un color sobre otro, segun WCAG. */
function luminancia(canal: number) {
  const v = canal / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function contraste(uno: string, otro: string) {
  const [r1, g1, b1] = uno.match(/\d+/g)!.map(Number);
  const [r2, g2, b2] = otro.match(/\d+/g)!.map(Number);
  const l1 = 0.2126 * luminancia(r1) + 0.7152 * luminancia(g1) + 0.0722 * luminancia(b1);
  const l2 = 0.2126 * luminancia(r2) + 0.7152 * luminancia(g2) + 0.0722 * luminancia(b2);
  const [claro, oscuro] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (claro + 0.05) / (oscuro + 0.05);
}

const { default: puppeteer } = await import(pathToFileURL(PUPPETEER).href);
const navegador = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--disable-extensions", "--no-sandbox"],
});
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1280, height: 900 });

await pagina.goto(`${BASE}/registros`, { waitUntil: "networkidle0" });

const pintura = await pagina.evaluate(() => {
  const boton = document.querySelector<HTMLButtonElement>(
    'form button[type="submit"]',
  );
  if (!boton) return null;
  const estilos = getComputedStyle(boton);
  const caja = boton.getBoundingClientRect();

  /* Si el fondo es transparente, el color real es el del primer ancestro que
   * si lo tenga. Medir el contraste contra un rgba(0,0,0,0) daria un 21:1
   * falso: hay que subir hasta el fondo que se ve de verdad.
   * El recorrido va en linea, sin funciones con nombre: tsx les inyecta un
   * helper que dentro de la pagina no existe. */
  let fondoDetras = "rgb(255, 255, 255)";
  let ancestro: HTMLElement | null = boton;
  while (ancestro) {
    const color = getComputedStyle(ancestro).backgroundColor;
    const partes = color.match(/[\d.]+/g);
    const alfa = partes === null ? 1 : Number(partes[3]);
    if (color !== "transparent" && alfa > 0) {
      fondoDetras = color;
      break;
    }
    ancestro = ancestro.parentElement;
  }

  return {
    texto: boton.textContent?.trim() ?? "",
    color: estilos.color,
    fondo: estilos.backgroundColor,
    fondoDetras,
    ancho: caja.width,
    alto: caja.height,
    visible: caja.width > 0 && caja.height > 0,
  };
});

if (!pintura) {
  comprobar(false, "Se encuentra el boton de entrar en /registros");
} else {
  comprobar(pintura.visible, `El boton tiene tamano real (${Math.round(pintura.ancho)}x${Math.round(pintura.alto)} px)`);

  /* Si el fondo se queda transparente, el texto blanco se come el fondo de la
   * pagina y no se ve nada. Este es exactamente el fallo que se busca. */
  const fondoTransparente = pintura.fondo === "rgba(0, 0, 0, 0)" || pintura.fondo === "transparent";
  comprobar(!fondoTransparente, `El boton tiene fondo (${pintura.fondo})`);

  /* Contraste contra lo que hay detras, resuelto por los ancestros. Un boton
   * transparente con texto blanco sale mal aqui aunque el rgba diga otra cosa:
   * es el contraste 1.00:1 del boton que se veia blanco sobre blanco. */
  const tras = fondoTransparente ? pintura.fondoDetras : pintura.fondo;
  const ratio = contraste(pintura.color, tras);
  comprobar(
    ratio >= 4.5,
    `El texto del boton se lee sobre lo que tiene detras (contraste ${ratio.toFixed(2)}:1 sobre ${tras}, minimo 4.5:1)`,
  );

  /* Y con texto dentro tiene que verse de verdad. */
  await pagina.type("#clave-panel", "cualquiera");
  const conTexto = await pagina.evaluate(() => {
    const boton = document.querySelector<HTMLButtonElement>('form button[type="submit"]')!;
    return { habilitado: !boton.disabled, opacidad: getComputedStyle(boton).opacity };
  });
  comprobar(conTexto.habilitado, "El boton se habilita al escribir la clave");
  comprobar(Number(conTexto.opacidad) === 1, `El boton habilitado no pierde opacidad (${conTexto.opacidad})`);
}

/* El encabezado y el fondo de la pagina tampoco pueden ser blancos. */
const paginaFondo = await pagina.evaluate(() => ({
  fondo: getComputedStyle(document.body).backgroundColor,
  tinta: getComputedStyle(document.body).color,
}));
comprobar(
  contraste(paginaFondo.tinta, paginaFondo.fondo) >= 4.5,
  `La pagina tiene texto legible (contraste ${contraste(paginaFondo.tinta, paginaFondo.fondo).toFixed(2)}:1)`,
);

await navegador.close();

console.log(
  fallos.length === 0 ? "PINTURA CORRECTA" : `PINTURA CON ${fallos.length} FALLA(S)`,
);
process.exit(fallos.length === 0 ? 0 : 1);
