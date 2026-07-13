-- ================================================
-- FASCIOLI — Módulo Mantenimiento v6
-- Catálogo propio de Mantenimiento: empresas
-- (independiente del catálogo de Seguros — no se comparte)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

create table if not exists mant_empresas (
  id          uuid default gen_random_uuid() primary key,
  nombre      text not null unique,
  created_at  timestamp with time zone default now()
);

alter table mant_empresas enable row level security;

create policy "auth_all" on mant_empresas for all using (auth.role() = 'authenticated');
