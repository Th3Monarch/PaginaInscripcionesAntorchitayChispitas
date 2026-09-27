# Página de inscripciones · Antorchita y Chispitas

Formulario de inscripción para los grupos infantiles de la **Comunidad
Dominicana**: *Chispita* y *Antorchita*. La familia completa la ficha en siete
pasos, revisa y descarga un PDF de dos páginas para imprimir y firmar.

- **Chispita** · 6 a 9 años · 1.º, 2.º y 3.º grado
- **Antorchita** · 10 a 13 años · 4.º, 5.º y 6.º grado

Todo funciona en el navegador: el PDF se genera en el cliente con `pdf-lib`, sin
servidor ni base de datos. El borrador de una inscripción a medias se guarda en
`localStorage` del navegador, por grupo, y se ofrece recuperar al volver.

## Requisitos

- Node.js 20.9 o superior
- npm 10 o superior

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm start` | Sirve la compilación de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm run verificar:referencia` | Comprueba la lógica de edad y grado por grupo |
| `npm run verificar:pdf` | Genera la ficha de cada escenario y exige 2 páginas |
| `npm run verificar:gris` | Exige que el PDF no use operadores de color |
| `npm run verificar:layout` | Revisa páginas, márgenes y solapamientos del PDF |
| `npm run e2e` | Recorrido completo en Chrome, del inicio al PDF |

Los cuatro scripts de `verificar:*` y el `e2e` usan `npx tsx` y **no**
dependen del proyecto. Para el análisis del PDF y la prueba en navegador hace
falta instalarlos aparte, y así el despliegue no los arrastra:

```bash
npm i -D pdfjs-dist puppeteer-core
npm run build && npm start -- -p 3100   # en otra terminal
npm run e2e
```

Si ya están instalados en otro sitio, seindican por variable de entorno:
`PUPPETEER_PATH`, `CHROME_PATH`, `PDFJS_PATH`, `PDFJS_FONTS`, `BASE_URL`,
`PDF_DIR`.

## Estructura

```
app/                páginas: portada y /inscripcion
components/         interfaz del formulario, un archivo por paso
lib/config.ts       textos, identidad visual y referencias de cada grupo
lib/schemas.ts      validación con Zod (incluye el bloqueo por referencia)
lib/referencia.ts   lectura del grado y comparación con la referencia
lib/storage.ts      borrador en localStorage, por grupo y con caducidad
pdf/                generador del PDF (motor propio sobre pdf-lib)
scripts/            verificaciones y prueba end-to-end
```

## Referencia de edad y grado

`lib/config.ts` es la **única fuente de verdad** de los dos grupos:

```ts
const REFERENCIAS = {
  chispita:   { edad: { min: 6,  max: 9  }, grados: [1, 2, 3] },
  antorchita: { edad: { min: 10, max: 13 }, grados: [4, 5, 6] },
};
```

Los textos visibles se derivan de ahí, así que no pueden quedar
desincronizados con la comprobación.

El formulario **no deja avanzar** si la edad calculada o el grado no están
dentro de la referencia: el error aparece en el campo que hay que corregir
(`Chispita es para 6 a 9 años. Corrige la fecha de nacimiento…`).

El grado se escribe a mano, así que se lee en cualquier formato: `2.º`, `4to`,
`1.er`, `3°`, `6`, `Quinto de primaria`, `SEXTO`, `once`. Si no se puede
interpretar (`Kínder`, `Pre-k`, vacío) no se bloquea, porque no hay dato con
qué comparar.

Si un niño de verdad no cabe en el grupo, hay que inscribirlo en persona: la
coordinación puede registrarlo a mano.

## Reglas de diseño que conviene no romper

- **La web es roja, negra y blanca.** Fondo claro, texto oscuro, un solo rojo de
  acento por grupo (`GRUPOS[].acento`).
- **El PDF es estrictamente blanco y negro.** Se imprime en una copistería
  normal, así que no puede tener color. El logo oficial sí tiene color, por eso
  `pdf/index.ts` lo convierte a escala de grises antes de incrustarlo, y
  `npm run verificar:gris` lo comprueba sobre los operadores del PDF. Si la
  conversión falla, el logo se omite en vez de arriesgar color.
- **La ficha son dos páginas.** Ni una más, ni una menos.
- **El PDF se genera en el navegador.** No hay rutas de API ni escritura en
  disco, y por eso funciona tal cual en Vercel.

## Despliegue en Vercel

El proyecto se detecta solo como Next.js:

- **Framework preset:** Next.js
- **Build command:** `npm run build`
- **Install command:** `npm install`
- **Directorio de salida:** por defecto (`.next`)

No hay variables de entorno ni secretos: todo el contenido es público.

Para desplegar desde la terminal con la CLI de Vercel:

```bash
npm i -g vercel
vercel          # vista previa
vercel --prod   # producción
```

## Aviso de hidratación en `next dev`

Si la consola muestra `A tree hydrated but some attributes...` con atributos
`bis_skin_checked`, `bis_register` o `__processed_<uuid>__`, no es un error de
esta aplicación: los inyecta una extensión del navegador antes de que React
hidrate. En esta máquina son *Urban Browser Guard* y *Urban VPN Proxy*. Para
trabajar sin ruido, desactiva esas extensiones para `localhost` o usa una
ventana de incógnito; `npm run e2e` arranca Chrome con `--disable-extensions` y
exige consola limpia.
