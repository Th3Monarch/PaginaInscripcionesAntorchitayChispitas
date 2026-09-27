"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/ui/Campos";
import { Boton, Seccion } from "@/components/ui/Layout";
import { GRUPOS, isGroupId } from "@/lib/config";
import type { FilaRegistro } from "@/lib/registro";

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
  const descargando = useRef(false);

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
    const pedir = () => {
      void consultar().then((datos) => {
        if (vigente) aplicar(datos);
      });
    };

    pedir();
    const temporizador = window.setInterval(pedir, REFRESCO_MS);
    return () => {
      vigente = false;
      window.clearInterval(temporizador);
    };
  }, [aplicar, consultar]);

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
          descripcion="Un aviso por cada ficha generada. Los datos detallados viajan en el papel que entrega la familia."
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
                    <tr className="border-b border-line text-left">
                      <th className="px-2 py-2 font-semibold text-ink">
                        Recibido
                      </th>
                      <th className="px-2 py-2 font-semibold text-ink">
                        Grupo
                      </th>
                      <th className="px-2 py-2 font-semibold text-ink">
                        Participante
                      </th>
                      <th className="px-2 py-2 font-semibold text-ink">
                        Contacto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((fila) => (
                      <tr key={fila.envio} className="border-b border-line/60">
                        <td className="px-2 py-2 whitespace-nowrap text-muted">
                          {new Date(fila.recibido).toLocaleString("es-DO")}
                        </td>
                        <td className="px-2 py-2 text-ink">
                          {isGroupId(fila.grupo)
                            ? GRUPOS[fila.grupo].nombre
                            : fila.grupo}
                        </td>
                        <td className="px-2 py-2 text-ink">
                          {fila.participante}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-muted">
                          {fila.contacto || "—"}
                        </td>
                      </tr>
                    ))}
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
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="clave-panel"
                className="text-sm font-semibold text-ink-soft"
              >
                Clave
              </label>
              <input
                id="clave-panel"
                type="password"
                value={clave}
                autoComplete="current-password"
                onChange={(e) => setClave(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink shadow-xs"
              />
              {errorClave ? (
                <p role="alert" className="text-xs font-medium text-[#a3271b]">
                  {errorClave}
                </p>
              ) : null}
            </div>
            <Boton type="submit" disabled={entrando || clave.length === 0}>
              {entrando ? "Comprobando…" : "Entrar"}
            </Boton>
          </form>
        </Seccion>
      )}
    </div>
  );
}
