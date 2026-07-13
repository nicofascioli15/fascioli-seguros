-- ================================================
-- FASCIOLI — Módulo Mantenimiento v2
-- Historial de gestiones + documentos adjuntos
-- Ejecutar completo en SQL Editor de Supabase
-- (seguro correrlo aunque ya hayas corrido schema_mantenimiento.sql antes)
-- ================================================

-- Fecha en que se realizó el servicio (recarga / limpieza), distinta de "vencimiento" (próxima fecha)
alter table mant_extintores add column if not exists fecha_servicio date;
alter table mant_tanques    add column if not exists fecha_servicio date;

-- DOCUMENTOS ADJUNTOS (certificados de recarga, análisis de potabilidad, fotos, etc.)
create table if not exists mant_documentos (
  id            uuid default gen_random_uuid() primary key,
  extintor_id   uuid references mant_extintores(id) on delete cascade,
  tanque_id     uuid references mant_tanques(id) on delete cascade,
  nombre        text not null,
  tipo          text,
  storage_path  text not null,
  tamanio_bytes bigint,
  created_at    timestamp with time zone default now()
);

create index if not exists idx_mant_documentos_extintor on mant_documentos(extintor_id);
create index if not exists idx_mant_documentos_tanque    on mant_documentos(tanque_id);

alter table mant_documentos enable row level security;
create policy "auth_all" on mant_documentos for all using (auth.role() = 'authenticated');

-- Reutiliza el bucket "documentos" que ya existe (mismas policies de Seguros).
-- Los archivos de Mantenimiento se guardan bajo el prefijo mantenimiento/...
