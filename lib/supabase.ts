import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el servidor. Solo lo deben importar Route Handlers:
 * usa la clave `service_role`, que esquiva RLS y por eso jamas debe llegar al
 * navegador.
 *
 * Sin SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY devuelve null y la aplicacion
 * sigue funcionando sin registro: la ficha se genera igual, lo unico que se
 * pierde es la fila en la base de datos. Asi se pueden hacer pruebas y
 * developing sin tocar Supabase.
 */
let cacheado: SupabaseClient | null | undefined;

export function supabaseAdmin(): SupabaseClient | null {
  if (cacheado !== undefined) return cacheado;

  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  cacheado =
    url && clave
      ? createClient(url, clave, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  return cacheado;
}

export function registroConfigurado(): boolean {
  return supabaseAdmin() !== null;
}
