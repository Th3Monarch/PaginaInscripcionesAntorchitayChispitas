import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Acceso al panel de fichas.
 *
 * La clave NO se comprueba en el navegador: si el JavaScript del panel la
 * validara, cualquiera la leeria en la consola del navegador y estariamos
 * proteger una puerta con la llave colgada al lado. Aqui se compara en el
 * servidor, en tiempo constante, y lo que se guarda en el navegador es una
 * cookie firmada que el cliente no puede fabricar.
 *
 * Sin PANEL_CLAVE el panel queda cerrado: no hay clave por defecto, porque
 * una clave escrita en el repositorio es una clave publicada.
 */

const COOKIE = "panel_antorcha";

/** Vigencia interna del token (cota de seguridad), no la de la cookie: la
 * sesion muere con la pestana y, en el panel, cada visita empieza borrando la
 * sesion anterior. */
const DIAS_VIGENCIA = 7;

export const CLAVE_VIGENTE = (() => {
  const clave = process.env.PANEL_CLAVE;
  return typeof clave === "string" && clave.length > 0 ? clave : null;
})();

/**
 * Que el fallo y el acierto tarden lo mismo.
 *
 * Se comparan los SHA-256 y no las cadenas: asi los dos buffers miden lo mismo
 * siempre y `timingSafeEqual` no se queda sin comparar nada cuando las
 * longitudes difieren. Sin este hash, un «return false» rapido para longitudes
 * distintas ya delata cuanto mide la clave.
 */
function iguales(a: string, b: string): boolean {
  const bufferA = createHash("sha256").update(a, "utf8").digest();
  const bufferB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(bufferA, bufferB);
}

function firmar(contenido: string): string {
  return createHmac("sha256", CLAVE_VIGENTE!).update(contenido).digest("hex");
}

/** Token: «caduca» + firma. Sin base de datos ni sesiones guardadas. */
function crearToken(): string {
  const caduca = Date.now() + DIAS_VIGENCIA * 24 * 60 * 60 * 1000;
  return `${caduca}.${firmar(`panel|${caduca}`)}`;
}

export function tokenValido(token: string | undefined): boolean {
  if (!CLAVE_VIGENTE || !token) return false;

  const [caduca, firma] = token.split(".");
  if (!caduca || !firma) return false;

  const numero = Number(caduca);
  if (!Number.isFinite(numero) || numero < Date.now()) return false;

  return iguales(firma, firmar(`panel|${caduca}`));
}

export function claveCorrecta(intento: string): boolean {
  if (!CLAVE_VIGENTE) return false;
  return iguales(intento, CLAVE_VIGENTE);
}

export const opcionesCookie = {
  httpOnly: true,
  sameSite: "strict",
  path: "/",
  /* Cookie de sesion, sin maxAge: no sobrevive al cierre de la pestana. Que no
   * haya que pedir la clave dentro de la misma visita, no entre visitas. */
  secure: process.env.NODE_ENV === "production",
} as const;

export { COOKIE as COOKIE_PANEL, crearToken };
