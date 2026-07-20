-- ================================================
-- Control mensual para pólizas de renovación automática
-- (ej. Accidentes de trabajo — BSE, cruzado con BPS)
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

-- Marca una póliza como "de renovación automática mensual":
-- no se le pide cantidad de cuotas fijas, en cambio se controla mes a mes
-- si llegó la factura (Controlado) y si ya se pagó (Pagado).
alter table polizas add column if not exists renovacion_mensual boolean not null default false;

create table if not exists poliza_controles_mensuales (
  id            uuid default gen_random_uuid() primary key,
  poliza_id     uuid references polizas(id) on delete cascade,
  periodo       date not null, -- primer día del mes que representa el ciclo (ej: 2026-07-01)
  estado        text not null default 'pendiente' check (estado in ('pendiente','controlado','pagado')),
  fecha_control date,
  fecha_pago    date,
  nota          text,
  created_at    timestamp with time zone default now(),
  unique(poliza_id, periodo)
);

alter table poliza_controles_mensuales enable row level security;
create policy "auth_all" on poliza_controles_mensuales for all using (auth.role() = 'authenticated');
