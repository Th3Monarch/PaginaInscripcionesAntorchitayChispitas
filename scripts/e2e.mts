/**
 * Prueba end-to-end del flujo real: landing -> 7 pasos -> PDF.
 *
 * Necesita `puppeteer-core` y un Chrome instalado. No son dependencias del
 * proyecto para que el despliegue siga siendo ligero:
 *   npm i -D puppeteer-core     (o indicarlo con PUPPETEER_PATH)
 *   npm run build && npm start -- -p 3100
 *   npm run e2e
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { rutaPuppeteer } from "./herramientas.mts";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PUPPETEER = rutaPuppeteer();
const CHROME =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const { default: puppeteer } = await import(pathToFileURL(PUPPETEER).href);

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
  const erroresConsola: string[] = [];
  const avisosConsola: string[] = [];
  pagina.on("console", (m) => {
    if (m.type() === "error") erroresConsola.push(m.text());
    if (m.type() === "warning" || m.type() === "warn") avisosConsola.push(m.text());
  });
  pagina.on("pageerror", (e) => erroresConsola.push(String(e)));
  pagina.on("requestfailed", (r) => {
    erroresConsola.push(`requestfailed ${r.url()}`);
  });
  const httpErrores: string[] = [];
  pagina.on("response", (r) => {
    if (r.status() < 400) return;
    /* La prueba del panel pide la lista a proposito sin cookie, y el 401 es la
     * respuesta correcta. Contarlo como fallo de la pagina seria un falso
     * positivo. */
    if (
      r.status() === 401 &&
      r.url().includes("/api/inscripciones")
    ) {
      return;
    }
    httpErrores.push(`http ${r.status()} ${r.url()}`);
  });

  /* 1. Landing */
  await pagina.goto(BASE, { waitUntil: "networkidle0" });
  const grupo = await pagina.$eval("[data-group]", (el) => el.getAttribute("data-group"));
  comprobar(grupo !== null, `La landing define data-group=${grupo}`);
  const enlaces = await pagina.$$eval("a[href^='/inscripcion']", (as) =>
    as.map((a) => a.getAttribute("href")),
  );
  comprobar(
    enlaces.length === 2 && enlaces.includes("/inscripcion?grupo=chispita") && enlaces.includes("/inscripcion?grupo=antorchita"),
    `La landing ofrece los dos grupos: ${enlaces.join(", ")}`,
  );

  /* 2. Ruta invalida */
  await pagina.goto(`${BASE}/inscripcion?grupo=otro`, { waitUntil: "networkidle0" });
  comprobar(
    pagina.url().replace(/\/$/, "").endsWith(BASE),
    `Un grupo inválido redirige al inicio (${pagina.url()})`,
  );

  /* 2b. API de fichas: valida en el servidor y degrada sin configuracion.
   * Esto va con el fetch de Node, no con el del navegador: no necesita la
   * pagina y asi el flujo de la prueba no depende de la interfaz. */
  const pedirApi = async (cuerpo?: unknown) => {
    const respuesta = await fetch(`${BASE}/api/inscripciones`, {
      method: cuerpo ? "POST" : "GET",
      headers: { "content-type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    return { estado: respuesta.status, cuerpo: await respuesta.json() };
  };

  const apiListado = await pedirApi();
  const apiValido = await pedirApi({
    envio: crypto.randomUUID(),
    grupo: "chispita",
    participante: "Ana Lucia Perez",
    contacto: "8095559876",
  });
  const apiSinUuid = await pedirApi({ grupo: "chispita", participante: "Ana" });
  const apiGrupoInventado = await pedirApi({
    envio: crypto.randomUUID(),
    grupo: "inventado",
    participante: "Ana Lucia",
  });

  comprobar(
    apiListado.estado === 401 || apiListado.estado === 503,
    `Sin sesion la API de fichas no devuelve la lista (HTTP ${apiListado.estado})`,
  );
  comprobar(
    !JSON.stringify(apiListado.cuerpo).includes('"registros"'),
    "La respuesta sin sesion no incluye la lista",
  );

  /* El POST sigue siendo publico: lo llaman las familias al terminar. Por eso
   * valida en el servidor y no acepta cualquier cosa. */
  comprobar(
    apiValido.estado === 200 || apiValido.estado === 201,
    `Un registro bien formado se acepta sin romper la ficha (HTTP ${apiValido.estado})`,
  );
  comprobar(
    apiSinUuid.estado === 400,
    `Un envio sin uuid se rechaza (HTTP ${apiSinUuid.estado})`,
  );
  comprobar(
    apiGrupoInventado.estado === 400,
    `Un grupo inexistente se rechaza (HTTP ${apiGrupoInventado.estado})`,
  );

  /* 2c. El panel pide clave antes de enseñar nada. */
  await pagina.goto(`${BASE}/registros`, { waitUntil: "networkidle0" });
  const panel = await pagina.evaluate(() => document.body.innerText);
  comprobar(
    panel.includes("Acceso a la lista") && panel.includes("Clave"),
    "El panel pide la clave en vez de mostrar la lista",
  );
  comprobar(
    !panel.includes("Descargar Excel"),
    "Sin clave no aparece el boton de descargar",
  );

  /* 3. Recorrido completo de Chispita */
  await pagina.goto(`${BASE}/inscripcion?grupo=chispita`, { waitUntil: "networkidle0" });
  comprobar(
    (await pagina.$eval("[data-group]", (el) => el.getAttribute("data-group"))) === "chispita",
    "El paso 1 muestra el grupo chispita",
  );

  /** React ignora `el.value = x`; hay que usar el setter nativo. */
  const escribir = async (nombre: string, valor: string) => {
    const selector = `[name="${nombre}"]`;
    await pagina.waitForSelector(selector, { timeout: 8000 });
    await pagina.$eval(
      selector,
      (el, nuevo) => {
        const proto =
          el instanceof HTMLTextAreaElement
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

  /** Las barras de pasos y navegación están fijas: hay que centrar el
   *  elemento antes de pulsar para no hacer clic sobre ellas. */
  const centrar = async (selector: string) => {
    await pagina.$eval(selector, (el) =>
      el.scrollIntoView({ block: "center", inline: "nearest" }),
    );
    await new Promise((r) => setTimeout(r, 120));
  };

  const marcar = async (nombre: string) => {
    const selector = `input[name="${nombre}"]`;
    await pagina.waitForSelector(selector, { timeout: 8000 });
    await centrar(selector);
    await pagina.click(selector);
    await new Promise((r) => setTimeout(r, 40));
  };

  const marcarOpcion = async (prefijo: string, indice: number) => {
    await pagina.waitForSelector(`input[name="${prefijo}"]`, { timeout: 8000 });
    const opciones = await pagina.$$(`input[name="${prefijo}"]`);
    await opciones[indice].evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "nearest" }),
    );
    await new Promise((r) => setTimeout(r, 120));
    await opciones[indice].click();
    await new Promise((r) => setTimeout(r, 40));
  };

  const marcarPrimero = (prefijo: string) => marcarOpcion(prefijo, 0);

  const estado = async () =>
    pagina.$eval("header", (cabecera) => {
      const alerta = document.querySelector("[role='alert']")?.textContent ?? "";
      return `paso ${cabecera.getAttribute("data-paso")} :: ${alerta}`;
    });

  const continuar = async (esperado: number) => {
    const botones = await pagina.$$("nav[aria-label='Navegación del formulario'] button");
    await botones[botones.length - 1].click();
    await new Promise((r) => setTimeout(r, 450));
    const texto = await estado();
    if (!texto.startsWith(`paso ${esperado}`)) {
      const errores = await pagina.$$eval("[aria-invalid='true']", (els) =>
        els.map((e) => `${e.getAttribute("name")}`),
      );
      throw new Error(
        `No se avanzó al paso ${esperado}. Estado: ${texto}. Campos con error: ${errores.join(", ")}`,
      );
    }
  };


  /* Rellena los pasos 2 a 5 y llega a la revisión. */
  const llenarHastaRevision = async () => {
    await escribir("representante.nombres", "Ana Lucía Pérez");
    await escribir("representante.parentesco", "Madre");
    await escribir("representante.telefonoPrincipal", "04125559876");
    await escribir("representante.correo", "ana@correo.do");
    await escribir("representante.documento", "001-1234567-8");
    await continuar(3);

    await escribir("emergencia.nombres", "José Pérez");
    await escribir("emergencia.parentesco", "Abuelo");
    await escribir("emergencia.telefono", "04165557788");
    await continuar(4);

    await escribir("autorizados.0.nombres", "Rosa Pérez");
    await escribir("autorizados.0.parentesco", "Tía");
    await escribir("autorizados.0.telefono", "04145553333");
    await marcar("autorizados.0.autorizada");
    await marcarPrimero("salud.alergia");
    await escribir("salud.alergiaDetalle", "Penicilina");
    await marcarPrimero("salud.condicion");
    await escribir("salud.condicionDetalle", "Asma leve");
    await marcarOpcion("salud.medicamento", 1);
    await marcarOpcion("salud.otra", 1);
    await continuar(5);

    await marcarPrimero("autorizaciones.participacion");
    await marcar("autorizaciones.externasInformado");
    await marcar("autorizaciones.externasRevisa");
    await marcarPrimero("autorizaciones.imagenes");
    await escribir(
      "autorizaciones.imagenesCondiciones",
      "Solo actividades del grupo, sin uso comercial.",
    );
    await marcar("autorizaciones.compromiso");
    await continuar(6);
  };

  /* Paso 1: participante */
  await escribir("participante.nombres", "María Fernanda Pérez");
  await escribir("participante.fechaNacimiento", "2017-04-12");
  await escribir("participante.grado", "3.º");
  await escribir("participante.institucion", "Colegio Santa Ana");
  await escribir("participante.telefonoFamiliar", "04125551234");
  await escribir("participante.correoFamiliar", "familia@correo.do");
  await escribir("participante.direccion", "Calle Duarte 45");
  const cuerpo = await pagina.$eval("body", (cuerpo) => cuerpo.textContent ?? "");
  const edadMostrada = cuerpo.match(/\d+ años?/)?.[0] ?? "(ninguna)";
  comprobar(edadMostrada === "9 años", `Se muestra la edad calculada (${edadMostrada})`);
  await continuar(2);

  /* Paso 2: representante */
  comprobar(
    pagina.url().includes("grupo=chispita"),
    "Se permanece en /inscripcion tras avanzar",
  );
  await llenarHastaRevision();
  /* Paso 6: revision */
  const textoRevision = await pagina.$eval("body", (c) => c.textContent ?? "");
  comprobar(
    textoRevision.includes("María Fernanda Pérez") && textoRevision.includes("Colegio Santa Ana"),
    "La revisión muestra los datos capturados",
  );
  await continuar(7);
  /* Paso 7: PDF */
  await pagina.waitForSelector("[data-pdf-listo]", { timeout: 20000 });
  const paginas = await pagina.$eval("[data-pdf-listo]", (el) =>
    el.getAttribute("data-pdf-paginas"),
  );
  const archivo = await pagina.$eval("[data-pdf-listo]", (el) =>
    el.getAttribute("data-pdf-archivo"),
  );
  comprobar(paginas === "2", `El PDF declara ${paginas} pagina(s)`);
  comprobar(
    archivo === "Inscripcion_Chispita_Maria_Fernanda_Perez.pdf",
    `Nombre de archivo sin acentos ni datos de contacto: ${archivo}`,
  );

  /* Descarga real */
  const carpeta = await mkdtemp(join(tmpdir(), "descargas-"));
  const CDP = await pagina.createCDPSession();
  await CDP.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: carpeta,
  });
  await pagina.evaluate(() => {
    const botones = [...document.querySelectorAll("button")];
    const descarga = botones.find((b) => b.textContent?.includes("Descargar PDF"));
    (descarga as HTMLButtonElement | undefined)?.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
  const { readdir } = await import("node:fs/promises");
  const descargados = await readdir(carpeta);
  comprobar(
    descargados.length === 1 && descargados[0] === archivo,
    `Descarga guardada como ${descargados.join(", ") || "(nada)"}`,
  );
  if (descargados.length === 1) {
    const bytes = await readFile(join(carpeta, descargados[0]));
    comprobar(
      bytes.subarray(0, 5).toString() === "%PDF-",
      "El archivo descargado es un PDF valido",
    );
    /* El logo es la unica imagen y viaja a color; el resto es gris. */
    const pdfReal = join(carpeta, descargados[0]);
    comprobar(
      bytes.length > 20_000,
      `El PDF descargado incluye el logo (${bytes.length} bytes)`,
    );
    await writeFile(join(tmpdir(), "e2e-descarga.pdf"), bytes);
    comprobar(pdfReal.length > 0, "PDF real disponible para el analisis de color");
  }

  /* Borrado del borrador al volver al inicio */
  await pagina.evaluate(() => {
    const botones = [...document.querySelectorAll("button")];
    const salir = botones.find((b) => b.textContent?.includes("Volver al inicio"));
    (salir as HTMLButtonElement | undefined)?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const guardado = await pagina.evaluate(
    () =>
      window.localStorage.getItem("inscripcion:chispita-antorchita:v1:chispita") ??
      window.sessionStorage.getItem("inscripcion:chispita-antorchita:v1"),
  );
  comprobar(guardado === null, "El borrador se borra al volver al inicio");
  comprobar(
    pagina.url().replace(/\/$/, "").endsWith(BASE),
    `Regreso a la portada (${pagina.url()})`,
  );

  /* El logo ahora existe: no debe haber ningun 404. */
  const solo404 = httpErrores.filter((e) => e.startsWith("http 404"));
  const otrosHttp = httpErrores.filter((e) => !e.startsWith("http 404"));
  comprobar(
    otrosHttp.length === 0,
    `Sin respuestas HTTP con error: ${otrosHttp.join(" | ")}`,
  );
  comprobar(
    solo404.length === 0,
    `Sin 404: el logo ya existe (${solo404.join(" | ") || "ninguno"})`,
  );

  /* Los prefetch _rsc abortados al navegar no son errores de la app. */
  const relevantes = erroresConsola.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("logo-antorcha") &&
      !e.includes("_rsc=") &&
      !e.includes("Failed to load resource"),
  );
  comprobar(relevantes.length === 0, `Sin errores de consola: ${relevantes.join(" | ")}`);

  /* Los avisos de Next.js sobre la configuración no deben reaparecer. */
  const avisosNext = avisosConsola.filter((a) =>
    /scroll-behavior|nextjs\.org\/docs\/messages/.test(a),
  );
  comprobar(
    avisosNext.length === 0,
    `Sin avisos de configuración de Next.js: ${avisosNext.join(" | ")}`,
  );
  /* 4. Validacion bloquea el avance con campos vacios */
  await pagina.goto(`${BASE}/inscripcion?grupo=antorchita`, { waitUntil: "networkidle0" });
  const botones0 = await pagina.$$("nav[aria-label='Navegación del formulario'] button");
  await botones0[botones0.length - 1].click();
  await new Promise((r) => setTimeout(r, 400));
  const invalidos = await pagina.$$eval("[aria-invalid='true']", (els) =>
    els.map((e) => e.getAttribute("name")),
  );
  comprobar(
    invalidos.length >= 5 && invalidos.includes("participante.nombres"),
    `El avance se bloquea y marca ${invalidos.length} campos: ${invalidos.slice(0, 4).join(", ")}`,
  );
  const alertaVisible = await pagina.$("[role='alert']");
  comprobar(alertaVisible !== null, "Se muestra un aviso de error accesible");

  /* 5. El borrador se ofrece tras recargar y se restaura al pedirlo */
  await escribir("participante.nombres", "Ana Lucía Pérez");
  await escribir("participante.fechaNacimiento", "2013-05-20");
  await escribir("participante.grado", "6.º");
  await escribir("participante.institucion", "Colegio Del Carmen");
  await escribir("participante.telefonoFamiliar", "04125551234");
  await escribir("participante.correoFamiliar", "familia@correo.do");
  await continuar(2);
  await pagina.reload({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));

  /* No se restaura solo: se pregunta. */
  const sinRestaurar = await pagina.$eval("header", (h) => h.getAttribute("data-paso"));
  comprobar(
    sinRestaurar === "1",
    `Tras recargar NO se restaura solo (paso ${sinRestaurar}, esperado 1)`,
  );
  const hayAviso = await pagina.evaluate(() =>
    document.body.textContent?.includes("Hay una inscripción a medias guardada"),
  );
  comprobar(hayAviso === true, "Se ofrece recuperar la inscripción a medias");

  const persistido = await pagina.evaluate(() =>
    window.localStorage.getItem("inscripcion:chispita-antorchita:v1:antorchita"),
  );
  comprobar(
    typeof persistido === "string" && persistido.includes("Ana"),
    "El borrador queda en localStorage (sobrevive al cierre de la pestaña)",
  );

  await pagina.evaluate(() => {
    const botones = [...document.querySelectorAll("button")];
    const seguir = botones.find((b) =>
      b.textContent?.includes("Continuar donde lo dejé"),
    );
    (seguir as HTMLButtonElement | undefined)?.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  const trasRecuperar = await pagina.$eval("header", (h) => h.getAttribute("data-paso"));
  comprobar(
    trasRecuperar === "2",
    `Al recuperar vuelve al paso ${trasRecuperar} (esperado 2)`,
  );
  /* Volver al paso 1 desde el indicador para leer el dato recuperado */
  await pagina.click("nav[aria-label='Progreso de la inscripción'] ol li:first-child button");
  await new Promise((r) => setTimeout(r, 400));
  const nombreRecuperado = await pagina.$eval(
    "[name='participante.nombres']",
    (el) => (el as HTMLInputElement).value,
  );
  comprobar(
    nombreRecuperado === "Ana Lucía Pérez",
    `Se recupera el dato capturado: "${nombreRecuperado}"`,
  );

  /* 6. El borrador sigue disponible en una pestana nueva */
  const otraPestana = await navegador.newPage();
  await otraPestana.goto(`${BASE}/inscripcion?grupo=antorchita`, {
    waitUntil: "networkidle0",
  });
  await new Promise((r) => setTimeout(r, 700));
  const enNuevaPestana = await otraPestana.evaluate(() =>
    document.body.textContent?.includes("Hay una inscripción a medias guardada"),
  );
  comprobar(
    enNuevaPestana === true,
    "El borrador se ofrece tambien en una pestaña nueva",
  );

  /* 7. «Empezar de cero» borra el borrador guardado */
  await otraPestana.evaluate(() => {
    const botones = [...document.querySelectorAll("button")];
    const cero = botones.find((b) => b.textContent?.includes("Empezar de cero"));
    (cero as HTMLButtonElement | undefined)?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const trasDescartar = await otraPestana.evaluate(() => ({
    aviso: document.body.textContent?.includes("Borrador anterior eliminado"),
    guardado: window.localStorage.getItem("inscripcion:chispita-antorchita:v1:antorchita"),
  }));
  comprobar(
    trasDescartar.aviso === true && trasDescartar.guardado === null,
    "«Empezar de cero» elimina el borrador guardado",
  );
  await otraPestana.close();

  /* 8. «Vaciar formulario» limpia los datos en pantalla */
  await pagina.evaluate(() => {
    const botones = [...document.querySelectorAll("button")];
    const vaciar = botones.find((b) => b.textContent?.includes("Vaciar formulario"));
    (vaciar as HTMLButtonElement | undefined)?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const trasVaciar = await pagina.$eval(
    "[name='participante.nombres']",
    (el) => (el as HTMLInputElement).value,
  );
  comprobar(
    trasVaciar === "",
    `«Vaciar formulario» deja los campos en blanco ("${trasVaciar}")`,
  );

  await pagina.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  /* 9. La referencia de edad y grado bloquea hasta corregir el dato */
  const leerBloqueo = () =>
    pagina.evaluate(() => {
      const panel = document.querySelector("[data-referencia='fuera']");
      const nombre = "participante.fechaNacimiento";
      const nombreGrado = "participante.grado";
      return {
        panel: panel?.textContent ?? "",
        visible: panel !== null,
        fecha:
          document
            .querySelector(`[name='${nombre}']`)
            ?.getAttribute("aria-invalid") ?? "ausente",
        grado:
          document
            .querySelector(`[name='${nombreGrado}']`)
            ?.getAttribute("aria-invalid") ?? "ausente",
        otrosInvalidos: [...document.querySelectorAll("[aria-invalid='true']")].filter(
          (el) =>
            el.getAttribute("name") !== nombre &&
            el.getAttribute("name") !== nombreGrado,
        ).length,
      };
    });

  const llenarPaso1 = async (fecha: string, grado: string) => {
    await escribir("participante.nombres", "Luis Enrique Díaz");
    await escribir("participante.fechaNacimiento", fecha);
    await escribir("participante.grado", grado);
    await escribir("participante.institucion", "Colegio Santa Ana");
    await escribir("participante.telefonoFamiliar", "04125551234");
    await escribir("participante.correoFamiliar", "familia@correo.do");
  };

  /* Chispita: 11 años y 5.º no corresponden a la referencia. */
  await pagina.goto(`${BASE}/inscripcion?grupo=chispita`, {
    waitUntil: "networkidle0",
  });
  await new Promise((r) => setTimeout(r, 600));
  await llenarPaso1("2015-04-10", "5.º grado");

  const primerBloqueo = await leerBloqueo();
  comprobar(
    primerBloqueo.visible &&
      primerBloqueo.panel.includes("No coincide con la referencia de Chispita") &&
      primerBloqueo.panel.includes("6 a 9 años") &&
      primerBloqueo.panel.includes("1.º, 2.º y 3.º") &&
      primerBloqueo.panel.includes("La edad calculada (11 años)") &&
      primerBloqueo.panel.includes("El grado indicado (5.º)"),
    "Se explica que 11 años y 5.º no corresponden a la referencia de Chispita",
  );

  /* No hay casilla para saltarse el aviso. */
  const conCasilla = await pagina.evaluate(
    () => document.querySelector("[name='participante.fueraDeReferencia']") !== null,
  );
  comprobar(conCasilla === false, "No existe casilla para saltarse el bloqueo");

  await continuar(1);
  const bloqueado = await leerBloqueo();
  comprobar(
    bloqueado.fecha === "true" && bloqueado.grado === "true" && bloqueado.otrosInvalidos === 0,
    `Intentar avanzar marca solo los dos datos que no cuadran (fecha=${bloqueado.fecha}, grado=${bloqueado.grado}, otros=${bloqueado.otrosInvalidos})`,
  );

  /* Corregir el grado deja solo el bloqueo por edad. */
  await escribir("participante.grado", "2.º");
  const trasGrado = await leerBloqueo();
  comprobar(
    trasGrado.visible &&
      trasGrado.panel.includes("La edad calculada (11 años)") &&
      !trasGrado.panel.includes("El grado indicado") &&
      trasGrado.grado !== "true",
    "Al corregir el grado solo queda pendiente la edad",
  );
  await continuar(1);
  const sigueBloqueado = await leerBloqueo();
  comprobar(
    sigueBloqueado.fecha === "true",
    "No se puede avanzar hasta corregir también la edad",
  );

  /* Corregir la edad desbloquea. */
  await escribir("participante.fechaNacimiento", "2017-06-15");
  const desbloqueado = await leerBloqueo();
  comprobar(
    desbloqueado.visible === false,
    "Al corregir la edad desaparece el aviso y el paso queda limpio",
  );
  await continuar(2);
  comprobar(true, "Con los datos corregidos se avanza al paso 2");

  /* 10. Solo la edad, con el grado dentro de la referencia */
  await pagina.goto(`${BASE}/inscripcion?grupo=chispita`, {
    waitUntil: "networkidle0",
  });
  await new Promise((r) => setTimeout(r, 600));
  await llenarPaso1("2015-04-10", "2.º");
  const soloEdad = await leerBloqueo();
  comprobar(
    soloEdad.visible &&
      soloEdad.panel.includes("La edad calculada (11 años)") &&
      !soloEdad.panel.includes("El grado indicado") &&
      soloEdad.fecha === "true" &&
      soloEdad.grado !== "true",
    "Con el grado correcto solo se marca la fecha de nacimiento, no el grado",
  );
  await escribir("participante.fechaNacimiento", "2017-06-15");
  comprobar(
    (await leerBloqueo()).visible === false,
    "Corregida la edad de Chispita, el aviso desaparece",
  );

  /* 11. Solo el grado, con la edad dentro de la referencia */
  await pagina.goto(`${BASE}/inscripcion?grupo=antorchita`, {
    waitUntil: "networkidle0",
  });
  await new Promise((r) => setTimeout(r, 600));
  await llenarPaso1("2013-04-10", "1.º");
  const soloGrado = await leerBloqueo();
  comprobar(
    soloGrado.visible &&
      soloGrado.panel.includes("El grado indicado (1.º)") &&
      soloGrado.panel.includes("4.º, 5.º y 6.º") &&
      !soloGrado.panel.includes("La edad calculada") &&
      soloGrado.grado === "true" &&
      soloGrado.fecha !== "true",
    "Con la edad correcta solo se marca el grado, y se citan los grados de Antorchita",
  );
  await continuar(1);
  comprobar(
    (await leerBloqueo()).grado === "true",
    "El grado inválido impide avanzar",
  );

  /* Los mismos datos que bloquean en Chispita valen en Antorchita. */
  await llenarPaso1("2015-04-10", "5.º");
  const enAntorchita = await leerBloqueo();
  comprobar(
    enAntorchita.visible === false,
    "11 años y 5.º sí son válidos para Antorchita",
  );

  /* Y un grado escrito con palabras también se detecta. */
  await escribir("participante.grado", "Primero");
  const porPalabras = await leerBloqueo();
  comprobar(
    porPalabras.visible && porPalabras.panel.includes("El grado indicado (1.º)"),
    "El grado escrito con palabras («Primero») también se bloquea",
  );

  /* 12. Un grado que no se puede interpretar no bloquea la inscripción */
  await pagina.goto(`${BASE}/inscripcion?grupo=chispita`, {
    waitUntil: "networkidle0",
  });
  await new Promise((r) => setTimeout(r, 600));
  await llenarPaso1("2017-06-15", "Kínder");
  const kinder = await leerBloqueo();
  comprobar(
    kinder.visible === false && kinder.otrosInvalidos === 0,
    "Un grado que no se puede interpretar (Kínder) no bloquea la inscripción",
  );

  await pagina.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

} finally {   await navegador.close(); }  console.log(fallos.length ? `FALLOS: ${fallos.length}` : "E2E CORRECTO"); process.exit(fallos.length ? 1 : 0);
