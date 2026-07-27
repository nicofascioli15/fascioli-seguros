-- ================================================
-- FASCIOLI — Módulo Contratos v2
-- Categorías dinámicas (antes fijas en código) + unidad de garantía (meses/años)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

-- CATEGORÍAS DE CONTRATO — ahora se administran desde Configuración, sin tocar código.
-- tipo 'auto'     -> se renueva sola (fecha de firma + vigencia en años), ej: Ascensores, Rampas
-- tipo 'garantia' -> fecha de inicio + fecha de fin fija + período de garantía, ej: Obras
create table if not exists contratos_categorias (
  id          uuid default gen_random_uuid() primary key,
  slug        text not null unique,
  label       text not null,
  tipo        text not null default 'auto' check (tipo in ('auto', 'garantia')),
  orden       integer not null default 0,
  created_at  timestamp with time zone default now()
);

alter table contratos_categorias enable row level security;
create policy "auth_all" on contratos_categorias for all using (auth.role() = 'authenticated');

-- Semilla con las categorías que ya existían fijas en el código
insert into contratos_categorias (slug, label, tipo, orden) values
  ('ascensor', 'Ascensores', 'auto', 1),
  ('rampa', 'Rampas', 'auto', 2),
  ('servicio', 'Otros servicios', 'auto', 3),
  ('obra', 'Obras', 'garantia', 4)
on conflict (slug) do nothing;

-- Unidad en la que se cargó la garantía (para mostrarla como se ingresó: 6 meses o 2 años).
-- El cálculo interno sigue siendo en meses (garantia_meses); esta columna es solo para la UI.
alter table contratos add column if not exists garantia_unidad text not null default 'meses' check (garantia_unidad in ('meses', 'anios'));
