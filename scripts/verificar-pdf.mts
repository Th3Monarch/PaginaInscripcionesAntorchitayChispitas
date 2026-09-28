/**
 * Genera la ficha de todos los escenarios y comprueba que ninguno se pasa de
 * dos páginas. Deja los PDF en la carpeta temporal para poder revisarlos.
 * Incluye el logo oficial a color, como en el navegador.
 *   npm run verificar:pdf
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EnrollmentValues } from "@/lib/schemas";
import { construirFicha } from "@/pdf/ficha";

const SALIDA = process.env.PDF_DIR ?? tmpdir();

/** El logo tal cual, a color. Si no está, la ficha sale sin él. */
async function cargarLogo(): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await readFile("public/logo-antorcha.png"));
  } catch {
    return undefined;
  }
}

const base: EnrollmentValues = {
  grupo: "chispita",
  participante: {
    nombres: "María Fernanda Pérez",
    fechaNacimiento: "2017-04-12",
    grado: "3.º",
    institucion: "Colegio Santa Ana",
telefonoFamiliar: "04125551234",
    correoFamiliar: "familia@correo.do",
    direccion: "Calle Duarte 45, Santo Domingo",
  },
  representante: {
    nombres: "Ana Lucía Pérez",
    parentesco: "Madre",
    telefonoPrincipal: "04125559876",
    telefonoAlternativo: "04165554321",
    correo: "ana.perez@correo.do",
    documento: "001-1234567-8",
  },
emergencia: {
    nombres: "José Pérez",
    parentesco: "Abuelo",
    telefono: "04145557788",
    telefonoAlternativo: "",
  },
  autorizados: [
    {
      nombres: "Rosa Pérez",
      parentesco: "Tía",
      telefono: "04145553333",
      autorizada: true,
    },
    {
      nombres: "Carlos Pérez",
      parentesco: "Tío",
      telefono: "04225554444",
      autorizada: true,
    },
  ],
  salud: {
    alergia: "si",
    alergiaDetalle: "Penicilina y.maracuyá",
    condicion: "si",
    condicionDetalle: "Asma leve, lleva inhalador de rescate",
    medicamento: "no",
    medicamentoDetalle: "",
    otra: "no",
    otraDetalle: "",
  },
  autorizaciones: {
    participacion: "autorizo",
    externasInformado: true,
    externasRevisa: true,
    imagenes: "autorizo",
    imagenesCondiciones:
      "Solo actividades del grupo, sin uso comercial ni redes sociales abiertas.",
    compromiso: true,
  },
};

const largos: EnrollmentValues["participante"] = {
  ...base.participante,
  nombres: "María Fernanda Pérez de la Cruz Concepción",
  direccion:
    "Calle Duarte Número 45, Ensanche Ozama, Santo Domingo Este, Distrito Nacional, República Dominicana",
};

