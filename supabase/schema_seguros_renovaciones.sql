-- ================================================
-- FASCIOLI — Seguros: renovación de pólizas
-- Permite marcar una nueva póliza como "renovación" de una existente.
-- La póliza anterior queda marcada como renovada=true y deja de contar
-- como vencida/próxima a vencer en Vencimientos y en el Dashboard.
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

alter table polizas add column if not exists renovada boolean not null default false;
alter table polizas add column if not exists renueva_poliza_id uuid references polizas(id) on delete set null;
