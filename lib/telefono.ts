/**
 * Teléfonos de Venezuela, según lo indicó la coordinación: siempre cuatro
 * dígitos de prefijo, un guion y siete dígitos: `0000-0000000`.
 *
 * Prefijos disponibles:
 *   celulares  0412, 0414, 0416, 0422, 0424, 0426
 *   fijo       0212
 */

export const PREFIJOS_VE = [
  "0412",
  "0414",
  "0416",
  "0422",
  "0424",
  "0426",
  "0212",
] as const;

/** La plantilla que se muestra como guía en la planilla y en el formulario. */
export const MASCARA_TELEFONO = "0000-0000000";

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Aplica la plantilla `0000-0000000` en vivo: cuatro dígitos, guion y el
 * resto. Se descarta lo que pase de once dígitos para que el campo no pueda
 * guardar un número más largo.
 */
export function formatearTelefono(valor: string): string {
  const digitos = soloDigitos(valor).slice(0, 11);
  if (digitos.length <= 4) return digitos;
  return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
}

/** Cumple la plantilla y empieza con uno de los prefijos disponibles. */
export function telefonoValido(valor: string): boolean {
  const digitos = soloDigitos(valor);
  if (digitos.length !== 11) return false;
  return PREFIJOS_VE.includes(digitos.slice(0, 4) as (typeof PREFIJOS_VE)[number]);
}

/**
 * Para mostrar en pantalla, PDF y Excel: si el número cumple la plantilla se
 * imprime con guion; si no, se deja tal cual (números viejos u otras formas).
 */
export function mostrarTelefono(valor: string): string {
  return telefonoValido(valor) ? formatearTelefono(valor) : valor.trim();
}

export const ERROR_TELEFONO =
  `Usa 11 dígitos: ${MASCARA_TELEFONO}. Prefijos: celular 0412/0416/0414/0424/0426/0422 · casa 0212`;

export const HINT_TELEFONO =
  `${MASCARA_TELEFONO} · celular 0412, 0416, 0414, 0424, 0426, 0422 · casa 0212`;