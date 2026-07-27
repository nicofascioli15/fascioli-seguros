-- ================================================
-- FASCIOLI — Módulo Contratos v3
-- Los contratos auto-renovables (ascensor/rampa/servicio) YA NO se renuevan solos:
-- si se vencen, quedan marcados "Vencido" de forma persistente hasta que alguien
-- los renueve a mano con el botón Renovar (igual que "Renovar póliza" en Seguros).
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

alter table contratos add column if not exists renovado boolean not null default false;
