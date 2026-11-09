-- ============================================================================
-- Padrón de edificios: código de edificio, torres y unidades con su propietario
-- (los inquilinos no se cargan: no votan en asamblea; si van, es con poder del propietario)
-- Se carga desde la web: Asambleas → Edificios y unidades → Importar archivos
-- ============================================================================

-- Código del edificio en el sistema de gastos comunes (ej: A01). Sirve para enganchar torres y unidades.
alter table mant_clientes add column if not exists codigo text;
create unique index if not exists mant_clientes_codigo_unico on mant_clientes (codigo) where codigo is not null and codigo <> '';

-- Torres / bloques / sectores del edificio (A = Apartamentos, C = Cocheras, etc.)
create table if not exists edificio_torres (
  id          uuid default gen_random_uuid() primary key,
  cliente_id  uuid not null references mant_clientes(id) on delete cascade,
  codigo      text not null,
  nombre      text,
  created_at  timestamp with time zone default now(),
  unique (cliente_id, codigo)
);

-- Unidades del edificio
create table if not exists edificio_unidades (
  id                  uuid default gen_random_uuid() primary key,
  cliente_id          uuid not null references mant_clientes(id) on delete cascade,
  torre               text not null default '',       -- código de torre ('' si el edificio no tiene)
  unidad              text not null,                   -- ej: "101"
  propietario         text,
  propietario_tel     text,
  propietario_email   text,
  coeficiente         numeric,                         -- % de propiedad (para asambleas por coeficiente)
  created_at          timestamp with time zone default now(),
  unique (cliente_id, torre, unidad)
);

create index if not exists edificio_unidades_cliente_idx on edificio_unidades(cliente_id);

alter table edificio_torres    enable row level security;
alter table edificio_unidades  enable row level security;
drop policy if exists "auth_all" on edificio_torres;
drop policy if exists "auth_all" on edificio_unidades;
create policy "auth_all" on edificio_torres    for all using (auth.role() = 'authenticated');
create policy "auth_all" on edificio_unidades  for all using (auth.role() = 'authenticated');
