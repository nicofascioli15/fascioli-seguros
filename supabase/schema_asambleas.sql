-- ============================================================================
-- ASAMBLEAS: votación electrónica en asambleas de copropietarios
-- ============================================================================

-- Una asamblea de un edificio
create table if not exists asambleas (
  id                uuid default gen_random_uuid() primary key,
  cliente_id        uuid not null references mant_clientes(id) on delete cascade,
  fecha             date not null default current_date,
  tipo              text not null default 'Ordinaria' check (tipo in ('Ordinaria','Extraordinaria')),
  convocatoria      text not null default 'Primera' check (convocatoria in ('Primera','Segunda')),
  modo_conteo       text not null default 'unidad' check (modo_conteo in ('unidad','coeficiente','ambos')),
  total_unidades    integer,                 -- unidades que tiene el edificio (para quórum y mayorías sobre el total)
  total_coeficiente numeric default 100,     -- suma de coeficientes del edificio (normalmente 100)
  lugar             text,
  notas             text,
  estado            text not null default 'abierta' check (estado in ('abierta','cerrada')),
  created_at        timestamp with time zone default now()
);

-- Unidades acreditadas en la asamblea (solo las presentes o representadas por poder)
create table if not exists asamblea_unidades (
  id           uuid default gen_random_uuid() primary key,
  asamblea_id  uuid not null references asambleas(id) on delete cascade,
  unidad       text not null,               -- ej: "302", "Local 1"
  propietario  text,
  coeficiente  numeric,
  por_poder    boolean not null default false,
  apoderado    text,                         -- quién vota por esa unidad cuando es por poder
  created_at   timestamp with time zone default now(),
  unique (asamblea_id, unidad)
);

-- Mociones (temas que se votan)
create table if not exists asamblea_mociones (
  id           uuid default gen_random_uuid() primary key,
  asamblea_id  uuid not null references asambleas(id) on delete cascade,
  orden        integer not null default 0,
  titulo       text not null,
  descripcion  text,
  mayoria      text not null default 'simple' check (mayoria in ('simple','absoluta','dos_tercios','tres_cuartos','unanimidad')),
  base         text not null default 'presentes' check (base in ('presentes','edificio')),
  estado       text not null default 'pendiente' check (estado in ('pendiente','votando','cerrada')),
  aprobada     boolean,
  resultado    text,                         -- resumen guardado al cerrar la votación
  created_at   timestamp with time zone default now()
);

-- Votos (nominales: queda registrado qué votó cada unidad)
create table if not exists asamblea_votos (
  id          uuid default gen_random_uuid() primary key,
  mocion_id   uuid not null references asamblea_mociones(id) on delete cascade,
  unidad_id   uuid not null references asamblea_unidades(id) on delete cascade,
  voto        text not null check (voto in ('si','no','abstencion')),
  created_at  timestamp with time zone default now(),
  unique (mocion_id, unidad_id)
);

create index if not exists asambleas_cliente_idx on asambleas(cliente_id);
create index if not exists asamblea_unidades_asamblea_idx on asamblea_unidades(asamblea_id);
create index if not exists asamblea_mociones_asamblea_idx on asamblea_mociones(asamblea_id);
create index if not exists asamblea_votos_mocion_idx on asamblea_votos(mocion_id);

alter table asambleas          enable row level security;
alter table asamblea_unidades  enable row level security;
alter table asamblea_mociones  enable row level security;
alter table asamblea_votos     enable row level security;

drop policy if exists "auth_all" on asambleas;
drop policy if exists "auth_all" on asamblea_unidades;
drop policy if exists "auth_all" on asamblea_mociones;
drop policy if exists "auth_all" on asamblea_votos;

create policy "auth_all" on asambleas          for all using (auth.role() = 'authenticated');
create policy "auth_all" on asamblea_unidades  for all using (auth.role() = 'authenticated');
create policy "auth_all" on asamblea_mociones  for all using (auth.role() = 'authenticated');
create policy "auth_all" on asamblea_votos     for all using (auth.role() = 'authenticated');
