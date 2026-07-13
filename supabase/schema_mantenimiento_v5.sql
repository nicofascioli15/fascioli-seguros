-- ================================================
-- FASCIOLI — Módulo Mantenimiento v5
-- "Extras" de la recarga de extintores pasan de checkbox
-- a cantidad por ítem (mangueras, válvulas, carteles, colocación)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

-- La columna extras pasa de array de texto a jsonb (objeto { clave: cantidad }).
-- Nota: esto resetea a {} cualquier dato ya cargado con el formato anterior (checkbox).
alter table mant_extintores
  alter column extras drop default,
  alter column extras type jsonb using '{}'::jsonb,
  alter column extras set default '{}'::jsonb;
