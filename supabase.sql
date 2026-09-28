-- Pega este script en el editor SQL de Supabase (Dashboard -> SQL Editor).
-- Idempotente: puedes ejecutarlo mas de una vez.
--
-- Decision de privacidad: la tabla guarda el aviso de ficha y el detalle que
-- la coordinacion pidio: participante (fecha de nacimiento, grado, institucion
-- y direccion), representante (incluido su documento de identidad), contacto
-- de emergencia y personas autorizadas. NO se guardan los datos de salud ni
-- el bloque de autorizaciones: eso viaja solo en el PDF que entrega la familia.

create table if not exists public.inscripciones (
  envio        uuid        primary key,
  recibido     timestamptz not null default now(),
  grupo        text        not null check (grupo in ('chispita', 'antorchita')),
  participante text        not null check (char_length(participante) between 4 and 120),
  contacto     text        check (contacto is null or char_length(contacto) <= 30),
  detalle      jsonb
);

-- Para proyectos existentes (la tabla ya existe): anade solo la columna nueva.
alter table public.inscripciones
  add column if not exists detalle jsonb;

comment on table public.inscripciones is
  'Ficha generada + detalle util para la coordinacion. Datos de salud y autorizaciones solo en el PDF en papel.';

-- La vista por defecto es lo mas reciente primero.
create index if not exists inscripciones_recibido_idx
  on public.inscripciones (recibido desc);

-- RLS activado y SIN politicas: la clave anon no puede leer ni escribir nada,
-- ni siquiera insertar. Todo pasa por la API de la aplicacion, que usa la
-- clave de service_role y valida con Zod antes de tocar la tabla.
alter table public.inscripciones enable row level security;

-- Comprobacion: desde el dashboard no deberia aparecer ninguna politica.
-- select * from pg_policies where tablename = 'inscripciones';  -- 0 filas
