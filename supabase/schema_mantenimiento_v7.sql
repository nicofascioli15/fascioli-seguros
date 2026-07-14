-- ================================================
-- FASCIOLI — Módulo Mantenimiento v7
-- Diferenciar el catálogo de Empresas entre Extintores y Tanques de agua
-- (las que ya existen quedan asignadas a "mant_extintores" por default;
--  agregá las de Tanques de agua desde Configuración)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

alter table mant_empresas
  add column if not exists tabla text not null default 'mant_extintores'
  check (tabla in ('mant_extintores', 'mant_tanques'));

alter table mant_empresas drop constraint if exists mant_empresas_nombre_key;
alter table mant_empresas add constraint mant_empresas_nombre_tabla_key unique (nombre, tabla);
