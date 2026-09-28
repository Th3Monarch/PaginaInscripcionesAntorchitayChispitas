import Link from "next/link";
import { APP, GROUP_LIST } from "@/lib/config";
import { PASOS } from "@/lib/steps";
import { Pie } from "@/components/ui/Encabezado";
import { registroConfigurado } from "@/lib/supabase";

/** Si no hay registro configurado, la portada no promete nada que no haya. */
const REGISTRO_ACTIVO = registroConfigurado();

const FASES = [
  {
    titulo: "Elige el grupo",
    texto:
      "Comienza por Chispita o Antorchita. El grupo queda fijo y la ficha se genera solo para esa opción.",
  },
  {
    titulo: "Completa los datos",
    texto:
      "Participante, representante, contacto de emergencia, información de salud y autorizaciones, con validación en cada paso.",
  },
  {
    titulo: "Revisa y genera el PDF",
    texto:
      "Comprueba todo antes de continuar. La ficha se crea en tu navegador y, si lo autorizas, se avisa a la coordinación de que hay una ficha lista para recoger.",
  },
  {
    titulo: "Imprime y firma",
    texto:
      "Descarga la ficha, imprímela y entrégala firmada a la coordinación del grupo.",
  },
];

export default function Inicio() {
  return (
    <div data-group="inicio" className="flex min-h-full flex-col bg-cream">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <span className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={APP.logoPath}
              alt=""
              width={34}
              height={34}
              className="size-8 shrink-0 object-contain"
            />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Chispita y Antorchita
            </span>
          </span>
          <p className="text-xs text-white/60">
            {APP.comunidad} · {APP.instrumento}
          </p>
        </div>
      </header>

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent-claro uppercase">
            Ficha de inscripción y autorización
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
            Inscripción en{" "}
            <span className="text-accent-claro">Chispita</span> y{" "}
            <span className="text-accent-claro">Antorchita</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            Completa la ficha de tu niña o niño en {PASOS.length} pasos guiados.
            Al final obtendrás el PDF, listo para imprimir y firmar.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/60">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-claro" />
              El PDF se arma en tu navegador
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-claro" />
              Borrador recuperable si cierras la pestaña
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-claro" />
              PDF de 2 páginas
            </span>
          </div>
        </div>
        <div aria-hidden="true" className="h-1.5 w-full bg-accent-claro" />
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-14">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Cómo funciona
        </h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-2">
          {FASES.map((fase, indice) => (
            <li
              key={fase.titulo}
              className="flex gap-4 border border-line bg-surface p-5"
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center bg-ink text-sm font-bold text-white"
              >
                {indice + 1}
              </span>
              <span>
                <span className="block text-base font-semibold text-ink">
                  {fase.titulo}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted">
                  {fase.texto}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <div className="border-l-4 border-accent bg-surface p-5">
            <p className="text-base font-bold text-ink">Importante</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Esta herramienta corresponde únicamente a Chispita y Antorchita y
              no constituye el proceso de incorporación al Grupo Juvenil
              Dominicano Antorcha. La inscripción en imágenes o videos es
              independiente: no depende de autorizar fotografías y no se
              solicitan redes sociales personales del menor.
            </p>
          </div>
          <div className="border-l-4 border-ink bg-surface p-5">
            <p className="text-base font-bold text-ink">Tus datos</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Mientras completas la ficha, tu avance se guarda en este
              navegador y se borra al llegar al inicio, al vaciar el formulario
              o a los 7 días.{" "}
              {REGISTRO_ACTIVO ? (
                <>
                  Al final, si tú lo autorizas, se envía a la coordinación los
                  datos de la ficha: participante (con fecha de nacimiento,
                  grado, institución y dirección), representante (con su
                  documento de identidad), contacto de emergencia y personas
                  autorizadas. Los datos de salud y las autorizaciones{" "}
                  <strong className="font-semibold text-ink">
                    no se envían
                  </strong>
                  : solo van en el papel que entregas firmado.{" "}
                </>
              ) : (
                <>
                  Nada sale de este navegador: la ficha se arma aquí y te la
                  descargas.{" "}
                </>
              )}
              {APP.notaLegal}
            </p>
          </div>
        </div>

        <h2 className="mt-14 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Elige el grupo al que se inscribe
        </h2>
        <p className="mt-2 text-sm text-muted">
          La opción que elijas define el contenido de la ficha.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {GROUP_LIST.map((grupo) => (
            <Link
              key={grupo.id}
              href={`/inscripcion?grupo=${grupo.id}`}
              data-grupo={grupo.id}
              className="group flex min-h-56 flex-col border-t-4 border-accent border-x border-b border-line bg-surface p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-accent-line hover:shadow-lg focus-visible:-translate-y-1"
            >
              <span className="text-2xl font-bold tracking-tight text-ink">
                {grupo.nombre}
              </span>
              <span className="mt-1 text-sm font-semibold text-accent-strong">
                «{grupo.lema}»
              </span>
              <span className="mt-4 text-sm leading-relaxed text-ink-soft">
                {grupo.descripcion}
              </span>
              {grupo.edadReferencia && grupo.gradosReferencia ? (
                <span className="mt-4 inline-flex w-fit items-center gap-2 border border-line bg-cream px-2.5 py-1 text-xs font-semibold text-ink">
                  {grupo.edadReferencia}
                  <span aria-hidden="true" className="text-line-strong">
                    ·
                  </span>
                  {grupo.gradosReferencia} grado
                </span>
              ) : null}
              <span className="mt-4 text-sm leading-relaxed text-muted">
                {grupo.bullet}
              </span>
              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold tracking-wide text-accent uppercase">
                Iniciar inscripción
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-5 border-l-2 border-line pl-4 text-sm leading-relaxed text-muted">
          <span className="font-semibold text-ink">Edad y grado por grupo.</span>{" "}
          Cada grupo tiene su referencia y el formulario no deja continuar si
          la edad o el grado no están dentro de ella.
        </p>

        <h2 className="mt-16 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Acceso de coordinación
        </h2>
        <p className="mt-2 text-sm text-muted">
          La lista de avisos de fichas va cerrada con clave y no es pública.
          Es solo para el equipo del grupo.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Link
            href="/registros"
            data-panel="registros"
            className="group flex min-h-56 flex-col border-t-4 border-ink border-x border-b border-line bg-surface p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-lg focus-visible:-translate-y-1"
          >
            <span className="text-2xl font-bold tracking-tight text-ink">
              Panel de fichas
            </span>
            <span className="mt-1 text-sm font-semibold text-muted">
              Para la coordinación
            </span>
            <span className="mt-4 text-sm leading-relaxed text-ink-soft">
              Un aviso por cada ficha de inscripción generada en el sitio, con
              descarga en Excel. La puerta pide la clave del grupo.
            </span>
            <span className="mt-4 inline-flex w-fit items-center gap-2 border border-line bg-cream px-2.5 py-1 text-xs font-semibold text-ink">
              Fichas nuevas · Descarga Excel
            </span>
            <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold tracking-wide text-ink uppercase">
              Entrar al panel
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </Link>
        </div>
      </main>

      <Pie />
    </div>
  );
}
