-- ================================================
-- FASCIOLI — Módulo Contratos (ascensores, rampas, servicios, obras)
-- Reutiliza mant_clientes (edificios) — misma cartera que Mantenimiento
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

-- CONTRATOS
-- categoria: 'ascensor' | 'rampa' | 'servicio' | 'obra' (texto libre, sin CHECK, para poder sumar categorías a futuro)
-- Modelo auto-renovable (ascensor / rampa / servicio): fecha_firma_inicio + vigencia_anios
--   -> renovaciones, próximo vencimiento y estado se calculan en vivo, sin guardar estado.
-- Modelo de obra: fecha_firma_inicio (inicio de obra) + fecha_fin (fin fijo) + garantia_meses
--   -> NO se renueva solo; entra en garantía al llegar a fecha_fin.
-- Sin número de contrato: muchos contratos reales no lo tienen.
create table if not exists contratos (
  id                  uuid default gen_random_uuid() primary key,
  cliente_id          uuid references mant_clientes(id) on delete cascade,
  categoria           text not null default 'ascensor',
  tipo_contrato       text,
  empresa             text,
  fecha_firma_inicio  date,
  vigencia_anios      integer,
  fecha_fin           date,
  garantia_meses      integer,
  nota                text,
  created_at          timestamp with time zone default now()
);

create index if not exists idx_contratos_cliente   on contratos(cliente_id);
create index if not exists idx_contratos_categoria on contratos(categoria);

-- CATÁLOGO DE EMPRESAS (proveedores), separado por categoría — igual patrón que mant_empresas
create table if not exists contratos_empresas (
  id          uuid default gen_random_uuid() primary key,
  nombre      text not null,
  categoria   text not null default 'ascensor',
  created_at  timestamp with time zone default now(),
  unique(nombre, categoria)
);

-- DOCUMENTOS ADJUNTOS (contratos, garantías, etc.)
create table if not exists contratos_documentos (
  id            uuid default gen_random_uuid() primary key,
  contrato_id   uuid references contratos(id) on delete cascade,
  nombre        text not null,
  tipo          text,
  storage_path  text not null,
  tamanio_bytes bigint,
  created_at    timestamp with time zone default now()
);

create index if not exists idx_contratos_documentos_contrato on contratos_documentos(contrato_id);

-- ── RLS — solo usuarios autenticados ─────────────────────────────────────────
alter table contratos             enable row level security;
alter table contratos_empresas    enable row level security;
alter table contratos_documentos  enable row level security;

create policy "auth_all" on contratos            for all using (auth.role() = 'authenticated');
create policy "auth_all" on contratos_empresas    for all using (auth.role() = 'authenticated');
create policy "auth_all" on contratos_documentos  for all using (auth.role() = 'authenticated');

-- Reutiliza el bucket "documentos" que ya existe (mismas policies de Seguros/Mantenimiento).
-- Los archivos de Contratos se guardan bajo el prefijo contratos/...
