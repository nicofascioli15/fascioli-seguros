-- ================================================
-- FASCIOLI — Módulo Mantenimiento v8
-- Habilitación de Bomberos por edificio (Decreto 372/023 y anteriores)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

-- Un registro por gestión/trámite de habilitación (igual patrón que extintores y tanques:
-- queda el historial completo, el más reciente por edificio es el "vigente").
create table if not exists mant_bomberos (
  id                  uuid default gen_random_uuid() primary key,
  cliente_id          uuid references mant_clientes(id) on delete cascade,

  -- Trámite / normativa
  tipo_tramite        text,   -- 'PTC' | 'PT' | 'PG' | 'POT' | 'POTEP' | 'PTT' | 'PP'
  decreto             text,   -- '372/023' | '260/013' | '150/016' | '184/018' | 'Otro / sin datos'
  estado              text default 'Sin gestión',

  -- Fechas generales
  fecha_certificacion date,   -- fecha en que se otorgó/renovó la habilitación
  vencimiento         date,  -- vencimiento de la habilitación (máx. 4 años desde la certificación)

  -- Responsables
  tecnico_registrado  text,  -- técnico registrado ante la DNB que firma el proyecto
  empresa             text,  -- empresa que gestiona/instala (Grolero, PM, Gamberoni, etc.)
  costo               numeric,

  -- Plan Gradual (Art. 19 Decreto 372/023) — solo aplica si tipo_tramite = 'PG'
  etapa_actual        text,  -- 'C1' | 'C2' | 'C3' | 'Completado'
  fecha_c1            date,
  fecha_c2            date,
  fecha_c3            date,

  comentarios         text,
  created_at          timestamp with time zone default now()
);

create index if not exists idx_mant_bomberos_cliente on mant_bomberos(cliente_id);

alter table mant_bomberos enable row level security;
create policy "auth_all" on mant_bomberos for all using (auth.role() = 'authenticated');

-- Documentos y reclamos: se suma la columna bombero_id (nullable), mismo patrón
-- que extintor_id / tanque_id — cada registro usa solo la columna que corresponde.
alter table mant_documentos add column if not exists bombero_id uuid references mant_bomberos(id) on delete cascade;
alter table mant_reclamos   add column if not exists bombero_id uuid references mant_bomberos(id) on delete cascade;

create index if not exists idx_mant_documentos_bombero on mant_documentos(bombero_id);
create index if not exists idx_mant_reclamos_bombero    on mant_reclamos(bombero_id);

-- Catálogo de empresas: se agrega "mant_bomberos" como tabla válida y se cargan
-- las empresas que Nico ya mencionó (Grolero, PM, Gamberoni).
alter table mant_empresas drop constraint if exists mant_empresas_tabla_check;
alter table mant_empresas add constraint mant_empresas_tabla_check
  check (tabla in ('mant_extintores', 'mant_tanques', 'mant_bomberos'));

insert into mant_empresas (nombre, tabla) values
  ('Grolero', 'mant_bomberos'),
  ('PM', 'mant_bomberos'),
  ('Gamberoni', 'mant_bomberos')
on conflict (nombre, tabla) do nothing;
