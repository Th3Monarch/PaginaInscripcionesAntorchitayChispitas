/**
 * El ojo de ver la clave.
 *
 * No basta con que el boton exista: hay que comprobar que el campo cambia de
 * tipo de verdad, que el texto sigue ahi, que no se manda el form al pulsar el
 * ojo, y que se puede usar con el teclado. Un `type` mal puesto deja el campo
 * enmascarado para siempre y nada mas lo delata.
 *
 *   npm run e2e:ojo      (con el servidor levantado)
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

const { default: puppeteer } = await import(pathToFileURL(PUPPETEER).href);
const navegador = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--disable-extensions", "--no-sandbox"],
});
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1280, height: 900 });

await pagina.goto(`${BASE}/registros`, { waitUntil: "networkidle0" });

const SECRETA = "Prueba-Ojo-123";

/* 1. Empieza enmascarada, que es lo seguro por defecto. */
const inicial = await pagina.evaluate(() => {
  const campo = document.querySelector<HTMLInputElement>("#clave-panel");
  return campo ? { tipo: campo.type, tieneBoton: false } : null;
});
comprobar(inicial !== null, "Existe el campo de clave");
comprobar(inicial?.tipo === "password", `Empieza enmascarada (type=${inicial?.tipo})`);

/* 2. El boton del ojo existe y se anuncia bien para quien usa lector de
 * pantalla: un icono solo no dice nada. */
const boton = await pagina.evaluate(() => {
  const b = document.querySelector<HTMLButtonElement>(
    'button[aria-controls="clave-panel"]',
  );
  if (!b) return null;
  return {
    tipo: b.getAttribute("type"),
    etiqueta: b.getAttribute("aria-label"),
    presionado: b.getAttribute("aria-pressed"),
    svg: b.querySelector("svg") !== null,
    /* El ojo tiene que caber en un objetivo tactil de 44 px. */
    ancho: b.getBoundingClientRect().width,
    alto: b.getBoundingClientRect().height,
  };
});
comprobar(boton !== null, "Existe el boton del ojo");
comprobar(boton?.tipo === "button", `El boton es type="button" y no envia el form (${boton?.tipo})`);
comprobar(Boolean(boton?.etiqueta), `El boton tiene nombre accesible ("${boton?.etiqueta}")`);
comprobar(boton?.svg === true, "El boton dibuja un icono, no esta vacio");
comprobar(
  (boton?.ancho ?? 0) >= 40 && (boton?.alto ?? 0) >= 40,
  `El ojo es un objetivo grande (${Math.round(boton?.ancho ?? 0)}x${Math.round(boton?.alto ?? 0)} px)`);

/* 3. Escribir y taught el ojo. */
await pagina.type("#clave-panel", SECRETA);

await pagina.click('button[aria-controls="clave-panel"]');
const visible = await pagina.evaluate(() => {
  const campo = document.querySelector<HTMLInputElement>("#clave-panel")!;
  const b = document.querySelector<HTMLButtonElement>('button[aria-controls="clave-panel"]')!;
  return {
    tipo: campo.type,
    valor: campo.value,
    etiqueta: b.getAttribute("aria-label"),
    presionado: b.getAttribute("aria-pressed"),
  };
});
comprobar(visible.tipo === "text", `Al tapar el ojo el campo se muestra (type=${visible.tipo})`);
comprobar(visible.valor === SECRETA, "La clave escrita se conserva al mostrarla");
comprobar(visible.presionado === "true", "aria-pressed pasa a true");
comprobar(
  visible.etiqueta === "Ocultar la clave",
  `La etiqueta dice lo que hace ahora ("${visible.etiqueta}")`,
);

/* 4. Y al taparlo otra vez vuelve a enmascararse, sin perder el texto. */
await pagina.click('button[aria-controls="clave-panel"]');
const oculto = await pagina.evaluate(() => {
  const campo = document.querySelector<HTMLInputElement>("#clave-panel")!;
  const b = document.querySelector<HTMLButtonElement>('button[aria-controls="clave-panel"]')!;
  return {
    tipo: campo.type,
    valor: campo.value,
    etiqueta: b.getAttribute("aria-label"),
  };
});
comprobar(oculto.tipo === "password", `Vuelve a enmascararse (type=${oculto.tipo})`);
comprobar(oculto.valor === SECRETA, "No se borra la clave al volver a taparla");
comprobar(oculto.etiqueta === "Ver la clave", "La etiqueta vuelve a «Ver la clave»");

/* 5. El ojo no debe mandar el formulario: una contraseña que se va al servidor
 * antes de tiempo es justo lo que el formulario no hace. */
await pagina.evaluate(() => {
  const ventanaInterceptada = window as Window & { __enviosAcceso: number };
  const original = window.fetch;
  ventanaInterceptada.__enviosAcceso = 0;
  window.fetch = (...args: Parameters<typeof original>) => {
    if (String(args[0]).includes("/api/acceso"))
      ventanaInterceptada.__enviosAcceso += 1;
    return original(...args);
  };
});
await pagina.click('button[aria-controls="clave-panel"]');
await pagina.click('button[aria-controls="clave-panel"]');
const enviados = await pagina.evaluate(
  () => (window as Window & { __enviosAcceso: number }).__enviosAcceso,
);
comprobar(enviados === 0, `Tocar el ojo no manda nada al servidor (${enviados} envios)`);

/* 6. Se puede usar sin raton. */
await pagina.focus("#clave-panel");
await pagina.keyboard.press("Tab");
const conTeclado = await pagina.evaluate(() => {
  const activo = document.activeElement;
  return {
    esElOjo: activo?.getAttribute("aria-controls") === "clave-panel",
    tipo: (activo as HTMLInputElement | null)?.type,
  };
});
comprobar(conTeclado.esElOjo, "El ojo se alcanza con el Tab");
await pagina.keyboard.press("Enter");
const trasEnter = await pagina.evaluate(
  () =>
    document.querySelector<HTMLInputElement>("#clave-panel")?.type,
);
comprobar(trasEnter === "text", `El Enter en el ojo lo abre (type=${trasEnter})`);

/* 7. El boton de entrar sigue funcionando con la clave buena. El campo todavia
 * tiene el texto de la prueba del ojo: se pisa con el setter nativo (via
 * React) y no con Ctrl+A, que a veces se queda sin seleccion en el headless. */
await pagina.evaluate((clave: string) => {
  const campo = document.querySelector<HTMLInputElement>("#clave-panel");
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  setter.call(campo, clave);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
}, process.env.PANEL_CLAVE ?? "");
await pagina.evaluate(() => {
  const b = document.querySelector<HTMLButtonElement>('form button[type="submit"]');
  if (b) b.disabled = false;
});
await pagina.click('form button[type="submit"]');
await pagina.waitForFunction(
  () =>
    document.body.innerText.includes("Fichas nuevas") &&
    document.body.innerText.includes("Descargar Excel"),
  { timeout: 10000 },
);
const dentro = await pagina.evaluate(() => document.body.innerText);
comprobar(
  dentro.includes("Fichas nuevas") && dentro.includes("Descargar Excel"),
  "Entrar con la clave correcta sigue llevando a la lista",
);

await navegador.close();

console.log(
  fallos.length === 0 ? "OJO CORRECTO" : `OJO CON ${fallos.length} FALLA(S)`,
);
process.exit(fallos.length === 0 ? 0 : 1);
