import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  libroExcel,
  registroSchema,
  TABLA,
  type FilaRegistro,
} from "@/lib/registro";
import { CLAVE_VIGENTE, COOKIE_PANEL, tokenValido } from "@/lib/panel";
import { supabaseAdmin } from "@/lib/supabase";

/** exceljs necesita Node: en el edge no hay Buffer. */
export const runtime = "nodejs";
/** La lista cambia con cada ficha nueva; nunca se cachea. */
export const dynamic = "force-dynamic";

const LIMITE_FILAS = 2000;

async function listar(): Promise<FilaRegistro[]> {
  const supabase = supabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(TABLA)
    .select("envio,recibido,grupo,participante,contacto,detalle")
    .order("recibido", { ascending: false })
    .limit(LIMITE_FILAS);

  if (error) throw new Error(error.message);
  return (data ?? []) as FilaRegistro[];
}

async function adjuntoExcel(filas: FilaRegistro[]): Promise<NextResponse> {
  const bytes = await libroExcel(filas);

  /* ArrayBuffer plano: es lo que acepta BodyInit sin pelearse con el tipo. */
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);

  return new NextResponse(buffer, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="inscripciones-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}

/**
 * POST: lo llama la pagina publica al terminar la ficha. Valida con el mismo
 * esquema Zod que el resto de la aplicacion, pero aqui no se confia en nada:
 * el endpoint es publico y cualquiera puede llamar a mano.
 */
export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo no valido" }, { status: 400 });
  }

  const parsed = registroSchema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", detalle: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  if (!supabaseAdmin()) {
    // Sin configuracion la ficha sigue siendo valida; solo no queda anotada.
    return NextResponse.json({ guardado: false, motivo: "sin configurar" });
  }

  const { envio, ...campos } = parsed.data;
  const { error } = await supabaseAdmin()!
    .from(TABLA)
    .upsert({ envio, ...campos }, { onConflict: "envio" });

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 502 });
  }

  return NextResponse.json({ guardado: true }, { status: 201 });
}

/**
 * GET: la lista. Sin sesion de panel no se devuelve nada, ni la tabla ni el
 * Excel. `?formato=xlsx` descarga el archivo. Es la unica lectura de datos de
 * menores que tiene el sitio, asi que va cerrada.
 *
 * Si no hay PANEL_CLAVE el panel NO se abre: se queda cerrado. Un despliegue
 * sin la clave debe mostrar una pagina vacia, nunca la lista.
 */
export async function GET(request: Request) {
  if (!CLAVE_VIGENTE) {
    return NextResponse.json(
      { error: "El panel no tiene clave configurada" },
      { status: 503 },
    );
  }

  const almacen = await cookies();
  if (!tokenValido(almacen.get(COOKIE_PANEL)?.value)) {
    return NextResponse.json({ error: "Sin acceso al panel" }, { status: 401 });
  }

  const configurado = supabaseAdmin() !== null;

  if (!configurado) {
    return NextResponse.json({ configurado: false, registros: [] });
  }

  let filas: FilaRegistro[];
  try {
    filas = await listar();
  } catch {
    return NextResponse.json(
      { configurado: true, error: "No se pudo leer la lista" },
      { status: 502 },
    );
  }

  const formato = new URL(request.url).searchParams.get("formato");
  if (formato === "xlsx") return adjuntoExcel(filas);

  return NextResponse.json(
    { configurado: true, registros: filas },
    { headers: { "cache-control": "no-store" } },
  );
}
