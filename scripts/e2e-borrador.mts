/**
 * Prueba del borrador guardado, la parte que más se rompe sin avisar.
 *
 * Conviene ejecutarla contra `next dev` y no solo contra `next start`: en
 * desarrollo React monta, desmonta y vuelve a montar los efectos, y ese ciclo
 * es justo el que puede pisar el borrador guardado con uno vacío.
 *
 *   npm run dev -- -p 3100      # en otra terminal
 *   npm run e2e:borrador
 */
import { pathToFileURL } from "node:url";
import { rutaPuppeteer } from "./herramientas.mts";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CHROME =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CLAVE = "inscripcion:chispita-antorchita:v1:chispita";

const { default: puppeteer } = await import(pathToFileURL(rutaPuppeteer()).href);

const fallos: string[] = [];
function comprobar(ok: boolean, mensaje: string) {
  console.log(`${ok ? "[OK]" : "[FALLA]"} ${mensaje}`);
  if (!ok) fallos.push(mensaje);
}

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1280, height: 900 });

  /* Next.js avisa por consola de la configuración de scroll; solo en desarrollo,
   * que es justo donde corre esta prueba. */
  const avisosConsola: string[] = [];
  pagina.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "warn") avisosConsola.push(m.text());
  });

  await pagina.goto(`${BASE}/`, { waitUntil: "networkidle0" });

  const scrollBehavior = await pagina.evaluate(
    () => document.documentElement.getAttribute("data-scroll-behavior"),
  );
  comprobar(
    scrollBehavior === "smooth",
    `El <html> declara data-scroll-behavior para no romper la navegacion (${scrollBehavior})`,
  );

  await pagina.evaluate(() => window.localStorage.clear());

  /* Se rellena el paso 1 con datos de prueba. */
  await pagina.goto(`${BASE}/inscripcion?grupo=chispita`, {
    waitUntil: "networkidle0",
  });
  await new Promise((r) => setTimeout(r, 800));

  /** React ignora `el.value = x`; hay que usar el setter nativo. */
  const escribir = async (nombre: string, valor: string) => {
    const selector = `[name='${nombre}']`;
    await pagina.waitForSelector(selector, { timeout: 15000 });
    await pagina.$eval(
      selector,
      (el, nuevo) => {
        const proto = el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : el instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter?.call(el, nuevo);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new Event("blur", { bubbles: true }));
      },
      valor,
    );
    await new Promise((r) => setTimeout(r, 40));
  };

  await escribir("participante.nombres", "Ana Lucía Pérez");
  await escribir("participante.fechaNacimiento", "2017-04-12");
  await escribir("participante.grado", "3.º");
  await escribir("participante.institucion", "Colegio Santa Ana");
  await escribir("participante.telefonoFamiliar", "8095551234");
  await escribir("participante.correoFamiliar", "familia@correo.do");
  await new Promise((r) => setTimeout(r, 300));

  /* Se avanza al paso 2 para comprobar que el borrador guarda ambos pasos. */
  await pagina.evaluate(() => {
    const botones = [...document.querySelectorAll(
      "nav[aria-label='Navegación del formulario'] button",
    )];
    (botones[botones.length - 1] as HTMLButtonElement | undefined)?.click();
  });
  await new Promise((r) => setTimeout(r, 600));
  await escribir("representante.nombres", "José Antonio Pérez");
  await escribir("representante.parentesco", "Padre");
  await escribir("representante.telefonoPrincipal", "8095559876");
  await escribir("representante.correo", "jose@correo.do");
  await new Promise((r) => setTimeout(r, 300));

  const enPaso2 = await pagina.$eval("header", (h) => h.getAttribute("data-paso"));
  comprobar(enPaso2 === "2", `Se avanzó al paso 2 (paso: ${enPaso2})`);

  /* Al recargar debe ofrecerse el borrador con los datos dentro. */
  await pagina.reload({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));

  const guardado = await pagina.evaluate((clave) => {
    const crudo = window.localStorage.getItem(clave);
    if (!crudo) return null;
    const datos = JSON.parse(crudo);
    return {
      nombres: datos.valores?.participante?.nombres ?? "",
      grado: datos.valores?.participante?.grado ?? "",
      representante: datos.valores?.representante?.nombres ?? "",
      paso: datos.paso,
    };
  }, CLAVE);

  comprobar(
    guardado !== null && guardado.nombres === "Ana Lucía Pérez",
    `El borrador guardado conserva el nombre (${JSON.stringify(guardado)})`,
  );
  comprobar(
    guardado !== null && guardado.representante === "José Antonio Pérez",
    "El borrador guardado conserva también el paso 2",
  );
  comprobar(
    guardado !== null && guardado.paso === 1,
    `El borrador recuerda el paso 2 (paso guardado: ${guardado?.paso})`,
  );

  const aviso = await pagina.evaluate(
    () => document.body.textContent?.includes("Hay una inscripción a medias guardada") ?? false,
  );
  comprobar(aviso, "Se ofrece la inscripción a medias");

  /* Al pulsar «Continuar donde lo dejé» los datos deben volver a estar. */
  await pagina.evaluate(() => {
    const botones = [...document.querySelectorAll("button")];
    const seguir = botones.find((b) =>
      b.textContent?.includes("Continuar donde lo dejé"),
    );
    (seguir as HTMLButtonElement | undefined)?.click();
  });
  await new Promise((r) => setTimeout(r, 700));

  const restaurado = await pagina.evaluate(() => ({
    paso: document.querySelector("header")?.getAttribute("data-paso"),
    representante: (
      document.querySelector("[name='representante.nombres']") as HTMLInputElement | null
    )?.value,
    aviso: document.body.textContent?.includes("Se restauró el borrador guardado") ?? false,
  }));

  comprobar(
    restaurado.representante === "José Antonio Pérez",
    `Tras recuperar vuelve el paso donde se estaba (nombre: "${restaurado.representante}")`,
  );
  comprobar(
    restaurado.paso === "2",
    `Se vuelve al paso 2 (paso: ${restaurado.paso})`,
  );
  comprobar(restaurado.aviso, "Se confirma que el borrador se restauró");

  /* Y los datos del paso 1 siguen ahí al volver atrás. */
  await pagina.click("nav[aria-label='Progreso de la inscripción'] ol li:first-child button");
  await new Promise((r) => setTimeout(r, 500));
  const paso1 = await pagina.evaluate(() => ({
    nombres: (
      document.querySelector("[name='participante.nombres']") as HTMLInputElement | null
    )?.value,
    grado: (document.querySelector("[name='participante.grado']") as HTMLInputElement | null)
      ?.value,
  }));
  comprobar(
    paso1.nombres === "Ana Lucía Pérez",
    `Tras volver al paso 1, el nombre sigue ahí ("${paso1.nombres}")`,
  );
  comprobar(paso1.grado === "3.º", `El grado sigue ahí ("${paso1.grado}")`);

  /* Y el borrador restaurado debe seguir ahí al volver atrás. */
  await pagina.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 400));
  await pagina.goto(`${BASE}/inscripcion?grupo=chispita`, {
    waitUntil: "networkidle0",
  });
  await new Promise((r) => setTimeout(r, 1000));
  const segundoAviso = await pagina.evaluate(
    () => document.body.textContent?.includes("Hay una inscripción a medias guardada") ?? false,
  );
  comprobar(segundoAviso, "El borrador sigue disponible tras otro viaje al inicio");

  await pagina.evaluate(() => window.localStorage.clear());

  const avisosNext = avisosConsola.filter((a) =>
    /scroll-behavior|nextjs\.org\/docs\/messages/.test(a),
  );
  comprobar(
    avisosNext.length === 0,
    `Sin avisos de configuracion de Next.js: ${avisosNext.join(" | ")}`,
  );
} finally {
  await navegador.close();
}

console.log(fallos.length ? `FALLOS: ${fallos.length}` : "BORRADOR CORRECTO");
process.exit(fallos.length ? 1 : 0);
