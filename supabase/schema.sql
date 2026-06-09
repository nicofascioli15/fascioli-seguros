-- ==============================================
-- FASCIOLI SEGUROS — Esquema Supabase
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================

-- CLIENTES
create table clientes (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  ci text unique,
  telefono text,
  email text,
  ciudad text,
  notas text,
  created_at timestamp with time zone default now()
);

-- PÓLIZAS
create table polizas (
  id uuid default gen_random_uuid() primary key,
  numero text unique not null,
  cliente_id uuid references clientes(id),
  tipo text check (tipo in ('Automotor', 'Hogar', 'Vida', 'RC', 'Otros')),
  aseguradora text,
  prima_anual numeric,
  fecha_inicio date,
  fecha_vencimiento date,
  estado text check (estado in ('Vigente', 'Por vencer', 'Vencida', 'Cancelada')),
  notas text,
  created_at timestamp with time zone default now()
);

-- PAGOS
create table pagos (
  id uuid default gen_random_uuid() primary key,
  poliza_id uuid references polizas(id),
  monto numeric not null,
  fecha_vencimiento date,
  fecha_cobro date,
  metodo text,
  estado text check (estado in ('Pendiente', 'Cobrado', 'Vencido')),
  created_at timestamp with time zone default now()
);

-- SINIESTROS
create table siniestros (
  id uuid default gen_random_uuid() primary key,
  numero text unique,
  poliza_id uuid references polizas(id),
  tipo text,
  descripcion text,
  fecha_ocurrencia date,
  estado text check (estado in ('En gestión', 'Documentación', 'Pericial', 'Cerrado')),
  created_at timestamp with time zone default now()
);

-- DOCUMENTOS (metadata; el archivo va a Supabase Storage)
create table documentos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  tipo text,
  storage_path text not null,
  tamanio_bytes bigint,
  poliza_id uuid references polizas(id),
  siniestro_id uuid references siniestros(id),
  cliente_id uuid references clientes(id),
  subido_por uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- RLS: solo usuarios autenticados acceden
alter table clientes enable row level security;
alter table polizas enable row level security;
alter table pagos enable row level security;
alter table siniestros enable row level security;
alter table documentos enable row level security;

create policy "Acceso autenticado" on clientes for all using (auth.role() = 'authenticated');
create policy "Acceso autenticado" on polizas for all using (auth.role() = 'authenticated');
create policy "Acceso autenticado" on pagos for all using (auth.role() = 'authenticated');
create policy "Acceso autenticado" on siniestros for all using (auth.role() = 'authenticated');
create policy "Acceso autenticado" on documentos for all using (auth.role() = 'authenticated');

-- Storage bucket para documentos
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false);

create policy "Usuarios autenticados pueden subir" on storage.objects
  for insert with check (bucket_id = 'documentos' and auth.role() = 'authenticated');

create policy "Usuarios autenticados pueden descargar" on storage.objects
  for select using (bucket_id = 'documentos' and auth.role() = 'authenticated');
