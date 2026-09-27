import { APP, GRUPOS, type GroupId } from "./config";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function partes(iso: string): { dia: number; mes: number; anio: number } | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!coincidencia) return null;
  const [, anio, mes, dia] = coincidencia;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  if (
    fecha.getFullYear() !== Number(anio) ||
    fecha.getMonth() !== Number(mes) - 1 ||
    fecha.getDate() !== Number(dia)
  ) {
    return null;
  }
  return { dia: Number(dia), mes: Number(mes), anio: Number(anio) };
}

export function formatFechaLarga(iso: string): string {
  const p = partes(iso);
  if (!p) return "—";
  return `${p.dia} de ${MESES[p.mes - 1]} de ${p.anio}`;
}

export function formatFechaDMY(iso: string): string {
  const p = partes(iso);
  if (!p) return "—";
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(p.dia)} / ${dos(p.mes)} / ${p.anio}`;
}

export function formatFechaCorta(iso: string): string {
  const p = partes(iso);
  if (!p) return "—";
  return `${p.dia}/${p.mes}/${p.anio}`;
}

export function calcularEdad(iso: string): number {
  const p = partes(iso);
  if (!p) return -1;
  const hoy = new Date();
  let edad = hoy.getFullYear() - p.anio;
  const mes = hoy.getMonth() + 1 - p.mes;
  if (mes < 0 || (mes === 0 && hoy.getDate() < p.dia)) edad -= 1;
  return edad;
}

export function edadLabel(iso: string): string {
  const edad = calcularEdad(iso);
  return edad < 0 ? "—" : `${edad} años`;
}

export function siNo(valor: string): string {
  if (valor === "si") return "Sí";
  if (valor === "no") return "No";
  return "—";
}

export function opcionAutorizacion(valor: string): string {
  if (valor === "autorizo") return "AUTORIZO";
  if (valor === "no_autorizo") return "NO AUTORIZO";
  return "—";
}

export function nombreArchivo(grupo: GroupId, nombres: string): string {
  const sinAcentos = nombres
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const partesNombre = sinAcentos
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 4)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  const sufijo = partesNombre.length ? `_${partesNombre.join("_")}` : "";
  return `Inscripcion_${GRUPOS[grupo].nombre}${sufijo}.pdf`;
}

export function vacio(valor: unknown): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return texto.length ? texto : "—";
}

export function pieDocumento(grupo: GroupId): string {
  return `${GRUPOS[grupo].nombre} · ${GRUPOS[grupo].lema} · ${APP.tituloDocumento}`;
}
