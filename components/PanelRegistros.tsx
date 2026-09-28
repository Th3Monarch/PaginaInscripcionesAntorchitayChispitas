"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/ui/Campos";
import { Boton, Seccion } from "@/components/ui/Layout";
import { CampoClave } from "@/components/ui/Campos";
import { GRUPOS, isGroupId } from "@/lib/config";
import {
  BLOQUES_INSCRIPCIONES,
  COLUMNAS_INSCRIPCIONES,
  filaPlana,
  type FilaRegistro,
} from "@/lib/registro";

type Respuesta = {
  configurado?: boolean;
  registros?: FilaRegistro[];
  error?: string;
  /** Sin registros ni error: el servidor no nos deja pasar. */
  cerrado?: boolean;
};

/** Cada cuanto se mira si hay algo nuevo. Suficiente para una parroquia. */
const REFRESCO_MS = 15000;

export function PanelRegistros() {
  const [clave, setClave] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [dentro, setDentro] = useState(false);
  const [registros, setRegistros] = useState<FilaRegistro[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<string | null>(null);
  const [aQuitar, setAQuitar] = useState<string | null>(null);
  const [quitando, setQuitando] = useState(false);
  const descargando = useRef(false);
  const aQuitarFila = aQuitar
    ? (registros.find((f) => f.envio === aQuitar) ?? null)
    : null;

  const consultar = useCallback(async (): Promise<Respuesta> => {
    const respuesta = await fetch("/api/inscripciones", {
      cache: "no-store",
    });

    if (respuesta.status === 401 || respuesta.status === 503) {
      return { cerrado: true };
    }
    return (await respuesta.json()) as Respuesta;
  }, []);

  /* Aplicar el resultado y pintar la pantalla va separado de la consulta: asi
   * el efecto se limita a suscribirse al servidor y el setState ocurre cuando
   * llega la respuesta, no de forma sincrona al montar. */
  const aplicar = useCallback((datos: Respuesta) => {
    if (datos.cerrado) {
      setDentro(false);
      return;
    }
    setDentro(true);
    setConfigurado(datos.configurado ?? true);
    setRegistros(datos.registros ?? []);
    setFallo(datos.error ?? null);
    setActualizado(new Date().toLocaleTimeString("es-DO"));
    setCargando(false);
  }, []);

  const cargar = useCallback(async () => {
    aplicar(await consultar());
  }, [aplicar, consultar]);

  useEffect(() => {
    let vigente = true;

    /* Cada visita al panel empieza cerrado: se borra la sesion anterior antes
     * de mirar. Asi salir del apartado y volver siempre pide la clave otra
     * vez; la cookie de la visita pasada no vale para entrar. */
    const empezarCerrado = async () => {
      await fetch("/api/acceso", { method: "DELETE" }).catch(() => null);
      if (!vigente) return;
      aplicar(await consultar());
    };

    void empezarCerrado();

    const temporizador = window.setInterval(() => {
      void consultar().then((datos) => {
        if (vigente) aplicar(datos);
      });
    }, REFRESCO_MS);

    return () => {
      vigente = false;
      window.clearInterval(temporizador);
    };
  }, [aplicar, consultar]);

  /* El diálogo de confirmar se cierra con Escape y empieza enfocado en
   * comentar, para que el "Sí, quitar" no se dispare de un Enter por error. */
  useEffect(() => {
    if (!aQuitar) return;
    const alTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAQuitar(null);
    };
    window.addEventListener("keydown", alTecla);
    document.querySelector<HTMLButtonElement>("[data-cancelar-quitar]")?.focus();
    return () => window.removeEventListener("keydown", alTecla);
  }, [aQuitar]);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setErrorClave(null);

    try {
      const respuesta = await fetch("/api/acceso", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clave }),
      });

      if (respuesta.status === 503) {
        setErrorClave(
          "El panel no tiene clave configurada en el servidor. Añade PANEL_CLAVE.",
        );
        return;
      }
      if (!respuesta.ok) {
        setErrorClave("Clave incorrecta.");
        return;
      }

      setClave("");
      setDentro(true);
      await cargar();
    } catch {
      setErrorClave("No se pudo contactar con el servidor.");
    } finally {
      setEntrando(false);
    }
  }

  async function salir() {
    await fetch("/api/acceso", { method: "DELETE" }).catch(() => null);
    setRegistros([]);
    setDentro(false);
    setFallo(null);
  }

  async function borrar(envio: string) {
    if (quitando) return;
    setQuitando(true);
    try {
      const respuesta = await fetch(
        `/api/inscripciones?envio=${encodeURIComponent(envio)}`,
        { method: "DELETE", cache: "no-store" },
      );
      if (respuesta.status === 401) {
        setDentro(false);
        return;
      }
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      setRegistros((actual) => actual.filter((f) => f.envio !== envio));
      setFallo(null);
      setActualizado(new Date().toLocaleTimeString("es-DO"));
    } catch {
      setFallo("No se pudo quitar la ficha.");
    } finally {
      setQuitando(false);
      setAQuitar(null);
    }
  }

  async function descargar() {
    if (descargando.current) return;
    descargando.current = true;
    try {
      const respuesta = await fetch("/api/inscripciones?formato=xlsx", {
        cache: "no-store",
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));

      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `inscripciones-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFallo("No se pudo generar el archivo de Excel.");
    } finally {
      descargando.current = false;
    }
  }

  return (
    <div className="space-y-5">
      {dentro ? (
        <Seccion
          titulo="Fichas nuevas"
          descripcion="Aquí quedan anotados las fichas y todos sus datos, igual que los exporta el Excel."
          acciones={
            <div className="flex gap-2">
              <Boton
                type="button"
                variante="secundario"
                onClick={() => void cargar()}
                disabled={cargando}
              >
                Actualizar
              </Boton>
              <Boton type="button" onClick={() => void descargar()}>
                Descargar Excel
              </Boton>
              <Boton type="button" variante="fantasma" onClick={() => void salir()}>
                Salir
              </Boton>
            </div>
          }
        >
          {!configurado ? (
            <Aviso tono="alerta">
              No hay registro configurado. Faltan <code>SUPABASE_URL</code> y{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> en el entorno del
              servidor. Hasta que estén, las fichas se siguen generando pero no
              se anotan aquí.
            </Aviso>
          ) : null}

          {fallo ? <Aviso tono="alerta">{fallo}</Aviso> : null}

          {!configurado ? null : (
            <>
              <p className="text-sm text-muted" role="status">
                {registros.length === 0
                  ? "Todavía no hay fichas registradas."
                  : `${registros.length} ${registros.length === 1 ? "ficha" : "fichas"}.`}{" "}
                {actualizado ? `Actualizado a las ${actualizado}.` : null}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th
                        colSpan={2}
                        rowSpan={2}
                        className="border-r border-line px-2 py-2 text-left font-semibold text-ink"
                      >
                        Recibido / Grupo
                      </th>
                      {BLOQUES_INSCRIPCIONES.map((bloque) => (
                        <th
                          key={bloque.nombre}
                          colSpan={bloque.hasta - bloque.desde + 1}
                          className="border-r border-line px-2 py-1.5 text-center text-xs font-semibold text-muted"
                        >
                          {bloque.nombre}
                        </th>
                      ))}
                      <th
                        rowSpan={2}
                        className="border-l border-line px-2 py-1.5 text-center text-xs font-semibold text-muted"
                      >
                        Acción
                      </th>
                    </tr>
                    <tr className="border-b border-line">
                      {COLUMNAS_INSCRIPCIONES.slice(2).map((columna) => (
                        <th
                          key={columna.key}
                          className="border-r border-line px-2 py-1.5 text-left font-semibold text-ink"
                        >
                          {columna.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((fila) => {
                      const plano = filaPlana(fila);
                      return (
                        <tr key={fila.envio} className="border-b border-line/60">
                          <td className="px-2 py-2 whitespace-nowrap text-muted">
                            {plano.recibido}
                          </td>
                          <td className="border-r border-line/60 px-2 py-2 text-ink">
                            {isGroupId(fila.grupo)
                              ? GRUPOS[fila.grupo].nombre
                              : fila.grupo}
                          </td>
                          {COLUMNAS_INSCRIPCIONES.slice(2).map((columna) => (
                            <td
                              key={columna.key}
                              className="border-r border-line/60 px-2 py-2 text-ink"
                            >
                              {plano[columna.key]}
                            </td>
                          ))}
                          <td className="border-l border-line/60 px-2 py-2">
                            <button
                              type="button"
                              aria-label={`Quitar la ficha de ${fila.participante}`}
                              className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-line-strong px-3 text-xs font-semibold text-ink transition-colors hover:border-[#7d1d12] hover:text-[#7d1d12] disabled:cursor-not-allowed disabled:opacity-55"
                              onClick={() => setAQuitar(fila.envio)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Seccion>
      ) : (
        <Seccion
          titulo="Acceso a la lista"
          descripcion="Esta lista contiene datos de menores. Es para la coordinación del grupo."
        >
          <form onSubmit={entrar} className="max-w-sm space-y-4">
            <CampoClave
              label="Clave"
              id="clave-panel"
              value={clave}
              onChange={setClave}
              error={errorClave ?? undefined}
              deshabilitado={entrando}
            />
            <Boton type="submit" disabled={entrando || clave.length === 0}>
              {entrando ? "Comprobando…" : "Entrar"}
            </Boton>
          </form>
        </Seccion>
      )}

      {aQuitar ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quitar-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Cancelar"
            className="absolute inset-0 cursor-default bg-black/40"
            onClick={() => setAQuitar(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-lg">
            <h3 id="quitar-titulo" className="text-base font-semibold text-ink">
              ¿Quitar la ficha de{" "}
              {aQuitarFila?.participante ?? "esta ficha"}?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Desaparece de la lista y de la base de datos. No se puede
              recuperar desde el panel.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                data-cancelar-quitar
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line-strong px-4 text-sm font-semibold text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-55"
                disabled={quitando}
                onClick={() => setAQuitar(null)}
              >
                No
              </button>
              <button
                type="button"
                data-confirmar-quitar
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-[#7d1d12] bg-[#7d1d12] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#a32819] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={quitando}
                onClick={() => void borrar(aQuitar)}
              >
                {quitando ? "Quitando…" : "Sí, quitar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
