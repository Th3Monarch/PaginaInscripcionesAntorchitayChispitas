import { registroDesde, type Registro } from "./registro";
import type { EnrollmentValues } from "./schemas";
import type { GroupId } from "./config";

/**
 * Id de este envio. Vive en sessionStorage a proposito: sobrevive a que la
 * persona retroceda de paso y vuelva a generar el PDF (y asi no sale fila
 * repetida), pero se pierde al cerrar la pestaña, que es justo cuando empieza
 * una inscripcion nueva.
 */
function claveEnvio(grupo: GroupId): string {
  return `envio:${grupo}`;
}

export function idEnvio(grupo: GroupId): string {
  if (typeof window === "undefined") return "";

  const clave = claveEnvio(grupo);
  const guardado = window.sessionStorage.getItem(clave);
  if (guardado) return guardado;

  const nuevo = crypto.randomUUID();
  window.sessionStorage.setItem(clave, nuevo);
  return nuevo;
}

export function olvidarEnvio(grupo: GroupId): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(claveEnvio(grupo));
}

export type ResultadoEnvio =
  | { estado: "guardado" }
  | { estado: "no-configurado" }
  | { estado: "rechazado"; mensaje: string }
  | { estado: "fallo"; mensaje: string };

/**
 * Envia el aviso de que hay ficha nueva. Nunca lanza: si falla, la familia ya
 * tiene su PDF y no hay que asustarla con un error. El detalle se queda en la
 * consola, que es donde lo mira quien mantiene la aplicacion.
 */
export async function registrarInscripcion(
  valores: EnrollmentValues,
  envio: string,
): Promise<ResultadoEnvio> {
  const cuerpo: Registro = registroDesde(valores, envio);

  try {
    const respuesta = await fetch("/api/inscripciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => null);
      console.error(
        `[registro] la API respondio ${respuesta.status}`,
        detalle?.error,
      );
      return {
        estado: "fallo",
        mensaje:
          "No pudimos avisar a la coordinación, pero tu ficha está lista. Entrégala firmada y avisa a la coordinación.",
      };
    }

    const resultado = (await respuesta.json()) as {
      guardado?: boolean;
      motivo?: string;
    };

    if (resultado.guardado) return { estado: "guardado" };
    if (resultado.motivo === "sin configurar") {
      return { estado: "no-configurado" };
    }
    return { estado: "guardado" };
  } catch (fallo) {
    console.error("[registro] fallo de red al avisar", fallo);
    return {
      estado: "fallo",
      mensaje:
        "No pudimos avisar a la coordinación, pero tu ficha está lista. Entrégala firmada y avisa a la coordinación.",
    };
  }
}
