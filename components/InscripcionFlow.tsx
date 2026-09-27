"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Aviso } from "@/components/ui/Campos";
import { Boton } from "@/components/ui/Layout";
import { Encabezado, Pie } from "@/components/ui/Encabezado";
import { PasoIndicador } from "@/components/ui/PasoIndicador";
import { PasoParticipante } from "@/components/forms/PasoParticipante";
import { PasoRepresentante } from "@/components/forms/PasoRepresentante";
import { PasoEmergencia } from "@/components/forms/PasoEmergencia";
import { PasoInformacion } from "@/components/forms/PasoInformacion";
import { PasoAutorizaciones } from "@/components/forms/PasoAutorizaciones";
import { Revision } from "@/components/Revision";
import { PasoPdf } from "@/components/PasoPdf";
import { APP, GRUPOS, type GroupId } from "@/lib/config";
import { enrollmentSchema, type EnrollmentValues } from "@/lib/schemas";
import { indicePaso, PASOS } from "@/lib/steps";
import {
  borrarBorrador,
  guardarBorrador,
  leerBorrador,
  type Borrador,
} from "@/lib/storage";

/** Formato fijo y legible: no depende del locale del navegador. */
function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} a las ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

function valoresIniciales(grupo: GroupId): EnrollmentValues {  return {
    grupo,
    participante: {
      nombres: "",
      fechaNacimiento: "",
      grado: "",
      institucion: "",
      telefonoFamiliar: "",
      correoFamiliar: "",
      direccion: "",
    },
    representante: {
      nombres: "",
      parentesco: "",
      telefonoPrincipal: "",
      telefonoAlternativo: "",
      correo: "",
      documento: "",
    },
    emergencia: {
      nombres: "",
      parentesco: "",
      telefono: "",
      telefonoAlternativo: "",
    },
    autorizados: [
      { nombres: "", parentesco: "", telefono: "", autorizada: false },
      { nombres: "", parentesco: "", telefono: "", autorizada: false },
    ],
    salud: {
      alergia: "",
      alergiaDetalle: "",
      condicion: "",
      condicionDetalle: "",
      medicamento: "",
      medicamentoDetalle: "",
      otra: "",
      otraDetalle: "",
    },
    autorizaciones: {
      participacion: "",
      externasInformado: false,
      externasRevisa: false,
      imagenes: "",
      imagenesCondiciones: "",
      compromiso: false,
    },
  };
}

