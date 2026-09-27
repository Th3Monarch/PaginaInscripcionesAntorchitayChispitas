"use client";

import { APP, isGroupId, type GroupId } from "./config";
import type { EnrollmentValues } from "./schemas";

export type Borrador = {
  grupo: GroupId;
  paso: number;
  valores: EnrollmentValues;
  guardadoEn: string;
};

/**
 * El borrador vive en `localStorage` para sobrevivir al cierre de la pestaña,
 * a un reinicio o a un corte de luz. Contiene datos de menores, así que
 * caduca solo y nunca se envía a ningún servidor.
 */
const DIAS_VIGENCIA = 7;

function clave(grupo: GroupId): string {
  return `${APP.storageKey}:${grupo}`;
}

function disponible(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

function caducado(guardadoEn: string): boolean {
  if (!guardadoEn) return false;
  const fecha = Date.parse(guardadoEn);
  if (Number.isNaN(fecha)) return true;
  return Date.now() - fecha > DIAS_VIGENCIA * 24 * 60 * 60 * 1000;
}

function normalizar(datos: Partial<Borrador> | null, grupo: GroupId): Borrador | null {
  if (!datos || !isGroupId(datos.grupo) || !datos.valores) return null;
  if (datos.grupo !== grupo) return null;
  if (datos.valores.grupo !== datos.grupo) return null;
  return {
    grupo: datos.grupo,
    paso: typeof datos.paso === "number" ? datos.paso : 0,
    valores: { ...datos.valores, grupo: datos.grupo } as EnrollmentValues,
    guardadoEn: typeof datos.guardadoEn === "string" ? datos.guardadoEn : "",
  };
}

/** Recupera el borrador del grupo. Si caducó, lo descarta. */
export function leerBorrador(grupo: GroupId): Borrador | null {
  if (!disponible()) return null;
  try {
    const crudo = window.localStorage.getItem(clave(grupo));
    if (!crudo) return null;
    const borrador = normalizar(JSON.parse(crudo) as Partial<Borrador>, grupo);
    if (borrador && caducado(borrador.guardadoEn)) {
      window.localStorage.removeItem(clave(grupo));
      return null;
    }
    return borrador;
  } catch {
    return null;
  }
}

export function guardarBorrador(
  grupo: GroupId,
  paso: number,
  valores: EnrollmentValues,
): void {
  if (!disponible()) return;
  try {
    const datos: Borrador = {
      grupo,
      paso,
      valores,
      guardadoEn: new Date().toISOString(),
    };
    window.localStorage.setItem(clave(grupo), JSON.stringify(datos));
  } catch {
    /* almacenamiento lleno o bloqueado: la inscripción sigue siendo utilizable */
  }
}

export function borrarBorrador(grupo: GroupId): void {
  if (!disponible()) return;
  try {
    window.localStorage.removeItem(clave(grupo));
  } catch {
    /* sin efecto */
  }
}
