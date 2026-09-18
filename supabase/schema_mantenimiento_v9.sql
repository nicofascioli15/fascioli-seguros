-- ================================================
-- FASCIOLI — Módulo Mantenimiento v9
-- Comentarios / novedades por registro (extintores, tanques y bomberos)
-- Mismo patrón que mant_reclamos, pero para ir dejando notas de
-- seguimiento en general (no solo problemas/reclamos).
-- Ejecutar completo en SQL Editor de Supabase
-- ================================================

create table if not exists mant_comentarios (
  id          uuid default gen_random_uuid() primary key,
  extintor_id uuid references mant_extintores(id) on delete cascade,
  tanque_id   uuid references mant_tanques(id) on delete cascade,
  bombero_id  uuid references mant_bomberos(id) on delete cascade,
  fecha       date not null default current_date,
  texto       text not null,
  created_at  timestamp with time zone default now()
);

create index if not exists idx_mant_comentarios_extintor on mant_comentarios(extintor_id);
create index if not exists idx_mant_comentarios_tanque    on mant_comentarios(tanque_id);
create index if not exists idx_mant_comentarios_bombero   on mant_comentarios(bombero_id);

alter table mant_comentarios enable row level security;
create policy "auth_all" on mant_comentarios for all using (auth.role() = 'authenticated');