export function InscripcionFlow({ grupo }: { grupo: GroupId }) {
  const router = useRouter();
  const config = GRUPOS[grupo];

  const [paso, setPaso] = useState(0);
  const [visitados, setVisitados] = useState(0);
  const [recuperable, setRecuperable] = useState<Borrador | null>(null);
  const [recuperado, setRecuperado] = useState(false);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const pasoRef = useRef(0);
  const descartado = useRef(false);

  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: valoresIniciales(grupo),
  });

  const guardar = useCallback(
    (destino: number) => {
      if (descartado.current) return;
      guardarBorrador(grupo, destino, { ...form.getValues(), grupo });
    },
    [form, grupo],
  );

  /* Al montar se ofrece el borrador: no se restaura sin permiso. */
  useEffect(() => {
    const borrador = leerBorrador(grupo);
    // El almacenamiento solo existe en el navegador: se lee tras el montaje.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (borrador) setRecuperable(borrador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* El borrador se conserva al salir de la página, recargar o cerrar la pestaña */
  useEffect(() => {
    const persistir = () => guardar(pasoRef.current);
    window.addEventListener("pagehide", persistir);
    return () => {
      window.removeEventListener("pagehide", persistir);
      persistir();
    };
  }, [guardar]);

  const irA = useCallback(
    (indice: number) => {
      const destino = Math.max(0, Math.min(indice, PASOS.length - 1));
      guardar(destino);
      pasoRef.current = destino;
      setPaso(destino);
      setVisitados((actual) => Math.max(actual, destino));
      setErrorGlobal(null);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [guardar],
  );

  const continuar = useCallback(async () => {
    const actual = PASOS[paso];
    const esRevision = actual.id === "revision";
    const campos = esRevision ? undefined : actual.campos;
    const valido = await form.trigger(campos, { shouldFocus: true });
    if (!valido) {
      setErrorGlobal(
        esRevision
          ? "Corrige los datos señalados antes de generar la ficha."
          : "Revisa los campos señalados en este paso.",
      );
      return;
    }
    setErrorGlobal(null);
    irA(paso + 1);
  }, [form, irA, paso]);

  const recuperar = useCallback(() => {
    if (!recuperable) return;
    form.reset(recuperable.valores);
    const destino = Math.min(recuperable.paso, PASOS.length - 2);
    pasoRef.current = destino;
    setPaso(destino);
    setVisitados(destino);
    setRecuperable(null);
    setRecuperado(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [form, recuperable]);

  const descartarGuardado = useCallback(() => {
    borrarBorrador(grupo);
    setRecuperable(null);
    setConfirmacion("Borrador anterior eliminado.");
  }, [grupo]);

  const vaciarFormulario = useCallback(() => {
    descartado.current = true;
    borrarBorrador(grupo);
    form.reset(valoresIniciales(grupo));
    pasoRef.current = 0;
    setPaso(0);
    setVisitados(0);
    setRecuperable(null);
    setRecuperado(false);
    setConfirmacion("Formulario vaciado. Puedes empezar de nuevo.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [form, grupo]);

  const salir = useCallback(() => {
    descartado.current = true;
    borrarBorrador(grupo);
    router.push("/");
  }, [grupo, router]);

  const valores = form.getValues();
  const esPdf = paso === indicePaso("pdf");
  const tituloPaso = PASOS[paso]?.titulo ?? "";

  return (
    <div data-group={grupo} className="flex min-h-full flex-col">
      <Encabezado
        grupo={grupo}
        titulo={tituloPaso}
        pasoActual={paso + 1}
        accionSalir={
          <Boton type="button" variante="fantasma" onClick={salir}>
            Volver al inicio
          </Boton>
        }
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <PasoIndicador actual={paso} visitados={visitados} onIr={irA} />

        {recuperable && !form.formState.isDirty ? (
          <div
            role="status"
            className="mt-4 rounded-xl border-2 border-accent bg-accent-soft p-4"
          >
            <p className="text-base font-bold text-ink">
              Hay una inscripción a medias guardada
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {recuperable.valores.participante.nombres
                ? `De ${recuperable.valores.participante.nombres}, `
                : ""}
              quedó en el paso{" "}
              {Math.min(recuperable.paso + 1, PASOS.length - 1)} de {PASOS.length}
              {recuperable.guardadoEn
                ? ` · guardada el ${fechaCorta(recuperable.guardadoEn)}`
                : ""}
              . Se queda en este navegador y caduca a los 7 días.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Boton type="button" onClick={recuperar}>
                Continuar donde lo dejé
              </Boton>
              <Boton type="button" variante="secundario" onClick={descartarGuardado}>
                Empezar de cero
              </Boton>
            </div>
          </div>
        ) : null}

        {recuperado ? (
          <div className="mt-4">
            <Aviso tono="exito">
              Se restauró el borrador guardado en este navegador. Al llegar al
              inicio o al vaciar el formulario se borra.
            </Aviso>
          </div>
        ) : null}

        {confirmacion ? (
          <div className="mt-4">
            <Aviso tono="exito">{confirmacion}</Aviso>
          </div>
        ) : null}

        <div className="mt-6">
          {paso === indicePaso("participante") ? (
            <PasoParticipante form={form} grupo={grupo} />
          ) : null}
          {paso === indicePaso("representante") ? (
            <PasoRepresentante form={form} grupo={grupo} />
          ) : null}
          {paso === indicePaso("emergencia") ? (
            <PasoEmergencia form={form} />
          ) : null}
          {paso === indicePaso("informacion") ? (
            <PasoInformacion form={form} />
          ) : null}
          {paso === indicePaso("autorizaciones") ? (
            <PasoAutorizaciones form={form} grupo={grupo} />
          ) : null}
          {paso === indicePaso("revision") ? (
            <Revision valores={valores} grupo={grupo} onEditar={irA} />
          ) : null}
          {esPdf ? (
            <PasoPdf valores={valores} grupo={grupo} onSalir={salir} />
          ) : null}
        </div>

        {errorGlobal ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-[#e2b4ab] bg-[#fdf3f1] px-3 py-2.5 text-sm font-medium text-[#7d1d12]"
          >
            {errorGlobal}
          </p>
        ) : null}

        {!esPdf ? (
          <nav
            aria-label="Navegación del formulario"
            className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
          >
            <Boton
              type="button"
              variante="secundario"
              onClick={() => irA(paso - 1)}
              disabled={paso === 0}
            >
              Atrás
            </Boton>
            <Boton type="button" onClick={continuar} className="ml-auto">
              {paso === indicePaso("revision")
                ? "Generar ficha en PDF"
                : paso === indicePaso("autorizaciones")
                  ? "Revisar información"
                  : `Continuar al paso ${paso + 2}`}
            </Boton>
          </nav>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs leading-relaxed text-muted">
            {config.nombre} · {config.lema}. {APP.notaLegal}
          </p>
          <Boton
            type="button"
            variante="fantasma"
            onClick={vaciarFormulario}
            className="shrink-0"
          >
            Vaciar formulario
          </Boton>
        </div>
      </main>

      <Pie />
    </div>
  );
}
