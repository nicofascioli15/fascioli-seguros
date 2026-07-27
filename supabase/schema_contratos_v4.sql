-- ================================================
-- FASCIOLI — Módulo Contratos v4
-- "Tipo de contrato" pasa a ser un catálogo seleccionable por categoría,
-- igual que Empresa — se administra desde Configuración, no más texto libre.
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

create table if not exists contratos_tipos (
  id          uuid default gen_random_uuid() primary key,
  nombre      text not null,
  categoria   text not null,
  created_at  timestamp with time zone default now(),
  unique(nombre, categoria)
);

alter table contratos_tipos enable row level security;
create policy "auth_all" on contratos_tipos for all using (auth.role() = 'authenticated');

-- Semilla con los tipos más comunes de Ascensores (se pueden agregar más desde Configuración)
insert into contratos_tipos (nombre, categoria) values
  ('Básico', 'ascensor'),
  ('Integral', 'ascensor'),
  ('Mantenimiento', 'ascensor'),
  ('Premium', 'ascensor')
on conflict (nombre, categoria) do nothing;
