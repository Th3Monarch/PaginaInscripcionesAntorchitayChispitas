-- Pega este script en el editor SQL de Supabase (Dashboard -> SQL Editor).
-- Idempotente: puedes ejecutarlo mas de una vez.
--
-- Decision de privacidad: la tabla guarda lo minimo que la coordinacion
-- necesita para recoger la ficha en papel. NO se guarda el documento de
-- identidad, la fecha de nacimiento, los datos de salud, la direccion ni el
-- nombre del representante: eso viaja solo en el PDF que entrega la familia.

create table if not exists public.inscripciones (
  envio        uuid        primary key,
  recibido     timestamptz not null default now(),
  grupo        text        not null check (grupo in ('chispita', 'antorchita')),
  participante text        not null check (char_length(participante) between 4 and 120),
  contacto     text        check (contacto is null or char_length(contacto) <= 30)
);

comment on table public.inscripciones is
  'Aviso de ficha generada. Solo datos minimos; el detalle viaja en el PDF en papel.';

-- La vista por defecto es lo mas reciente primero.
create index if not exists inscripciones_recibido_idx
  on public.inscripciones (recibido desc);

-- RLS activado y SIN politicas: la clave anon no puede leer ni escribir nada,
-- ni siquiera insertar. Todo pasa por la API de la aplicacion, que usa la
-- clave de service_role y valida con Zod antes de tocar la tabla.
alter table public.inscripciones enable row level security;

-- Comprobacion: desde el dashboard no deberia aparecer ninguna politica.
-- select * from pg_policies where tablename = 'inscripciones';  -- 0 filas
