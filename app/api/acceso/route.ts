import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CLAVE_VIGENTE,
  claveCorrecta,
  COOKIE_PANEL,
  crearToken,
  opcionesCookie,
} from "@/lib/panel";

/** POST: comprobar la clave y abrir la sesion del panel. */
export async function POST(request: Request) {
  if (!CLAVE_VIGENTE) {
    return NextResponse.json(
      { error: "El panel no tiene clave configurada." },
      { status: 503 },
    );
  }

  let intento = "";
  try {
    const cuerpo = (await request.json()) as { clave?: unknown };
    if (typeof cuerpo.clave === "string") intento = cuerpo.clave;
  } catch {
    return NextResponse.json({ error: "Peticion invalida" }, { status: 400 });
  }

  if (!claveCorrecta(intento)) {
    /* Retraso al fallar: frena el intento automatizado sin molestar a una
     * persona que se equivoca una vez. */
    await new Promise((resolver) => setTimeout(resolver, 600));
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  const almacen = await cookies();
  almacen.set(COOKIE_PANEL, crearToken(), opcionesCookie);

  return NextResponse.json({ acceso: true });
}

/** DELETE: cerrar la sesion. */
export async function DELETE() {
  const almacen = await cookies();
  almacen.delete(COOKIE_PANEL);
  return NextResponse.json({ acceso: false });
}