const maximo: EnrollmentValues = {
  grupo: "chispita",
  participante: {
    nombres: "María Fernanda Pérez de la Cruz Concepción",
    fechaNacimiento: "2016-01-31",
    grado: "8.º de secundaria",
    institucion: "Institución Educativa Nacional José Ramón López",
    telefonoFamiliar: "+1 (809) 555-1234",
    correoFamiliar: "familia.perez.cruz@correoelectronico.do",
    direccion:
      "Calle Duarte Número 45, Ensanche Ozama, Santo Domingo Este, Distrito Nacional, República Dominicana",
  },
  representante: {
    nombres: "Ana Lucía Pérez de la Cruz",
    parentesco: "Madre biológica y representante legal",
    telefonoPrincipal: "+1 (809) 555-9876",
    telefonoAlternativo: "809-555-4321",
    correo: "ana.lucia.perez@correoelectronico.do",
    documento: "001-1234567-89",
  },
  emergencia: {
    nombres: "José Antonio Pérez Santana",
    parentesco: "Abuelo paterno",
    telefono: "8095557788",
    telefonoAlternativo: "+1 (829) 555-1122",
  },
  autorizados: [
    {
      nombres: "Rosa Isabel Pérez Santana",
      parentesco: "Tía materna",
      telefono: "8095553333",
      autorizada: true,
    },
    {
      nombres: "Carlos Manuel Pérez Santana",
      parentesco: "Tío paterno",
      telefono: "809-555-4444",
      autorizada: true,
    },
    {
      nombres: "Lucía Mercedes Santana",
      parentesco: "Abuela",
      telefono: "8095556666",
      autorizada: true,
    },
    {
      nombres: "Andrés Felipe Pérez",
      parentesco: "Primo",
      telefono: "8095559999",
      autorizada: true,
    },
  ],
  salud: {
    alergia: "si",
    alergiaDetalle:
      "Penicilina, maracuyá, polvo de libros y humedad en la piel durante el verano",
    condicion: "si",
    condicionDetalle:
      "Asma leve persistente; lleva inhalador de rescate y cuenta con un plan de acción actualizado por el pediatra.",
    medicamento: "si",
    medicamentoDetalle:
      "Salbutamol inhalador, una dosis antes de actividades físicas y según indicación médica.",
    otra: "si",
    otraDetalle:
      "Necesita apoyo para ir al baño de forma intermitente; la coordinación debe recordárselo en cada actividad.",
  },
  autorizaciones: {
    participacion: "autorizo",
    externasInformado: true,
    externasRevisa: true,
    imagenes: "autorizo",
    imagenesCondiciones:
      "Solo para actividades del grupo; sin uso comercial, sin redes sociales abiertas y sin difusión de imágenes donde no haya consentimiento de terceros.",
    compromiso: true,
  },
};

const minimos = {
  salud: {
    alergia: "no",
    alergiaDetalle: "",
    condicion: "no",
    condicionDetalle: "",
    medicamento: "no",
    medicamentoDetalle: "",
    otra: "no",
    otraDetalle: "",
  },
autorizados: [
    {
      nombres: "Rosa Pérez",
      parentesco: "Tía",
      telefono: "04225553333",
      autorizada: true,
    },
    { nombres: "", parentesco: "", telefono: "", autorizada: false },
  ],
  autorizaciones: {
    participacion: "autorizo" as const,
    externasInformado: true,
    externasRevisa: true,
    imagenes: "no_autorizo" as const,
    imagenesCondiciones: "",
    compromiso: true,
  },
};

const escenarios: Array<{ nombre: string; valores: EnrollmentValues }> = [
  { nombre: "chispita-tipico", valores: base },
  {
    nombre: "antorchita-tipico",
    valores: {
      ...base,
      grupo: "antorchita",
      participante: {
        ...base.participante,
        fechaNacimiento: "2013-04-12",
        grado: "6.º",
      },
    },
  },
  { nombre: "chispita-largo", valores: { ...base, participante: largos } },
  {
    nombre: "antorchita-minimo",
    valores: { ...base, grupo: "antorchita", ...minimos },
  },
  { nombre: "peor-caso", valores: maximo },
];

let fallos = 0;
const logo = await cargarLogo();
await mkdir(SALIDA, { recursive: true });
for (const escenario of escenarios) {
  const errores: string[] = [];
  const errorOriginal = console.error;
  console.error = (...parte: unknown[]) => {
    errores.push(parte.map((p) => String(p)).join(" "));
  };
  const { bytes, paginas } = await construirFicha(escenario.valores, logo);
  console.error = errorOriginal;

  const limite = paginas > 2 || errores.length > 0;
  if (limite) fallos += 1;
  const ruta = join(SALIDA, `${escenario.nombre}.pdf`);
  await writeFile(ruta, bytes);
  console.log(
    `${limite ? "[FALLA]" : "[OK]"} ${escenario.nombre}: ${paginas} pagina(s), ${bytes.length} bytes -> ${ruta}`,
  );
  errores.forEach((mensaje) => console.log(`   ${mensaje}`));
}

console.log(fallos ? `FALLOS: ${fallos}` : "TODO CORRECTO");
process.exit(fallos ? 1 : 0);
