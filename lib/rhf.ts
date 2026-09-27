import type { FieldError } from "react-hook-form";

export function msg(error?: FieldError): string | undefined {
  return typeof error?.message === "string" ? error.message : undefined;
}

export function msgAnidado(error: unknown): string | undefined {
  if (error && typeof error === "object" && "message" in error) {
    const valor = (error as { message?: unknown }).message;
    return typeof valor === "string" ? valor : undefined;
  }
  return undefined;
}
