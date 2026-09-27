import type { MetadataRoute } from "next";

/**
 * La lista de fichas no debe terminar en un buscador. No es seguridad (la
 * pagina sigue siendo publica), pero evita que un nombre de menor quede
 * indexado y legible desde un resultado de busqueda.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/registros", "/api/"],
      },
    ],
  };
}
