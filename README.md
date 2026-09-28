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
| `npm run verificar:pintura` | Mide el color real del botón del panel; caza el blanco sobre blanco |
| `npm run e2e` | Recorrido completo en Chrome, del inicio al PDF |
| `npm run e2e:acceso` | La puerta del panel, con un servidor arrancado **con** `PANEL_CLAVE` |
| `npm run e2e:borrador` | El borrador se guarda y se recupera; **corrérrelo contra `next dev`** |

Los cuatro scripts de `verificar:*` y el `e2e` usan `npx tsx` y **no**
dependen del proyecto. Para el análisis del PDF y la prueba en navegador hace
falta instalarlos aparte, y así el despliegue no los arrastra:

```bash
npm i -D pdfjs-dist puppeteer-core
npm run build && npm start -- -p 3100   # en otra terminal
npm run e2e
```

`npm run e2e:borrador` es la excepción: hay que lanzarlo contra `next dev`, porque
el fallo que persigue (ver más abajo) solo aparece en desarrollo.

Si ya están instalados en otro sitio, seindican por variable de entorno:
`PUPPETEER_PATH`, `CHROME_PATH`, `PDFJS_PATH`, `PDFJS_FONTS`, `BASE_URL`,
`PDF_DIR`.

## El borrador y el doble montaje de efectos

El borrador se guarda en `pagehide` y en cada cambio de paso, **nunca en el
cleanup del `useEffect`**. En desarrollo React monta y desmonta los efectos una
vez más de inmediato, así que un guardado en el cleanup escribía el formulario
vacío encima del borrador bueno: el aviso aparecía, pero al pulsar «Continuar
donde lo dejé» todos los campos salían en blanco. Solo se veía en desarrollo,
porque en producción ese doble montaje no ocurre.

Por si acaso, `guardarBorrador` también se niega a sobrescribir un borrador con
datos usando un guardado vacío: quien abre la ficha y sale de inmediato no
pierde lo que ya había escrito.

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
- **El PDF se genera en el navegador.** La generación no toca el servidor, y por
  eso funciona tal cual en Vercel. Lo único que sale del navegador es el aviso
  opcional de ficha nueva, descrito más abajo.

## La lista de fichas nuevas

La página `/registros` es el aviso de que hay una ficha por recoger. Guarda el
nombre, el grupo, la fecha y el **detalle que pidió la coordinación**: datos del
participante (fecha de nacimiento, grado, institución, teléfono, correo y
dirección), representante (incluido su documento de identidad), contacto de
emergencia y personas autorizadas. **No** se guardan los datos de salud ni el
bloque de autorizaciones: eso viaja únicamente en el papel firmado.

Puesta en marcha:

1. Crea un proyecto en Supabase y pega `supabase.sql` en el editor SQL. Deja
   RLS activado y sin políticas: la clave `anon` no puede tocar la tabla, todo
   pasa por la API.
2. Si el proyecto Supabase **ya existe** de antes, `supabase.sql` añade solo la
   columna `detalle` cuando la ejecutes de nuevo (`alter table ... add column if
   not exists`). No depende de recrear la tabla.
3. Copia `.env.example` a `.env.local` y rellena `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` y `PANEL_CLAVE`.
4. En Vercel, añade las tres como variables de entorno. `PANEL_CLAVE` es la
   clave que teclea quien entra al panel; invéntala tú, no la publiques.

Sin las variables de Supabase el sitio funciona igual: la ficha se genera y se
descarga, solo que no se anota en la lista. Eso es a propósito, para que la
suite de pruebas no dependa de un servicio externo. Sin `PANEL_CLAVE` en
cambio el panel **no** se abre: cerrado.

Tres cosas que conviene no romper:

- **`SUPABASE_SERVICE_ROLE_KEY` no llega nunca al navegador.** Solo la importan
  los Route Handlers. Esa clave esquiva RLS: si se filtra, cualquiera puede
  leer y borrar la tabla desde Internet.
- **Qué se guarda se decide en un solo sitio,** `registroDesde()` en
  `lib/registro.ts`. Si añades un campo ahí, se guarda en una base de datos
  consultable desde Internet. Ahora se guarda el detalle de la ficha que pidió
  la coordinación (participante, representante con su documento, emergencia y
  autorizados); los datos de salud y las autorizaciones siguen fuera. Si esto
  cambia, actualiza a la vez el texto de privacidad de la portada.
- **La familia autoriza antes de enviar,** con la casilla del último paso. No
  se manda nada hasta que la marca.

Pendiente por decisión de la coordinación: **borrar las filas al cerrar el
período de inscripción.** Una tabla con datos de menores que crece sin fecha de
caducidad solo da problemas.

### `/registros` va cerrado con clave

La lista contiene datos de menores, así que **no es pública**. Sin cookie de
sesión, `GET /api/inscripciones` responde `401` y tanto la tabla como la descarga
de Excel quedan cerradas; `/registros` enseña un formulario de clave en su lugar.

Cómo funciona, sin cuentas de usuario:

- `PANEL_CLAVE` es la clave del panel. **Solo en el servidor**, nunca en el
  repositorio: `.env.local` está ignorado por `.gitignore`, y en Vercel es una
  variable de entorno. No hay valor por defecto a propósito, porque una clave
  escrita en el repositorio es una clave publicada.
- `POST /api/acceso` compara la clave en el servidor con `timingSafeEqual` y, si
  acierta, deja una cookie firmada con HMAC. `DELETE /api/acceso` la borra.
- La cookie es `httpOnly` (el JavaScript no la ve), `SameSite=Strict`,
  `Secure` en producción y **de sesión**: no sobrevive al cierre de la pestaña.
  El valor es una firma, no la clave: sin `PANEL_CLAVE` las cookies firmadas
  dejan de validar solas.
- **Cada vez que se entra al apartado se pide la clave.** En cuanto carga, el
  panel borra la sesión anterior antes de consultar. Salir de `/registros` y
  volver (aunque sea a la página principal y con la pestaña abierta) obliga a
  teclearla otra vez.
- **Si no hay `PANEL_CLAVE`, el panel no se abre.** Un despliegue sin la variable
  se queda cerrado en vez de enseñar la lista: la configuración que falta debe
  doler al que administra, no a las familias.
- El `POST` público que usan las familias al terminar la ficha **no** lleva
  cookie: es la parte que el sitio ofrece a cualquiera. Solo la lectura está
  cerrada.

`app/robots.ts` sigue excluyendo `/registros` y `/api/` de los buscadores. Eso no
es seguridad —solo evita que un nombre quede indexado—; la seguridad es la clave.

La puerta tiene prueba propia, `npm run e2e:acceso`, que arranca contra un
servidor con clave y comprueba que sin cookie no sale nada, que una clave
inventada no entra, que una cookie fabricada a mano no vale y que salir cierra la
sesión.

El Excel tiene su propia comprobación sin servidor, `npm run e2e:excel`: genera
el archivo con datos de ejemplo y revisa que estén las tres hojas, los
encabezados, la edad calculada y los totales del resumen.

## Despliegue en Vercel

El proyecto se detecta solo como Next.js:

- **Framework preset:** Next.js
- **Build command:** `npm run build`
- **Install command:** `npm install`
- **Directorio de salida:** por defecto (`.next`)

El contenido del sitio es público. Solo hay que añadir las dos variables de
Supabase en *Settings → Environment Variables* **si** quieres la lista activa; si
no, el sitio funciona sin ellas.

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
