-- ================================================
-- FASCIOLI — Módulo Obras v2
-- Garantía en años o meses (se guarda igual en meses; esta columna es para mostrarla
-- como se cargó). Se cuenta desde la firma del contrato.
-- ================================================
alter table obras add column if not exists garantia_unidad text default 'anios';
alter table obras drop constraint if exists obras_garantia_unidad_check;
alter table obras add constraint obras_garantia_unidad_check check (garantia_unidad in ('meses','anios'));
