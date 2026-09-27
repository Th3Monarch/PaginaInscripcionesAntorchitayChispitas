/**
 * Comprueba la puerta del panel de fichas.
 *
 * Necesita un servidor arrancado CON PANEL_CLAVE:
 *   $env:PANEL_CLAVE="clave-de-prueba"; npm run build; npm start -- -p 3100
 *   npm run e2e:acceso
 *
 * Lo que se verifica es lo que importa: que sin cookie no sale nada, que una
 * clave inventada no entra, y que la cookie es la unica via de acceso.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CLAVE = process.env.PANEL_CLAVE ?? "";

const fallos: string[] = [];
function comprobar(ok: boolean, mensaje: string) {
  console.log(`${ok ? "[OK]" : "[FALLA]"} ${mensaje}`);
  if (!ok) fallos.push(mensaje);
}

async function pedir(metodo: string, ruta: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: cuerpo ? { "content-type": "application/json" } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return {
    estado: respuesta.status,
    cookie: respuesta.headers.get("set-cookie") ?? "",
    cuerpo: await respuesta.json().catch(() => null),
  };
}

if (!CLAVE) {
  console.error(
    "Falta PANEL_CLAVE en el entorno de esta prueba. Arranca el servidor con la misma variable.",
  );
  process.exit(1);
}

/* 1. Sin cookie, la lista no sale. Este es el test que mas importa. */
const sinSesion = await pedir("GET", "/api/inscripciones");
comprobar(
  sinSesion.estado === 401,
  `Sin sesion la API responde 401, no la lista (HTTP ${sinSesion.estado})`,
);
const cuerpoAnonimo = JSON.stringify(sinSesion.cuerpo ?? {});
comprobar(
  !cuerpoAnonimo.includes("registros"),
  "La respuesta anonima no incluye el campo registros",
);

const descargaSinSesion = await pedir("GET", "/api/inscripciones?formato=xlsx");
comprobar(
  descargaSinSesion.estado === 401,
  `Tampoco se puede descargar el Excel sin sesion (HTTP ${descargaSinSesion.estado})`,
);

/* 2. Una clave incorrecta no abre nada. */
const mala = await pedir("POST", "/api/acceso", {
  clave: `${CLAVE}-equivocada`,
});
comprobar(mala.estado === 401, `Clave incorrecta rechazada (HTTP ${mala.estado})`);
comprobar(
  !mala.cookie.includes("panel_antorcha"),
  "Clave incorrecta no deja ninguna cookie",
);

/* 3. La clave buena abre, y la cookie es httpOnly: el JavaScript no la ve. */
const buena = await pedir("POST", "/api/acceso", { clave: CLAVE });
comprobar(buena.estado === 200, `Clave correcta aceptada (HTTP ${buena.estado})`);
comprobar(
  buena.cookie.includes("panel_antorcha") && buena.cookie.includes("HttpOnly"),
  "La cookie de sesion es httpOnly",
);
comprobar(
  /samesite=strict/i.test(buena.cookie),
  "La cookie de sesion es SameSite=Strict",
);

const valor = buena.cookie.match(/panel_antorcha=([^;]+)/)?.[1];
comprobar(Boolean(valor), "La cookie lleva un valor firmado");

/* 4. Con la cookie, la lista responde. Sin Supabase dira que no hay registro,
 *    que tambien es una respuesta válida de la API. */
const conSesion = await fetch(`${BASE}/api/inscripciones`, {
  headers: valor ? { cookie: `panel_antorcha=${valor}` } : undefined,
});
comprobar(
  conSesion.status === 200 || conSesion.status === 502,
  `Con la cookie la API responde (HTTP ${conSesion.status})`,
);

const excelConSesion = await fetch(`${BASE}/api/inscripciones?formato=xlsx`, {
  headers: valor ? { cookie: `panel_antorcha=${valor}` } : undefined,
});
comprobar(
  excelConSesion.status === 200 || excelConSesion.status === 502,
  `Con la cookie se puede pedir el Excel (HTTP ${excelConSesion.status})`,
);

/* 5. Una cookie fabricada a mano no vale. */
const falsificada = await fetch(`${BASE}/api/inscripciones`, {
  headers: { cookie: "panel_antorcha=9999999999999.abc123" },
});
comprobar(
  falsificada.status === 401,
  `Una cookie inventada no da acceso (HTTP ${falsificada.status})`,
);

/* 6. Salir cierra la sesion. */
const salida = await fetch(`${BASE}/api/acceso`, { method: "DELETE", headers: valor ? { cookie: `panel_antorcha=${valor}` } : undefined });
comprobar(salida.status === 200, `Se puede cerrar la sesion (HTTP ${salida.status})`);

console.log(
  fallos.length === 0 ? "ACCESO CORRECTO" : `ACCESO CON ${fallos.length} FALLA(S)`,
);
process.exit(fallos.length === 0 ? 0 : 1);
