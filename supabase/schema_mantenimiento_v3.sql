-- ================================================
-- FASCIOLI — Módulo Mantenimiento v3
-- Histórico de reclamos por extintor / tanque
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

create table if not exists mant_reclamos (
  id            uuid default gen_random_uuid() primary key,
  extintor_id   uuid references mant_extintores(id) on delete cascade,
  tanque_id     uuid references mant_tanques(id) on delete cascade,
  fecha         date default current_date,
  texto         text not null,
  created_at    timestamp with time zone default now()
);

create index if not exists idx_mant_reclamos_extintor on mant_reclamos(extintor_id);
create index if not exists idx_mant_reclamos_tanque    on mant_reclamos(tanque_id);

alter table mant_reclamos enable row level security;
create policy "auth_all" on mant_reclamos for all using (auth.role() = 'authenticated');
