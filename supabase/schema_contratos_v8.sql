-- ================================================
-- FASCIOLI — Módulo Contratos v8
-- Telegrama de no renovación automática.
--
-- Los contratos de Ascensores/Rampas/Servicios se renuevan solos si nadie hace nada. Pero a
-- veces Fascioli manda un telegrama para CORTAR esa renovación automática (por ejemplo si el
-- costo del servicio no es bueno). Este campo marca esos casos: si está en true, el contrato
-- deja de renovarse solo — si llega a la fecha de vencimiento, queda "Vencido" de forma
-- persistente (como cualquier contrato manual) hasta que se cargue una renovación a mano.
-- El aviso de "vence en X días" se sigue mostrando siempre, se haya mandado el telegrama o no.
--
-- Ejecutar completo en SQL Editor de Supabase.
-- ================================================

alter table contratos add column if not exists telegrama_no_renovacion boolean not null default false;
