-- ================================================
-- FASCIOLI — Módulo Contratos v9
-- Fecha de envío del telegrama de no renovación automática.
--
-- Cuando se marca el checkbox de telegrama, ahora se pide la fecha real en que se envió.
-- Este campo la guarda. Se limpia (null) al desmarcar el telegrama.
--
-- Ejecutar completo en SQL Editor de Supabase.
-- ================================================

alter table contratos add column if not exists telegrama_fecha date;
