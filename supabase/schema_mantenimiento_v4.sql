-- ================================================
-- FASCIOLI — Módulo Mantenimiento v4
-- Cantidad de extintores recargados por tipo,
-- ensayo hidrostático (vence cada 4 años) y extras (mangueras)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

alter table mant_extintores add column if not exists cant_co2    integer default 0;
alter table mant_extintores add column if not exists cant_8kg    integer default 0;
alter table mant_extintores add column if not exists cant_4kg    integer default 0;
alter table mant_extintores add column if not exists cant_espuma integer default 0;

-- Cuántos de los extintores recargados en esta gestión requirieron ensayo hidrostático
alter table mant_extintores add column if not exists cant_ensayo_hidrostatico integer default 0;

-- Próximo vencimiento del ensayo hidrostático (ciclo de 4 años, independiente del de recarga)
alter table mant_extintores add column if not exists vencimiento_ensayo date;

-- Extras seleccionables (ej. "Mangueras revisadas"), guardado como array de texto
alter table mant_extintores add column if not exists extras text[] default '{}';
