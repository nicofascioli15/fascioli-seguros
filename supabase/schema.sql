-- ================================================
-- FASCIOLI SEGUROS — Schema Supabase
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

-- CLIENTES
create table if not exists clientes (
  id          uuid default gen_random_uuid() primary key,
  nombre      text not null,
  direccion   text,
  contacto    text,
  tel         text,
  email       text,
  created_at  timestamp with time zone default now()
);

-- PÓLIZAS
create table if not exists polizas (
  id                 uuid default gen_random_uuid() primary key,
  cliente_id         uuid references clientes(id) on delete cascade,
  ramo               text not null,
  compania           text,
  numero             text,
  vencimiento        date,
  corredor           text,
  moneda             text default 'U$S',
  cuotas             integer default 0,
  cuota_mes          text,
  ultima_cuota       text,
  created_at         timestamp with time zone default now()
);

-- PAGOS DE CUOTAS
create table if not exists pagos (
  id          uuid default gen_random_uuid() primary key,
  poliza_id   uuid references polizas(id) on delete cascade,
  cuota_num   integer not null,
  fecha       date not null,
  metodo      text,
  referencia  text,
  created_at  timestamp with time zone default now(),
  unique(poliza_id, cuota_num)
);

-- SINIESTROS
create table if not exists siniestros (
  id               uuid default gen_random_uuid() primary key,
  cliente_id       uuid references clientes(id) on delete cascade,
  poliza_id        uuid references polizas(id),
  tipo             text,
  descripcion      text,
  fecha_ocurrencia date,
  estado           text default 'En gestión',
  created_at       timestamp with time zone default now()
);

-- DOCUMENTOS
create table if not exists documentos (
  id           uuid default gen_random_uuid() primary key,
  cliente_id   uuid references clientes(id) on delete cascade,
  poliza_id    uuid references polizas(id),
  nombre       text not null,
  tipo         text,
  storage_path text not null,
  tamanio_bytes bigint,
  created_at   timestamp with time zone default now()
);

-- ── RLS — solo usuarios autenticados ─────────────────────────────────────────
alter table clientes   enable row level security;
alter table polizas    enable row level security;
alter table pagos      enable row level security;
alter table siniestros enable row level security;
alter table documentos enable row level security;

create policy "auth_all" on clientes   for all using (auth.role() = 'authenticated');
create policy "auth_all" on polizas    for all using (auth.role() = 'authenticated');
create policy "auth_all" on pagos      for all using (auth.role() = 'authenticated');
create policy "auth_all" on siniestros for all using (auth.role() = 'authenticated');
create policy "auth_all" on documentos for all using (auth.role() = 'authenticated');

-- ── Storage bucket ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "upload_auth" on storage.objects
  for insert with check (bucket_id = 'documentos' and auth.role() = 'authenticated');

create policy "download_auth" on storage.objects
  for select using (bucket_id = 'documentos' and auth.role() = 'authenticated');

