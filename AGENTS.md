<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aviso de hidratación en `next dev`

Si la consola muestra `A tree hydrated but some attributes...` con atributos
`bis_skin_checked`, `bis_register` o `__processed_<uuid>__`, **no es un error de
esta aplicación**: los inyecta una extensión del navegador antes de que React
hidrate. En esta máquina son *Urban Browser Guard* y *Urban VPN Proxy*.

El proyecto no contiene ninguno de esos atributos (comprobado con `grep`).
Para trabajar sin ruido: desactiva esas extensiones para `localhost`
(`chrome://extensions` -> Details -> Site access -> On specific sites), o usa
una ventana de incógnito. `scripts/e2e.mts` arranca Chrome con
`--disable-extensions` y exige consola limpia, por lo que la suite no suffer
esta contaminación.
